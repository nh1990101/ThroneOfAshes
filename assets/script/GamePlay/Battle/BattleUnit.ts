import { _decorator, Component, Node, ProgressBar, Vec2, Vec3 } from 'cc';
import { UnitBase } from './UnitBase';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { HexagonData, HexagonPos } from './HexagonData';
import { UNIT_ACTION } from '../../Common/GameEnum';
import { BattleMapMgr } from './BattleMapMgr';
const { ccclass, property } = _decorator;
/**
 * 战斗场景单位基础类
 */
@ccclass('BattleUnit')
export class BattleUnit extends UnitBase {
    @property(ProgressBar)
    HpBar: ProgressBar;
    @property(BaseLabel)
    lb_Hp: BaseLabel;

    /**移速每秒多少像素 */
    private _moveSpeed: number = 100;
    /**
     * 服务器数据
     */
    protected m_data: any;

    /**当前移动路径（世界坐标） */
    private _movePathWorldPos: Vec3[] = [];
    /**当前移动路径（HexagonData，用于更新_pos） */
    private _movePathData: HexagonData[] = [];
    /**当前移动到第几个路径点 */
    private _currentPathIndex: number = 0;
    /**是否正在移动 */
    private _isMoving: boolean = false;
    /**到达目标点的阈值（像素） */
    private _arriveThreshold: number = 2;
    /**地图格子坐标 */
    private _pos: HexagonPos;

    initEvent(): void {
        super.initEvent();

    }
    public SetHp(curHp: number, maxHp?: number) {
        this.HpBar.progress = curHp / maxHp;
        this.lb_Hp.string = `${curHp}/${maxHp}`;
    }
    /**
       * 设置世界坐标位置
       */
    public SetWorldPos(pos: Vec3) {
        this.node.setWorldPosition(pos);
    }
    /**
     * 设置到地图的格子位置
     */
    public SetMapGridPos(pos: HexagonPos) {
        this._pos = pos;
        var cell = BattleMapMgr.getInstance().getHexCell(pos.q, pos.r);
        if (cell) {
            this.SetWorldPos(cell.GetWorldPos());
        }
    }
    public SetPos(q: number, r: number) {
        this._pos.q = q;
        this._pos.r = r;
    }
    public GetMapPos() {
        return this._pos;
    }
    /**
     * 移动到某个六边形格子上（瞬移）
     */
    public MoveToTargetGrid(hexagonData: HexagonData) {
        const cell = BattleMapMgr.getInstance().getHexCell(hexagonData.q, hexagonData.r);
        if (cell) {
            this.SetWorldPos(cell.GetWorldPos());
        }
    }
    /**
     * 按照寻路路径移动
     * @param pathArr 移动轨迹路径（HexagonData数组）
     */
    public StartMove(pathArr: HexagonData[]) {
        if (!pathArr || pathArr.length === 0) {
            console.warn('StartMove: pathArr is empty');
            return;
        }

        // 保存路径数据用于更新_pos
        this._movePathData = pathArr;

        // 将路径转换为世界坐标
        this._movePathWorldPos = [];
        const battleMapMgr = BattleMapMgr.getInstance();

        for (const hexData of pathArr) {
            const worldPos = battleMapMgr.getHexWorldPos(hexData);
            if (worldPos) {
                this._movePathWorldPos.push(worldPos.clone());
            } else {
                console.warn(`StartMove: 无法获取格子(${hexData.q},${hexData.r})的世界坐标`);
            }
        }

        if (this._movePathWorldPos.length === 0) {
            console.warn('StartMove: 没有有效的路径点');
            return;
        }

        this._currentPathIndex = 0;
        this._isMoving = true;
        this.PlayAction(UNIT_ACTION.MOVE, true);
    }

    /**
     * 停止移动
     */
    public StopMove() {
        this._isMoving = false;
        this._movePathWorldPos = [];
        this._movePathData = [];
        this._currentPathIndex = 0;
    }

    /**
     * 检查是否正在移动
     */
    public IsMoving(): boolean {
        return this._isMoving;
    }

    /**
     * lateUpdate更新移动逻辑
     * @param dt 帧间隔时间（秒）
     */
    protected lateUpdate(dt: number): void {
        if (!this._isMoving || this._movePathWorldPos.length === 0) {
            return;
        }

        // 获取当前目标点
        if (this._currentPathIndex >= this._movePathWorldPos.length) {
            // 所有路径点都走完了
            this.StopMove();
            this.onMoveComplete();
            return;
        }

        const targetPos = this._movePathWorldPos[this._currentPathIndex];
        const currentPos = this.node.getWorldPosition();

        // 计算到目标点的距离
        const direction = new Vec3();
        Vec3.subtract(direction, targetPos, currentPos);
        const distance = direction.length();

        // 如果距离小于阈值，认为已到达当前目标点
        if (distance <= this._arriveThreshold) {
            // 更新当前格子位置
            if (this._currentPathIndex < this._movePathData.length) {
                const hexData = this._movePathData[this._currentPathIndex];
                this.SetPos(hexData.q, hexData.r)
            }

            // 移动到下一个路径点
            this._currentPathIndex++;

            // 如果还有下一个点，继续移动
            if (this._currentPathIndex < this._movePathWorldPos.length) {
                return;
            } else {
                // 所有点都走完了
                this.node.setWorldPosition(targetPos); // 确保精确到达最后一个点
                this.StopMove();
                this.onMoveComplete();
                return;
            }
        }

        // 计算本帧移动的距离
        const moveDistance = this._moveSpeed * dt;

        // 如果本帧移动距离大于剩余距离，直接移动到目标点
        if (moveDistance >= distance) {
            this.node.setWorldPosition(targetPos);

            // 更新当前格子位置
            if (this._currentPathIndex < this._movePathData.length) {
                const hexData = this._movePathData[this._currentPathIndex];
                this.SetPos(hexData.q, hexData.r);
            }

            this._currentPathIndex++;
        } else {
            // 标准化方向向量
            direction.normalize();
            // 计算新位置
            const newPos = new Vec3();
            Vec3.scaleAndAdd(newPos, currentPos, direction, moveDistance);
            this.node.setWorldPosition(newPos);
        }
    }

    /**
     * 移动完成回调（可由子类重写）
     */
    protected onMoveComplete(): void {
        // 子类可以重写此方法来处理移动完成事件
        console.log('BattleUnit move complete');
        this.PlayAction(UNIT_ACTION.IDLE, true);
    }
}


