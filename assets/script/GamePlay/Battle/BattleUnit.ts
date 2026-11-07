import { _decorator, Color, Component, isValid, Node, ProgressBar, tween, Tween, v3, Vec2, Vec3 } from 'cc';
import { UnitBase } from './UnitBase';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { HexagonData, HexagonPos } from './HexagonData';
import { GameEvent, MOVE_TYPE, UNIT_ACTION } from '../../Common/GameEnum';
import { BattleMapMgr } from './BattleMapMgr';
import { BattleUnitData } from './BattleUnitData';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { AssetMgr } from '../../Common/AssetMgr';
import { child, comp } from '../../Common/Decorator';
import { PoolMgr } from '../../Common/Pool';
import { EventManager } from '../../Common/EventManager';
import { BattleMgr } from './BattleMgr';
const { ccclass, property } = _decorator;
/**
 * 战斗场景单位基础类
 */
@ccclass('BattleUnit')
export class BattleUnit extends UnitBase {
    @comp(ProgressBar)
    HpBar: ProgressBar = null!;

    @comp(BaseLabel)
    lb_Hp: BaseLabel = null!;

    @child()
    hpNode: Node = null!;

    /**移速每秒多少像素 */
    private _moveSpeed: number = 200;
    /**
     * 服务器数据
     */
    protected m_data: BattleUnitData;

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
    /**移动过程的临时变量位置 */
    private _moveNewPos: Vec3;
    /**计算方向临时变量 */
    private _dirTemp: Vec3;
    /**只抬升表现节点，不影响根节点寻路坐标和阴影 */
    private _flyTween: Tween<Node> = null;
    /**动画节点初始局部位置，复用时不能把空中位置当成原点 */
    private _animationOriginPos: Vec3 = null;
    /**起飞高度（像素）及1倍速起降最长时长（秒） */
    private _flyHeight: number = 40;
    private _flyDuration: number = 0.2;
    private _isLanding: boolean = false;
    /**取消或重新移动后，使旧的落地回调失效 */
    private _moveVersion: number = 0;
    /**本次移动是否播放飞行动画 */
    private _isPlayFlyAnimation: boolean = false;

    initEvent(): void {
        super.initEvent();
        if (!this._moveNewPos) {
            this._moveNewPos = v3();
        }
        if (!this._dirTemp) {
            this._dirTemp = v3();
        }
    }
    /**默认血条随单位显示，战斗场景可指定独立的血条容器。 */
    public SetData(data: BattleUnitData, hpLayer: Node = this.node) {
        this.StopMove();
        this.m_data = data;
        this.SetHpLayer(hpLayer);
        this.updateSoldierNum(data.soidierNum);
        this.SetHp(data.hp, 100);
        return this.SetUnitId(data.Id).then(() => {
            //设置朝向 敌人的话相反朝向
            this.SetFlipX(data.IsEnemy());
        });
    }

