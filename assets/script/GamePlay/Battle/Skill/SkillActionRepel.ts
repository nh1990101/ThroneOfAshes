import { _decorator, Vec3 } from 'cc';
import { SkillActionNode } from './SkillActionNode';
import { ISKILL_MOVE_TRACK } from '../SkillMgr';
import { BattleMgr } from '../BattleMgr';
import { BattleMapMgr } from '../BattleMapMgr';
import { BattleUnit } from '../BattleUnit';
import { HexagonData } from '../HexagonData';
import { PoolMgr } from '../../../Common/Pool';
import { EventManager } from '../../../Common/EventManager';
import { GameEvent, SKILL_MOVE_TYPE } from '../../../Common/GameEnum';
const { ccclass } = _decorator;

@ccclass('SkillActionRepel')
export class SkillActionRepel extends SkillActionNode<ISKILL_MOVE_TRACK> {
    public static readonly DEFAULT_BOUNCE_DISTANCE = 20;
    public static readonly DEFAULT_BOUNCE_DURATION_MS = 200;

    /** HexagonData 的方向表按 r 向下命名；技能方向按实际画面 r 向上换算。 */
    private static readonly directions = [0, 5, 4, 3, 2, 1];
    private static readonly directionVectors = [[1, 0], [.5, .75], [-.5, .75], [-1, 0], [-.5, -.75], [.5, -.75]];

    private m_unit: BattleUnit = null;
    private m_targetCell: HexagonData = null;
    private m_direction = new Vec3();
    private m_originPos: Vec3 = null;
    private m_fromPos: Vec3 = null;
    private m_toPos: Vec3 = null;
    private m_position = new Vec3();
    private m_startTick = 0;
    private m_duration = 0;
    private m_bouncing = false;

    startAction(): void {
        super.startAction();
        const data = this.getData();
        const targetUnit = BattleMgr.getInstance().GetUnitByUID(data.targetUID);
        const { moveType = SKILL_MOVE_TYPE.FIXED_DIRECTION, steps, targetCell, durationMs, bounceDurationMs } = data.params;
        if (!targetUnit || targetUnit.CheckIsDead() || !Number.isInteger(moveType) ||
            moveType < SKILL_MOVE_TYPE.REVERSE_FACING || moveType > SKILL_MOVE_TYPE.GLOBAL) {
            this.endState();
            return;
        }
        const origin = BattleMapMgr.getInstance().getHexDataFromPos(targetUnit.GetMapPos());
        if (!origin) {
            this.endState();
            return;
        }
        this.m_unit = targetUnit;
        this.m_originPos = targetUnit.node.position.clone();
        // 开始时一次性检查整条路径，确定本次播放击退还是原格回弹。
        if (moveType === SKILL_MOVE_TYPE.GLOBAL) {
            if (!targetCell || !Number.isInteger(targetCell.q) || !Number.isInteger(targetCell.r)) {
                this.endState();
                return;
            }
            const { q, r } = targetCell;
            this.m_direction.set(
                HexagonData.widthPx * (q + (r & 1) / 2) - this.m_originPos.x,
                HexagonData.heightPx * .75 * r - this.m_originPos.y,
                0
            );
            this.m_targetCell = this.getGlobalTarget(origin, q, r);
        } else {
            const direction = this.getDirection(moveType);
            if (!Number.isInteger(steps) || steps <= 0 || !Number.isInteger(direction) || direction < 0 || direction > 5) {
                this.endState();
                return;
            }
            const [x, y] = SkillActionRepel.directionVectors[direction];
            this.m_direction.set(x * HexagonData.widthPx, y * HexagonData.heightPx, 0);
            this.m_targetCell = this.getDirectionalTarget(origin, direction, steps);
        }
        targetUnit.StopMove();
        const blocked = !this.m_targetCell;
        this.beginMove(
            blocked ? this.getBouncePos(origin) : this.m_targetCell.toPixel3D(),
            blocked ? bounceDurationMs ?? SkillActionRepel.DEFAULT_BOUNCE_DURATION_MS : durationMs,
            blocked
        );
    }

    private getDirection(moveType: SKILL_MOVE_TYPE): number {
        if (moveType === SKILL_MOVE_TYPE.REVERSE_FACING) {
            return this.m_unit.animation.GetFlipX() ? 0 : 3;
        }
        if (moveType === SKILL_MOVE_TYPE.FIXED_DIRECTION) {
            return this.m_data.params.direction;
        }
        const caster = BattleMgr.getInstance().GetUnitByUID(this.m_data.uId);
        if (!caster) return -1;
        const dx = this.m_originPos.x - caster.node.position.x;
        const dy = this.m_originPos.y - caster.node.position.y;
        if (dx === 0 && dy === 0) return -1;
        let direction = -1;
        let bestDot = -Infinity;
        SkillActionRepel.directionVectors.forEach(([x, y], index) => {
            const vx = x * HexagonData.widthPx;
            const vy = y * HexagonData.heightPx;
            const dot = (dx * vx + dy * vy) / Math.hypot(vx, vy);
            if (dot > bestDot) {
                bestDot = dot;
                direction = index;
            }
        });
        return direction;
    }