    public GetData() {
        return this.m_data;
    }
    /**同步正在播放的起飞/落地缓动，切换倍速时不重启动画。 */
    public SetSpeedRate(rate: number) {
        super.SetSpeedRate(rate);
        this._flyTween?.timeScale(this.playSpeedRate);
    }
    updateSoldierNum(num: number) {
        this.m_data.soidierNum = num;
        this.lb_Hp.setText(`${this.m_data.soidierNum}`);
        this.lb_Hp.node.active = this.m_data.soidierNum > 0;
    }
    // /**单位配置 */
    // public getCfg() {
    //     if (this.m_data) {
    //         return ConfigMgr.instance.UnitData.get(this.m_data.Id);
    //     }
    // }
    public SetHp(curHp: number, maxHp?: number) {
        this.HpBar.progress = curHp / maxHp;
    }
    /**血量计算处理 */
    HpHandler(value: number) {
        return new Promise(resolve => {
            this.m_data.HpHandler(value);
            this.SetHp(this.m_data.hp, this.m_data.GetSingleProperty().hp);
            this.updateSoldierNum(this.m_data.soidierNum);
            // 死亡处理
            if (this.CheckIsDead()) {
                // this.animation.CompleteCallFunc();
                this.PlayAction(UNIT_ACTION.DEAD, false, () => {
                    BattleMgr.getInstance().RemoveUnit(this);
                    resolve(null);
                }, this);
            } else {
                resolve(null);
            }
        })
    }
    public PlayAction(actionName: UNIT_ACTION, isLoop: boolean, onComplete?: Function, target?: any): void {
        if (actionName != UNIT_ACTION.DEAD && this.CheckIsDead())
            return;
        super.PlayAction(actionName, isLoop, onComplete, target);
    }
    public CheckIsDead() {
        return !this.m_data || this.m_data.CheckIsDead();
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
        // 存拷贝：SetPos 会原地改 _pos，存引用会改到传进来的格子/阵容坐标
        this._pos = { q: pos.q, r: pos.r };
        // var cell = BattleMapMgr.getInstance().getHexCell(pos.q, pos.r);
        // if (cell) {
        //     this.SetWorldPos(cell.GetWorldPos());
        // }
        this.node.setPosition(BattleMapMgr.getInstance().getHexData(pos.q, pos.r).toPixel3D())
        this.updateHpNodePos();
        this.UpdateBattleMapPos();
    }
    public SetPos(q: number, r: number) {
        this._pos.q = q;
        this._pos.r = r;
    }
    /**更新战斗地图自身占位数据 */
    public UpdateBattleMapPos() {
        BattleMapMgr.getInstance().SetHexUnitId(this._pos.q, this._pos.r, this.m_data.uId);
    }
    public GetMapPos() {
        return this._pos;
    }
    /**
     * 移动到某个六边形格子上（瞬移）
     */
    public MoveToTargetGrid(hexagonData: HexagonData) {
        // const cell = BattleMapMgr.getInstance().getHexCell(hexagonData.q, hexagonData.r);
        // if (cell) {
        //     this.SetWorldPos(cell.GetWorldPos());
        // }
        this.node.setPosition(hexagonData.toPixel3D())

    }
    /**
     * 按照寻路路径移动
     * @param pathArr 移动轨迹路径（HexagonData数组）
     * @param playFlyAnimation 是否播放飞行起降及置顶效果，默认开启。
     */
    public StartMove(pathArr: HexagonData[], playFlyAnimation: boolean = false) {
        if (!pathArr || pathArr.length === 0) {
            console.warn('StartMove: pathArr is empty');
            return;
        }

        this.StopMove();
        // 保存路径数据用于更新_pos
        this._movePathData = pathArr;

        // 将路径转换为世界坐标
        this._movePathWorldPos = [];


        for (const hexData of pathArr) {
            const worldPos = hexData.toPixel3D();//battleMapMgr.getHexWorldPos(hexData);
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
        this._isPlayFlyAnimation = playFlyAnimation;
        if (this.IsFlying()) {
            if (this.node.parent?.isValid) {
                this.node.setSiblingIndex(this.node.parent.children.length - 1);
            }
            const animationNode = this.animation?.node;
            if (animationNode?.isValid && this._animationOriginPos && this._moveSpeed > 0) {
                let moveDistance = 0;
                let previousPos = this.node.position;
                for (const targetPos of this._movePathWorldPos) {
                    // 到达阈值会提前切换路径点，估算时扣除，避免短路径起飞过慢。
                    moveDistance += Math.max(0, Vec3.distance(previousPos, targetPos) - this._arriveThreshold);
                    previousPos = targetPos;
                }
                // 使用1倍速的基础时长，播放倍率统一由Tween.timeScale处理。
                const takeOffDuration = Math.min(this._flyDuration, moveDistance / this._moveSpeed * 0.5);
                if (takeOffDuration > 0) {
                    const flyPos = this._animationOriginPos.clone();
                    flyPos.y += this._flyHeight;
                    this._flyTween = tween(animationNode)
                        .to(takeOffDuration, { position: flyPos }, { easing: 'quadOut' })
                        .timeScale(this.playSpeedRate)
                        .start();
                }
            }
        }
        this.PlayAction(UNIT_ACTION.MOVE, true);
    }

    /**
     * 取消移动并立即复位；清除/回收时不能再启动落地动画或触发完成事件。
     * @param notifySort 是否通知恢复排序，正常落地由移动完成事件统一处理。
     */
    public StopMove(notifySort: boolean = true) {
        const wasFlying = this.IsFlying();
        this._isMoving = false;
        this._isPlayFlyAnimation = false;
        this._movePathWorldPos = [];
        this._movePathData = [];
        this._currentPathIndex = 0;
        this._isLanding = false;
        this._moveVersion++;
        this._flyTween?.stop();
        this._flyTween = null;
        const animationNode = this.animation?.node;
        if (animationNode?.isValid) {
            if (!this._animationOriginPos) {
                this._animationOriginPos = animationNode.position.clone();
            }
            animationNode.setPosition(this._animationOriginPos);
        }
        if (notifySort && wasFlying && this.node.isValid) {
            EventManager.Instance.dispatch(GameEvent.BATTLE_UNIT_SORT_CHANGED);
        }
    }

    /**正常到达后先落地，再通知后续攻击/回合逻辑。 */
    private FinishMove() {
        this._flyTween?.stop();
        this._flyTween = null;
        const animationNode = this.animation?.node;
        if (!this.IsFlying() || !animationNode?.isValid || !this._animationOriginPos ||
            Vec3.distance(animationNode.position, this._animationOriginPos) < 0.01) {
            // 正常结束由移动完成事件恢复排序。
            this.StopMove(false);
            this.onMoveComplete();
            return;
        }

        this._isLanding = true;
        const moveVersion = this._moveVersion;
        this._flyTween = tween(animationNode)
            .to(this._flyDuration, { position: this._animationOriginPos.clone() }, { easing: 'quadIn' })
            .call(() => {
                if (moveVersion !== this._moveVersion || !this.isValid || !animationNode.isValid ||
                    !this.enabledInHierarchy || !this.m_data) {
                    return;
                }
                this.StopMove(false);
                this.onMoveComplete();
            })
            .timeScale(this.playSpeedRate)
            .start();
    }

    /**
     * 检查是否正在移动（包含落地阶段）
     */
    public IsMoving(): boolean {
        return this._isMoving;
    }

    /**飞行状态包含落地动画，落地完成或取消移动后才恢复普通层级。 */
    public IsFlying(): boolean {
        return this._isPlayFlyAnimation && this._isMoving && this.m_data?.unitCfg.move_type == MOVE_TYPE.FLY;
    }

    /**
     * lateUpdate更新移动逻辑
     * @param dt 帧间隔时间（秒）
     */
    protected lateUpdate(dt: number): void {
        this.updateMove(dt);
        // 拖拽和瞬移也可能直接修改根节点，所有移动分支结束后统一跟随。
        this.updateHpNodePos();
    }
    private updateMove(dt: number): void {
        if (!this._isMoving || this._isLanding || this._movePathWorldPos.length === 0) {
            return;
        }

        // 获取当前目标点
        if (this._currentPathIndex >= this._movePathWorldPos.length) {
            // 所有路径点都走完了
            this.FinishMove();
            return;
        }

        const targetPos = this._movePathWorldPos[this._currentPathIndex];
        const currentPos = this.node.position;

        this.CheckDir(targetPos)
        const distance = this._dirTemp.length();
        // 如果距离小于阈值，认为已到达当前目标点
        if (distance <= this._arriveThreshold) {
            // 更新当前格子位置
            if (this._currentPathIndex < this._movePathData.length) {
                const hexData = this._movePathData[this._currentPathIndex];
                this.SetPos(hexData.q, hexData.r);
            }

            // 移动到下一个路径点
            this._currentPathIndex++;

            // 如果还有下一个点，继续移动
            if (this._currentPathIndex < this._movePathWorldPos.length) {
                return;
            } else {
                // 所有点都走完了
                this.node.setPosition(targetPos); // 确保精确到达最后一个点
                this.FinishMove();
                return;
            }
        }

        // 计算本帧移动的距离
        const moveDistance = this._moveSpeed * dt * this.playSpeedRate;

        // 如果本帧移动距离大于剩余距离，直接移动到目标点
        if (moveDistance >= distance) {
            this.node.setPosition(targetPos);

            // 更新当前格子位置
            if (this._currentPathIndex < this._movePathData.length) {
                const hexData = this._movePathData[this._currentPathIndex];
                this.SetPos(hexData.q, hexData.r);
            }
            EventManager.Instance.dispatch(GameEvent.BATTLE_UNIT_SORT_CHANGED);
            this._currentPathIndex++;
        } else {
            // 标准化方向向量
            this._dirTemp.normalize();
            // 计算新位置
            // const newPos = new Vec3();
            Vec3.scaleAndAdd(this._moveNewPos, currentPos, this._dirTemp, moveDistance);
            this.node.setPosition(this._moveNewPos);
        }
    }
    /**血条根节点统一对齐单位世界坐标，视觉偏移由血条子节点设置。 */
    protected updateHpNodePos() {
        if (!isValid(this.hpNode, true)) {
            return;
        }
        this.hpNode.setWorldPosition(this.node.worldPosition);
    }
    /**
     * 移动完成回调（可由子类重写）
     */
    protected onMoveComplete(): void {
        // 子类可以重写此方法来处理移动完成事件
        console.log('BattleUnit move complete');
        this.PlayAction(UNIT_ACTION.IDLE, true);
        this.UpdateBattleMapPos();
        EventManager.Instance.dispatch(GameEvent.BATTLE_UNIT_MOVE_FINISH, this);
    }
    /**
     * 设置水平翻转
     * @param isFlip true为翻转，false为正常
     */
    public SetFlipX(isFlip: boolean) {
        if (this.animation && this.animation.node) {
            // const scaleX = isFlip ? -1 : 1;
            // const currentScale = this.animation.node.scale;
            this.animation.SetFlipX(isFlip);
            // this.animation.node.setScale(scaleX, currentScale.y, currentScale.z);
        }
    }
    public CheckDir(targetPos: Vec3) {
        // 计算到目标点的距离
        // const direction = new Vec3();
        const currentPos = this.node.position;
        Vec3.subtract(this._dirTemp, targetPos, currentPos);
        // const distance = this._dirTemp.length();

        // 根据移动方向判断是否需要翻转
        // x > 0 朝右不翻转，x < 0 朝左翻转
        if (this._dirTemp.x < 0) {
            this.SetFlipX(true);
        } else if (this._dirTemp.x > 0) {
            this.SetFlipX(false);
        }
    }
    private _selectColor = new Color(255, 220, 60, 255)
    public setSelectEffect(bol: boolean) {
        this.animation.setOutline(bol, this._selectColor, 1.5);
    }
    public SetHpLayer(targetLayer: Node) {
        if (!isValid(this.hpNode, true) || !isValid(targetLayer, true)) {
            return;
        }
        this.hpNode.setParent(targetLayer);
        this.hpNode.active = true;
        this.updateHpNodePos();
    }
    /**
     * 移除自身并清除数据
     */
    public clear() {
        this.StopMove();
        super.clear();
        if (isValid(this.lb_Hp, true)) {
            this.lb_Hp.setText("");
        }
        if (isValid(this.HpBar, true)) {
            this.HpBar.progress = 0;
        }
        // onDisable 和 onDestroy 都可能调用 clear，数据只能回收一次。
        if (this.m_data) {
            PoolMgr.put(this.m_data);
            this.m_data = null;
        }
        // clear 可能在父节点停用期间执行，此时只隐藏，不修改节点层级。
        if (isValid(this.hpNode, true)) {
            this.hpNode.active = false;
        }
    }
    protected onDestroy(): void {
        super.onDestroy();
        // 血条已移出单位子树，需要在单位实际销毁时一并释放。
        if (isValid(this.hpNode, true) && this.hpNode.parent !== this.node) {
            this.hpNode.destroy();
        }
    }
}