    /** 任意一格受阻，整次击退失败，不能跳过障碍格。 */
    private getDirectionalTarget(origin: HexagonData, direction: number, steps: number): HexagonData {
        const mapMgr = BattleMapMgr.getInstance();
        let current = origin;
        for (let i = 0; i < steps; i++) {
            const neighbor = current.getNeighborAt(SkillActionRepel.directions[direction]);
            const next = mapMgr.getHexData(neighbor.q, neighbor.r);
            PoolMgr.put(neighbor);
            if (!this.canEnter(next)) {
                return null;
            }
            current = next;
        }
        return current;
    }

    /** 全局移动沿起终点的直线检查格子，不寻路绕过障碍。 */
    private getGlobalTarget(origin: HexagonData, q: number, r: number): HexagonData {
        const mapMgr = BattleMapMgr.getInstance();
        const target = mapMgr.getHexData(q, r);
        if (!target) return null;
        const line = HexagonData.getLine(origin, target);
        let reachable = true;
        for (let i = 1; i < line.length; i++) {
            if (!this.canEnter(mapMgr.getHexData(line[i].q, line[i].r))) {
                reachable = false;
                break;
            }
        }
        line.forEach(cell => PoolMgr.put(cell));
        return reachable ? target : null;
    }

    private canEnter(cell: HexagonData): boolean {
        return !!cell && cell.walkable && (!cell.occupiedUnitId || cell.occupiedUnitId === this.m_data.targetUID);
    }

    private isUnitValid(): boolean {
        return !!this.m_unit?.node.isValid && this.m_unit.node.activeInHierarchy &&
            this.m_unit.GetData()?.uId === this.m_data?.targetUID;
    }

    private beginMove(to: Vec3, duration: number, bouncing = false): void {
        this.m_fromPos = this.m_unit.node.position.clone();
        this.m_toPos = to;
        this.m_startTick = this.m_tick;
        this.m_duration = Math.max(0, duration);
        this.m_bouncing = bouncing;
    }

    private getBouncePos(origin: HexagonData): Vec3 {
        const params = this.m_data.params;
        const w = HexagonData.widthPx;
        const h = HexagonData.heightPx;
        const { x, y } = this.m_direction;
        const length = Math.sqrt(x * x + y * y);
        if (length === 0) return this.m_originPos.clone();
        const dx = x / length;
        const dy = y / length;
        const center = origin.toPixel3D();
        const ox = this.m_originPos.x - center.x;
        const oy = this.m_originPos.y - center.y;
        let distance = Math.max(0, params.bounceDistance ?? SkillActionRepel.DEFAULT_BOUNCE_DISTANCE);
        // 射线与尖顶六边形的六条边求交，连斜向回弹也不会越出当前格。
        const edges = [[1, 0, w / 2], [-1, 0, w / 2], [1 / w, 2 / h, 1], [-1 / w, 2 / h, 1], [1 / w, -2 / h, 1], [-1 / w, -2 / h, 1]];
        for (const [nx, ny, limit] of edges) {
            const speed = nx * dx + ny * dy;
            if (speed > 0) {
                distance = Math.min(distance, Math.max(0, (limit - nx * ox - ny * oy) / speed - .01));
            }
        }
        return new Vec3(this.m_originPos.x + dx * distance, this.m_originPos.y + dy * distance, this.m_originPos.z);
    }

    updateAction(): void {
        if (!this.isUnitValid() || this.m_unit.CheckIsDead()) {
            this.endState();
            return;
        }
        const progress = this.m_duration > 0 ? Math.min(1, (this.m_tick - this.m_startTick) / this.m_duration) : 1;
        let t = progress;
        if (this.m_bouncing) {
            t = progress < .4 ? 1 - Math.pow(1 - progress / .4, 2) : 1 - Math.pow((progress - .4) / .6, 2);
        }
        Vec3.lerp(this.m_position, this.m_fromPos, this.m_toPos, t);
        this.setPosition(this.m_position);
        if (progress >= 1) {
            if (this.m_targetCell) {
                // 完成时才提交逻辑位置及占格；回弹全程保留原占格。
                this.m_unit.SetMapGridPos(this.m_targetCell);
            }
            this.endState(false);
        }
    }

    private setPosition(pos: Vec3): void {
        this.m_unit.node.setPosition(pos);
        EventManager.Instance.dispatch(GameEvent.BATTLE_UNIT_SORT_CHANGED);
    }

    endState(restorePosition = true): void {
        // 中断或清理时恢复视觉位置，不改死亡/已回收单位的占格。
        if (restorePosition && this.m_originPos && this.isUnitValid()) {
            this.setPosition(this.m_originPos);
        }
        this.m_unit = null;
        this.m_targetCell = null;
        super.endState();
    }

    public clear(): void {
        this.endState();
        super.clear();
        this.m_originPos = null;
        this.m_fromPos = null;
        this.m_toPos = null;
        this.m_startTick = 0;
        this.m_duration = 0;
        this.m_bouncing = false;
    }
}


