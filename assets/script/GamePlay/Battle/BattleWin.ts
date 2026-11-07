import { _decorator, isValid, Node, Label } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BattleUnit } from './BattleUnit';
import { ATTACK_TYPE, BATTLE_HISTORY_ACTION_TYPE, BATTLE_RESULT, GameEvent, HEXGON_GRID_COLOR, MOVE_TYPE, UNIT_ACTION } from '../../Common/GameEnum';
import { BattleMgr, IBATTLE_DATA, IBATTLE_UNIT_DATA, IBATTLE_HISTORY_DATA, IBATTLE_HISTORY_ACTION, IHISTORY_NODE } from './BattleMgr';
import { BattleMapMgr } from './BattleMapMgr';
import { HexagonData, HexagonPos } from './HexagonData';
import { PathFindingMgr } from '../../Common/PathFindingMgr';
import { child, comp } from '../../Common/Decorator';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { PoolMgr } from '../../Common/Pool';
import { BattleUnitData } from './BattleUnitData';
import { UIMananger } from '../../Component/UIMananger';
import { WildMapWin } from '../WildMap/WildMapWin';
import { MapMgr } from '../WildMap/MapMgr';
import { GlobalData } from '../../Common/GlobalData';
import { BattleMapCom } from './BattleMapCom';
import { BattleStartSortCom } from './BattleStartSortCom';
import { DamageTextMgr } from './DamageTextMgr';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { lang } from '../../Common/LangMgr';
import { BattleResultWin } from './BattleResultWin';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { GameUrl } from '../../Common/GameUrl';

import { BaseIcon } from '../PVE/component/BaseIcon';
import { SkillMgr } from './SkillMgr';
import { ScrollList } from '../../Component/BaseComp/ScrollList';
import { SkillCardCell } from './Skill/SkillCardCell';
import { SkillCardDragCom } from './Skill/SkillCardDragCom';
import { ISkillData } from '../../Config/Typings/SkillData';
const { ccclass } = _decorator;

@ccclass('BattleWin')
export class BattleWin extends BaseWin {

    @comp(BaseBtn)
    btn_HideGrid: BaseBtn = null!;

    @comp(BaseBtn)
    btn_showGridLb: BaseBtn = null!;


    @child()
    unitContainer: Node = null!;

    @child()
    HpContainer: Node = null!;
    @child()
    EffectContainer: Node = null!;


    @comp(BaseBtn)
    btn_fail: BaseBtn = null!;

    @comp(BaseBtn)
    btn_win: BaseBtn = null!;

    @comp(BattleMapCom)
    mapCom: BattleMapCom = null!;

    @comp(BattleStartSortCom)
    startSortCom: BattleStartSortCom = null!;
    @child()
    numberContainer: Node = null!;
    @comp(BaseLabel)
    lb_round: BaseLabel = null!;

    @comp(BaseBtn)
    btn_pre: BaseBtn = null!;

    @comp(BaseBtn)
    btn_next: BaseBtn = null!;

    @comp(BaseBtn)
    btn_speed: BaseBtn = null!;

    @comp(BaseBtn)
    btn_skip: BaseBtn = null!;

    @comp(BaseBtn)
    btn_skipRound: BaseBtn = null!;

    @comp(BaseBtn)
    btn_escape: BaseBtn = null!;

    @comp(BaseBtn)
    btn_auto: BaseBtn = null!;

    @comp(BaseSprite)
    imgAutoState: BaseSprite = null!;

    @comp(Label)
    lb_speedRate: Label = null!;
    @comp(BaseBtn)
    btn_wait: BaseBtn = null!;

    @comp(BaseLabel)
    lb_waitState: BaseLabel = null!;
    @comp(BaseSprite)
    UnitInfo: BaseSprite = null!;

    @comp(BaseIcon)
    soldierIcon: BaseIcon = null!;

    @child()
    historyController: Node = null!;


    @comp(BaseLabel)
    lb_SoldierName: BaseLabel = null!;

    @comp(BaseLabel)
    lb_SoldierProperty: BaseLabel = null!;

    @comp(BaseLabel)
    lb_notice: BaseLabel = null!;

    @comp(BaseLabel)
    lb_playState: BaseLabel = null!;

    @comp(BaseBtn)
    btn_playState: BaseBtn = null!;

    @comp(ScrollList)
    listCards: ScrollList = null!;

    /**当前阶段的手牌实例，同一种技能的多张牌也分别保存。 */
    private _skillCards: ISkillData[] = [];
    /**重新发牌或关闭窗口后，不再消费旧手牌会话。 */
    private _skillCardVersion = 0;
    /**整个卡牌栏本回合合计只能成功释放一次。 */
    private _hasUsedCardSkill = false;

    /**当前可选择攻击的敌人 */
    private _avalibleAttackEnemy: BattleUnit[];
    /**选择攻击的敌人 */
    private _selectAttack: BattleUnit[];
    private _selectUID: string;
    /**闪烁可移动选择提示的格子 */
    private _selectGrids: HexagonData[];
    private _isDebugMode: boolean = false;
    /**是否自动战斗中 */
    private _isAutoMode: boolean = false;
    /**当前是否在行动中*/
    private _isActioning: boolean = false;
    /**是否正在恢复历史快照 */
    private _isHistoryLoading: boolean = false;
    /**是否正在播放历史动作 */
    private _isHistoryPlaying: boolean = false;
    /**历史操作版本，忽略过期异步回调 */
    private _historyOperationVersion: number = 0;
    /**当前场景实际加载的历史快照 */
    private _loadedHistoryKey: string = null;
    /**等待移动、攻击表现完成的回调 */
    private _historyActionResolve: () => void = null;
    private _historyActionReject: (reason?: any) => void = null;

    /**战斗速率选择 */
    private _speedSelection = [1, 2, 4];
    //是否全屏
    public get Is_FullScene() {
        return true;
    }
    public initEvent(): void {

        super.initEvent();
        this.addEvent(GameEvent.Select_Grid_Battle_Unit, this.OnSelectUnit, this);
        this.addEvent(GameEvent.Clear_Battle_Select_Unit, this.OnClearSelectUnit, this);
        this.addEvent(GameEvent.BATTLE_UNIT_MOVE_FINISH, this.OnFinishMove, this);
        this.addEvent(GameEvent.BATTLE_UNIT_SORT_CHANGED, this.updateAllNodesSortOrder, this);


        this.addNodeEvent(this.btn_showGridLb.node, Node.EventType.TOUCH_END, this.OnTapShowGridPos);
        this.addNodeEvent(this.btn_HideGrid.node, Node.EventType.TOUCH_END, this.OnTapHideGridPos);
        this.addNodeEvent(this.btn_win.node, Node.EventType.TOUCH_END, this.onTapWin);
        this.addNodeEvent(this.btn_fail.node, Node.EventType.TOUCH_END, this.onTapFail);
        this.addNodeEvent(this.btn_pre.node, Node.EventType.TOUCH_END, this.onClickPreAction);
        this.addNodeEvent(this.btn_next.node, Node.EventType.TOUCH_END, this.onClickNextAction);

        this.addNodeEvent(this.btn_speed.node, Node.EventType.TOUCH_END, this.onClickSpeed);
        this.addNodeEvent(this.btn_skip.node, Node.EventType.TOUCH_END, this.onClickSkipBattle);
        this.addNodeEvent(this.btn_skipRound.node, Node.EventType.TOUCH_END, this.onClickSkipRound);
        this.addNodeEvent(this.btn_escape.node, Node.EventType.TOUCH_END, this.onClickEscape);
        this.addNodeEvent(this.btn_auto.node, Node.EventType.TOUCH_END, this.onClickAuto);
        this.addNodeEvent(this.btn_wait.node, Node.EventType.TOUCH_END, this.onClickWaitFunc);
        this.addNodeEvent(this.btn_playState.node, Node.EventType.TOUCH_END, this.onClickPlayState);

        this.addEvent(GameEvent.Battle_Map_Click_Grid, this.onClickMapGrid, this);
        this._selectAttack = [];
        this._selectGrids = [];
    }
    async OnRefreshUI() {
        this._skillCards = [];
        this._skillCardVersion++;
        this._hasUsedCardSkill = false;
        this.Mgr.clearSkillCardDrag();
        super.OnRefreshUI();

        this._isAutoMode = false;
        this._isActioning = false;
        this.resetHistoryState();
        this.updateAutoState();
        this.onUpdatePlayState();
        this.onUpdatePlaySpeed();
        this.historyController.active = this.Mgr.isSaveBattleHistory;
        //战斗地图初始化
        const mapMgr = BattleMapMgr.getInstance();
        mapMgr.mapContainer = this.mapCom.node;
        const battleMapConfig = ConfigMgr.instance.battleMapConfig;
        await this.mapCom.createHexgonCells(battleMapConfig);
        this.unitContainer.setPosition(battleMapConfig.offsetX, battleMapConfig.offsetY);
        this.numberContainer.setPosition(this.unitContainer.position);
        this.HpContainer.setPosition(this.unitContainer.position);
        this.EffectContainer.setPosition(this.unitContainer.position);
        //战斗主逻辑初始化

        this.Mgr.Init(this.unitContainer, this.HpContainer, this.EffectContainer, this.numberContainer);
        this.mapCom.initBattleMap(this.unitContainer);

        const battleData = this._winData as IBATTLE_DATA;
        if (!battleData.enermyUnits) {
            return;
        }
        const enemyUnits = this.createEnemyUnitDatas(battleData.enermyUnits);
        Promise.all([ConfigMgr.instance.loadSkillConfig(), this.Mgr.InitMyTeamUnit(), this.Mgr.InitEnermy(enemyUnits)])
            .then(() => this.onFinishInitUnitdatas());
    }
    protected update(dt: number): void {
        SkillMgr.getInstance().update(dt);
    }
    /**根据布阵配置创建敌方单位数据 */
    private createEnemyUnitDatas(units: IBATTLE_UNIT_DATA[]): BattleUnitData[] {
        const configMgr = ConfigMgr.instance;
        const result: BattleUnitData[] = [];
        for (const unit of units) {
            const gridPosData = configMgr.DeployGridData.get(unit.posId);
            const unitCfg = configMgr.UnitAttrData.get(unit.unitAttrId);
            if (!gridPosData || !unitCfg) {
                continue;
            }
            const unitData = PoolMgr.get(BattleUnitData);
            unitData.SetData(unitCfg, unit.lv, 2, unit.num, { q: gridPosData.column, r: gridPosData.row });
            result.push(unitData);
        }
        return result;
    }
    /**初始化战斗单位后的回调 */
    protected onFinishInitUnitdatas() {
        this.updateAllNodesSortOrder();
        this.updateSortCom();
        this.Mgr.curBattleHistoryNode = { round: 1, index: 0, actionStep: 0 }
        this.RefreshCard();
        this.checkAndUpdateRound();
        this.NextUnitAction();
    }
    /**更新出手顺序 */
    protected updateSortCom() {

        this.startSortCom.setData(this.Mgr.GetUnitSortDatas());
    }
    /**更新回合数 */
    protected checkAndUpdateRound() {
        const startSortDatas = this.startSortCom.GetDatas();
        const isRoundFinished = startSortDatas?.every(sortData => sortData.round >= this.Mgr.curRound);
        if (isRoundFinished) {
            this.Mgr.curRound++;
            this.Mgr.curBattleHistoryNode.round = this.Mgr.curRound;
            this.Mgr.curBattleHistoryNode.index = 0;
            this.Mgr.ResetBattleUnitCounterAttack();
            this.RefreshCard();
        }
        this.lb_round.string = lang(183, { round: `${this.Mgr.curBattleHistoryNode.round}-${this.Mgr.curBattleHistoryNode.index}` });
    }

    /**轮次操作 */
    protected NextUnitAction() {
        const curRoundStart = this.startSortCom.GetCurUnitData();
        const uId = curRoundStart.uId;
        const hexData = this.mapCom.getGridCellByOccupyUID(uId).GetData();
        const battleUnit = this.Mgr.GetUnitByUID(uId);
        this.Mgr.addHistory(this.Mgr.curBattleHistoryNode);
        this._loadedHistoryKey = this.getHistoryKey(this.Mgr.curBattleHistoryNode);
        this._isActioning = true;
        this._selectUID = null;
        if (!battleUnit) {
            return;
        }

        this.updateActingUnitInfo(battleUnit);
        if (this.Mgr.CheckIsMyUnit(battleUnit) && !this._isAutoMode) {
            this.prepareManualAction(battleUnit, hexData);
            return;
        }
        this.executeAutoAction(battleUnit, hexData);
    }
    /**刷新当前行动单位的信息 */
    private updateActingUnitInfo(battleUnit: BattleUnit) {
        this.onCheckWaitState(battleUnit);
        const battleUnitData = battleUnit.GetData();
        const unitCfg = battleUnitData.unitCfg;
        const property = battleUnitData.GetProperty();
        this.soldierIcon.setData({ unitId: unitCfg.id, lv: battleUnitData.lv });
        this.lb_SoldierName.string = `${lang(unitCfg.name)}x${battleUnitData.soidierNum}`;
        const combatStats = [
            lang(203, { attack: property.attack }),
            lang(204, { defend: property.define }),
            lang(205, { speed: property.speed }),
        ].join('/');
        this.lb_SoldierProperty.string = `${lang(unitCfg.attack_type == ATTACK_TYPE.COMBAT ? 200 : 201)}-${lang(202, { move: unitCfg.move_distance })}-${combatStats}`;
        this.lb_notice.string = lang(battleUnitData.IsEnemy() ? 208 : 206);
        this.btn_wait.node.active = !battleUnitData.IsEnemy();
        this.btn_skipRound.node.active = this.btn_wait.node.active;
    }
    /**展示手动操作的移动范围和可攻击目标 */
    private prepareManualAction(battleUnit: BattleUnit, hexData: HexagonData) {
        this._isActioning = false;
        this.mapCom.SelectHexGridForMove(hexData.q, hexData.r);
        var moveGrids = this.mapCom.getHightLightGrids();
        if (!moveGrids) {
            moveGrids = [BattleMapMgr.getInstance().getHexDataFromPos(battleUnit.GetMapPos())];
        }
        const targets = this.Mgr.GetAvalibleAttackByAvalibleWalkGrids(battleUnit, moveGrids);
        if (!targets?.length) {
            return;
        }
        targets.forEach(enemy => {
            const pos = enemy.GetMapPos();
            this.mapCom.getHexCell(pos.q, pos.r)?.SetColor(HEXGON_GRID_COLOR.RED);
        });
        this._avalibleAttackEnemy = targets;
    }
    /**自动选择目标并行动 */
    private executeAutoAction(battleUnit: BattleUnit, hexData: HexagonData) {
        this._selectAttack = [];
        const mapMgr = BattleMapMgr.getInstance();
        const targetUnit = this.Mgr.EnemyAIActionAutoSelectTarget(battleUnit);
        const moveGrids = PathFindingMgr.getInstance().getReachableRange(hexData, battleUnit.GetData().unitCfg.move_distance);
        let targetPos: HexagonPos;
        if (targetUnit) {
            targetPos = targetUnit.GetMapPos();
            this._avalibleAttackEnemy = [targetUnit];
        } else {
            const nearestEnemy = this.Mgr.GetNearEnemy(battleUnit);
            if (nearestEnemy) {
                targetPos = this.Mgr.GetNearestGridData(battleUnit, mapMgr.getHexDataFromPos(nearestEnemy.GetMapPos()));
            }
        }
        // 没有找到目标和移动格子时，直接赋值自己位置
        if (!targetPos) {
            targetPos = battleUnit.GetMapPos();
        }
        const targetGrid = this.onSelectEnemy(battleUnit, mapMgr.getHexDataFromPos(targetPos), moveGrids, true);
        if (targetGrid) {
            this.selectUnitMove(battleUnit, targetGrid);
        }
    }
    /**
    * 更新所有节点的层级排序，飞行单位置顶，其余按Y坐标排序。
    */
    public updateAllNodesSortOrder() {
        if (!this.unitContainer?.isValid) {
            return;
        }
        const nodes = this.unitContainer.children
            .map(node => ({ node, y: node.position.y, flying: node.getComponent(BattleUnit)?.IsFlying() ? 1 : 0 }))
            .sort((a, b) => a.flying - b.flying || b.y - a.y);
        nodes.forEach((item, index) => item.node.setSiblingIndex(index));
    }
    public get Mgr() {
        return BattleMgr.getInstance();
    }

    /**处理手动选点、攻击确认和移动 */
    private onClickMapGrid(data: HexagonData): void {
        const selectUnit = this.mapCom.selectUnit;
        if (!selectUnit) {
            return;
        }

        let targetGrid = data;
        this._isActioning = true;
        if (data.occupiedUnitId && data.occupiedUnitId != selectUnit.GetData().uId) {

            if (this._selectUID && this._selectUID != data.occupiedUnitId) {
                this.clearPreviewGrids();
                this._selectAttack = [];
            } else if (this.tryAttackSelectedTarget(selectUnit, data.occupiedUnitId)) {
                return;
            }
            targetGrid = this.onSelectEnemy(selectUnit, data, this.mapCom.getHightLightGrids(), false);
            if (!targetGrid) {
                this._isActioning = false;
                return;
            }
        }
        if (targetGrid.highlighted && targetGrid.isEmpty() && targetGrid.isWalkable()) {
            this.selectUnitMove(selectUnit, targetGrid);
        }
    }
    /**再次点击已选目标时，在攻击距离内直接攻击 */
    private tryAttackSelectedTarget(selectUnit: BattleUnit, targetUID: string): boolean {
        const targetUnit = this.Mgr.GetUnitByUID(targetUID);
        if (!targetUnit) {
            return false;
        }
        const attackDistance = selectUnit.GetData().unitCfg.attack_distance;
        const fromPos = selectUnit.GetMapPos();
        const targetPos = targetUnit.GetMapPos();
        if (HexagonData.distance(fromPos.q, fromPos.r, targetPos.q, targetPos.r) > attackDistance) {
            return false;
        }
        if (this._selectAttack.indexOf(targetUnit) < 0) {
            this._selectAttack.push(targetUnit);
        }
        this.initState();
        this.OnFinishMove(selectUnit);
        return true;
    }
    private clearPreviewGrids() {
        this.mapCom.clearBreath();
        this._selectGrids = [];

    }
    private onSelectEnemy(selectUnit: BattleUnit, data: HexagonData, avalibelMoveGrids: HexagonData[], isAuto: boolean): HexagonData {
        const targetUnit = this.Mgr.GetUnitByUID(data.occupiedUnitId);
        if (!targetUnit || !this._avalibleAttackEnemy || this._avalibleAttackEnemy.indexOf(targetUnit) < 0) {
            return data;
        }
        if (selectUnit.GetData().unitCfg.attack_type == ATTACK_TYPE.REMOTE) {
            this._selectAttack.push(targetUnit);
            this.initState();
            this.OnFinishMove(selectUnit);
            return null;
        }

        const fromPos = selectUnit.GetMapPos();
        const fromGrid = BattleMapMgr.getInstance().getHexData(fromPos.q, fromPos.r);
        const attackDistance = selectUnit.GetData().unitCfg.attack_distance;
        const targetGrids = this.Mgr.GetNearAroundTargetFromPosGrid(fromGrid, data, avalibelMoveGrids, attackDistance);
        if (targetGrids.length === 0) {
            return data;
        }
        this._selectAttack.push(targetUnit);
        if (targetGrids.length > 1 && !isAuto) {
            // 多个落点时先预览，由玩家再次选择
            this._selectGrids.push(...targetGrids);
            this.mapCom.startBreath(targetGrids.map(grid => grid.pos));
            this._selectUID = data.occupiedUnitId;
            return null;
        }
        return targetGrids[0];
    }
    private selectUnitMove(battleUnit: BattleUnit, targetResultGrid: HexagonData) {
        const mapMgr = BattleMapMgr.getInstance();
        if (this._selectGrids.length > 0 && this._selectGrids.indexOf(targetResultGrid) < 0) {
            // 如果点击的不是选择的格子，取消攻击对象，变成纯移动
            this._selectAttack = [];
        }
        const fromData = battleUnit?.GetMapPos() ? mapMgr.getHexDataFromPos(battleUnit.GetMapPos()) : null;
        if (!fromData || !targetResultGrid) {
            this.handleMoveError(new Error("移动失败：起点或目标格子无效"));
            return;
        }
        console.log(`开始移动${fromData.toString()}=>>>${targetResultGrid.toString()}`)

        if (targetResultGrid.equals(fromData)) {
            // 如果已经是自己的格子就直接执行
            this.OnFinishMove(battleUnit);
            this.initState();
            return;
        }
        const path = PathFindingMgr.getInstance().findPath(fromData, targetResultGrid, battleUnit.GetData().unitCfg.move_type == MOVE_TYPE.FLY);
        if (!path || path.length === 0) {
            this.handleMoveError(new Error(`移动失败：无法从(${fromData.q},${fromData.r})到达(${targetResultGrid.q},${targetResultGrid.r})`));
            return;
        }
        battleUnit.StartMove(path);
        if (!this._isHistoryPlaying) {
            this.Mgr.addHistoryAction(this.Mgr.curBattleHistoryNode, BATTLE_HISTORY_ACTION_TYPE.MOVE, [battleUnit.GetData().uId], targetResultGrid.pos);
        }
        this.initState();
    }
    private handleMoveError(error: Error) {
        if (this._isHistoryPlaying) {
            this._historyActionReject?.(error);
            return;
        }
        this._isActioning = false;
        console.warn(error.message);
    }
    /**初始化操作状态 */
    private initState() {
        var selectUnit = this.mapCom.selectUnit;
        if (selectUnit) {
            var pos = selectUnit.GetMapPos();
            BattleMapMgr.getInstance().getHexData(pos.q, pos.r).setSelected(false);
        }
        this._avalibleAttackEnemy = null;
        this.mapCom.RefreshAllGrids();
        this.OnClearSelectUnit();
        this.clearPreviewGrids();

    }
    /**
     * 显示格子坐标
     */
    private OnTapShowGridPos() {
        this.setGridPosVisible(true);
    }
    /**
     * 隐藏格子坐标
     */
    private OnTapHideGridPos() {
        this.setGridPosVisible(false);
    }
    private setGridPosVisible(visible: boolean) {
        this.mapCom.getAllHexCells().forEach(cell => {
            cell.ShowPosLabel(visible);
        });
        this.btn_HideGrid.node.active = visible;
        this.btn_showGridLb.node.active = !visible;
    }
    /**
     * 选中单位操作
     */
    private OnSelectUnit(selectUnit: BattleUnit) {
        this.mapCom.selectUnit = selectUnit;
        this.mapCom.selectUnit.setSelectEffect(true)
    }

    private OnClearSelectUnit() {
        if (this.mapCom.selectUnit) {
            this.mapCom.selectUnit.setSelectEffect(false)
            this.mapCom.selectUnit = null;
        }
        this.mapCom.ClearHightLight();
    }
    private onCheckWaitState(battleUnit: BattleUnit) {
        var hasWait = battleUnit.GetData().CheckHasWait()
        this.btn_wait.SetGray(hasWait);
        this.lb_waitState.string = lang(hasWait ? 187 : 186);
    }
    // 完成移动后
    private async OnFinishMove(battleUnit: BattleUnit) {
        try {
            this.updateAllNodesSortOrder();
            const attackTargets = this._selectAttack;
            if (attackTargets?.length) {
                // await this.attackSelectedTargets(battleUnit, attackTargets);
                await this.attackAndUseSkillSelectedTargets(battleUnit, attackTargets);
            }
            this._selectAttack = [];
            this.EndUnitRound(battleUnit);
            if (this._isHistoryPlaying) {
                this._historyActionResolve?.();
                this._historyActionResolve = null;
                this._historyActionReject = null;
            }
        } catch (error) {
            this._selectAttack = [];
            if (this._isHistoryPlaying) {
                this._historyActionReject?.(error);
                this._historyActionResolve = null;
                this._historyActionReject = null;
                return;
            }
            throw error;
        }
    }
    /**攻击所选目标，等待攻击表现完成后处理相邻单位的反击 */
    private async attackSelectedTargets(battleUnit: BattleUnit, targets: BattleUnit[]) {
        this.lb_notice.string = lang(207);
        if (!this._isHistoryPlaying) {
            const unitUIDs = [battleUnit.GetData().uId, ...targets.map(target => target.GetData().uId)];
            this.Mgr.addHistoryAction(this.Mgr.curBattleHistoryNode, BATTLE_HISTORY_ACTION_TYPE.ATTACK, unitUIDs, battleUnit.GetMapPos());
        }
        await this.attackFunc(battleUnit, targets);

        const counterAttacks = [];
        const attackerPos = battleUnit.GetMapPos();
        for (const target of targets) {
            if (!target || target.CheckIsDead() || !target.GetData().CheckIsCanCounterAttack()) {
                continue;
            }
            const targetPos = target.GetMapPos();
            if (HexagonData.distance(attackerPos.q, attackerPos.r, targetPos.q, targetPos.r) <= 1) {
                target.GetData().counterAttackNum++;
                counterAttacks.push(this.attackFunc(target, [battleUnit]));
            }
        }
        await Promise.all(counterAttacks);
    }
    /**攻击所选目标，等待攻击表现完成后处理相邻单位的反击 */
    private async attackAndUseSkillSelectedTargets(battleUnit: BattleUnit, targets: BattleUnit[], skill?: ISkillData) {
        this.lb_notice.string = lang(207);
        if (!this._isHistoryPlaying) {
            const unitUIDs = [battleUnit.GetData().uId, ...targets.map(target => target.GetData().uId)];
            const otherParams = skill ? [{ skillId: skill.id }] : undefined;
            this.Mgr.addHistoryAction(this.Mgr.curBattleHistoryNode, BATTLE_HISTORY_ACTION_TYPE.ATTACK, unitUIDs, battleUnit.GetMapPos(), otherParams);
        }
        await this.useSkill(battleUnit, targets, skill);
        const counterAttacks = [];
        // 普通攻击才触发反击
        if (!skill) {
            const attackerPos = battleUnit.GetMapPos();
            for (const target of targets) {
                if (!target || target.CheckIsDead() || !target.GetData().CheckIsCanCounterAttack()) {
                    continue;
                }
                const targetPos = target.GetMapPos();
                if (HexagonData.distance(attackerPos.q, attackerPos.r, targetPos.q, targetPos.r) <= 1) {
                    target.GetData().counterAttackNum++;
                    counterAttacks.push(this.useSkill(target, [battleUnit]));
                }
            }
        }
        return Promise.all(counterAttacks);
    }
    /**处理单位攻击效果 */
    private attackFunc(attackUnit: BattleUnit, beAttackUnits: BattleUnit[]) {
        attackUnit.PlayActions([UNIT_ACTION.ATTACK]);
        attackUnit.CheckDir(beAttackUnits[0].node.position);
        beAttackUnits.forEach(beAttackUnit => {
            beAttackUnit.PlayActions([UNIT_ACTION.BE_HIT]);
        })
        var resultDamage = this.Mgr.attackFunc(attackUnit, beAttackUnits);
        var arrPromise = []
        resultDamage.forEach((resultValue: number, uId: string) => {
            let beAttacker = this.Mgr.GetUnitByUID(uId);
            arrPromise.push(beAttacker.HpHandler(resultValue));
            arrPromise.push(DamageTextMgr.getInstance().showDamageText(resultValue.toString(), beAttacker.node.position.toVec2(), this.numberContainer));
        })
        return new Promise(resolve => {
            Promise.all(arrPromise).then(() => {
                resolve(null);
            })
        })

    }
    /**使用技能 */
    private useSkill(attackUnit: BattleUnit, beAttackUnits: BattleUnit[], skill?: ISkillData): Promise<void> {
        var resultDamage = this.Mgr.attackFunc(attackUnit, beAttackUnits);
        return SkillMgr.getInstance().skillPlay(attackUnit, beAttackUnits, resultDamage, skill);
    }

    /**结束该单位的回合操作 */
    private EndUnitRound(battleUnit: BattleUnit, isWait?: boolean) {
        var result = this.Mgr.CheckIsFinishBattle()
        this.Mgr.curBattleHistoryNode.index++;
        if (result != BATTLE_RESULT.NONE) {
            UIMananger.instance.showWin(BattleResultWin, result);
            return;
        }
        if (!battleUnit.CheckIsDead() && !isWait) {
            battleUnit.GetData().round = this.Mgr.curRound;
            battleUnit.GetData().sort = 0;
        }
        this.updateSortCom();
        this.checkAndUpdateRound();
        this._isActioning = false;
        if (this.Mgr.CheckIsMyUnit(battleUnit) || !this._isDebugMode) {
            this.NextUnitAction();
        }

    }
    private updateAutoState() {
        this.imgAutoState.setSpriteFromAtlas(this._isAutoMode ? "ui_battle_icon_auto_str" : "ui_battle_icon_manual_str", GameUrl.Atlas_Battle);
    }
    /**本阶段等待 */
    private onClickWaitFunc() {
        const sortList = this.Mgr.GetUnitSortDatas();
        const curRoundStart = this.startSortCom.GetCurUnitData();
        for (let i = sortList.length - 1; i >= 0; i--) {
            if (sortList[i].round >= this.Mgr.curRound) {
                continue;
            }
            const resultSort = sortList[i].sort - 1;
            curRoundStart.sort = resultSort === 0 ? -1 : resultSort;
            const battleUnit = this.Mgr.GetUnitByUID(curRoundStart.uId);
            if (!battleUnit) {
                return;
            }
            battleUnit.GetData().sort = curRoundStart.sort;
            this.Mgr.addHistoryAction(this.Mgr.curBattleHistoryNode, BATTLE_HISTORY_ACTION_TYPE.WAIT, [curRoundStart.uId], battleUnit.GetMapPos(), [curRoundStart.sort]);
            this.initState();
            this.EndUnitRound(battleUnit, true);
            return;
        }
    }
    private onClickPlayState() {
        this._isDebugMode = !this._isDebugMode;
        this.onUpdatePlayState();
        if (!this._isDebugMode && this.isCanControll()) {
            this.NextUnitAction();
        }
    }
    private onUpdatePlayState() {
        this.lb_playState.string = this._isDebugMode ? "GO" : lang(245);
    }
    private onUpdatePlaySpeed() {
        this.lb_speedRate.string = `x${this.Mgr.playSpeedRate}`;
    }
    private onTapWin() {
        this.closeWin();
        var mapMgr = MapMgr.getInstance()

        // 这里需要判断是否是暗雷，暗雷不加次数
        if (mapMgr.mapObjectHandling?.mapUID) {
            GlobalData.wildData.addKillMonster(mapMgr.curMapId);
        }

        mapMgr.HandleMapOjectFinishChat(mapMgr.mapObjectHandling, GlobalData.playerData, "");


    }
    private onTapFail() {
        this.closeWin();
        this.scheduleOnce(() => {
            UIMananger.instance.closeWin(WildMapWin);
        })
        GlobalData.wildData.ClearRolePos();
    }
    private async onClickPreAction() {
        if (!this.isCanControll() || !this.Mgr.curBattleHistoryNode) {
            return;
        }
        const targetNode: IHISTORY_NODE = { ...this.Mgr.curBattleHistoryNode, actionStep: 0 };
        if (targetNode.index === 0) {
            if (targetNode.round <= 1) {
                return;
            }
            targetNode.round--;
            targetNode.index = (this.Mgr.battleHistory.get(targetNode.round)?.length || 0) - 1;
        } else {
            targetNode.index--;
        }
        if (targetNode.index < 0 || !this.Mgr.getHistoryByHistoryNode(targetNode)) {
            return;
        }
        try {
            await this.playBattleHistory(targetNode);
        } catch (error) {
            console.error("播放上一条战斗记录失败", error);
        }
    }
    private async onClickNextAction() {
        if (!this.isCanControll() || !this.Mgr.curBattleHistoryNode) {
            return;
        }
        const targetNode: IHISTORY_NODE = { ...this.Mgr.curBattleHistoryNode };
        if (targetNode.actionStep === 0) {
            if (!this.Mgr.getHistoryByHistoryNode(targetNode)?.action) {
                return;
            }
            targetNode.actionStep = 1;
        } else {
            targetNode.index++;
            targetNode.actionStep = 0;
            if (!this.Mgr.getHistoryByHistoryNode(targetNode)) {
                return;
            }
        }
        try {
            await this.playBattleHistory(targetNode);
        } catch (error) {
            console.error("播放下一条战斗记录失败", error);
        }
    }

    private onClickSpeed() {
        let indexSpeed = this._speedSelection.indexOf(this.Mgr.playSpeedRate);
        indexSpeed++;
        if (indexSpeed >= this._speedSelection.length) {
            indexSpeed = 0;
        }
        this.Mgr.playSpeedRate = this._speedSelection[indexSpeed];
        this.onUpdatePlaySpeed();
        this.Mgr.updateUnitSpeed();
    }
    private onClickSkipBattle() {

    }
    private onClickSkipRound() {
        if (!this.isCanControll()) {
            return;
        }
        const curRoundStart = this.startSortCom.GetCurUnitData();
        const battleUnit = this.Mgr.GetUnitByUID(curRoundStart.uId);
        this.Mgr.addHistoryAction(this.Mgr.curBattleHistoryNode, BATTLE_HISTORY_ACTION_TYPE.SKIP, [battleUnit.GetData().uId], battleUnit.GetMapPos());
        this.initState();
        this.EndUnitRound(battleUnit);
    }
    private onClickEscape() {
        this.closeWin();
    }
    private onClickAuto() {
        if (this._isHistoryLoading || this._isHistoryPlaying) {
            return;
        }
        this._isAutoMode = !this._isAutoMode;
        this.updateAutoState();
        if (this._isAutoMode && !this._isActioning) {
            this.NextUnitAction();
        }
    }
    private isCanControll() {
        return !this._isAutoMode && !this._isActioning && !this._isHistoryLoading && !this._isHistoryPlaying;
    }
    private getHistoryKey(historyNode: IHISTORY_NODE) {
        return `${historyNode.round}:${historyNode.index}`;
    }
    /**播放记录 */
    public async playBattleHistory(historyNode: IHISTORY_NODE): Promise<void> {
        if (!historyNode || this._isActioning || this._isHistoryLoading || this._isHistoryPlaying) {
            return;
        }
        const history = this.Mgr.getHistoryByHistoryNode(historyNode);
        if (!history) {
            console.warn(`战斗记录不存在：${historyNode.round}-${historyNode.index}`);
            return;
        }

        const operationVersion = ++this._historyOperationVersion;
        const targetNode: IHISTORY_NODE = { ...historyNode };
        const historyKey = this.getHistoryKey(targetNode);
        const needRestore = targetNode.actionStep === 0 || this._loadedHistoryKey !== historyKey;
        this._isActioning = true;

        try {
            if (needRestore && !(await this.restoreHistorySnapshot(history, targetNode, operationVersion))) {
                return;
            }
            // 恢复方法返回后仍有一次异步切换，避免窗口关闭后继续行动
            if (operationVersion !== this._historyOperationVersion || !this.node.isValid) {
                return;
            }
            if (targetNode.actionStep === 0) {
                this.checkAndUpdateRound();
                if (this._isDebugMode) {
                    this._isActioning = false;
                    return;
                }
                this.NextUnitAction();
                return;
            }

            const historyAction = history.action;
            if (targetNode.actionStep <= 0 || !historyAction) {
                this.Mgr.curBattleHistoryNode.actionStep = 0;
                this._isActioning = false;
                return;
            }
            if (this._loadedHistoryKey !== historyKey) {
                throw new Error(`历史快照尚未恢复：${historyKey}`);
            }

            await this.executeHistoryAction(historyAction, historyKey);
            if (operationVersion === this._historyOperationVersion && this.Mgr.curBattleHistoryNode) {
                this.Mgr.curBattleHistoryNode.actionStep = 0;
            }
        } catch (error) {
            this._loadedHistoryKey = null;
            if (this.Mgr.curBattleHistoryNode) {
                this.Mgr.curBattleHistoryNode.actionStep = 0;
            }
            this._isActioning = false;
            throw error;
        } finally {
            if (operationVersion === this._historyOperationVersion) {
                this._isHistoryLoading = false;
                this._isHistoryPlaying = false;
                this._historyActionResolve = null;
                this._historyActionReject = null;
            }
        }
    }
    /**恢复历史快照；窗口关闭或操作已过期时停止后续处理 */
    private async restoreHistorySnapshot(history: IBATTLE_HISTORY_DATA, targetNode: IHISTORY_NODE, operationVersion: number): Promise<boolean> {
        this._isHistoryLoading = true;
        this._loadedHistoryKey = null;
        this.Mgr.curBattleHistoryNode = { ...targetNode };
        this.initState();
        this.mapCom.clearAllState();
        this.Mgr.ClearAllUnit();

        await this.Mgr.InitHistoryUnit(history.battleUnits);
        if (operationVersion !== this._historyOperationVersion || !this.node.isValid) {
            return false;
        }
        this._loadedHistoryKey = this.getHistoryKey(targetNode);
        this.updateAllNodesSortOrder();
        this.updateSortCom();
        this.Mgr.curRound = targetNode.round;
        this.Mgr.curBattleHistoryNode = { ...targetNode };
        if (targetNode.actionStep !== 0) {
            this.lb_round.string = lang(183, { round: `${targetNode.round}-${targetNode.index}` });
        }
        return true;
    }
    /**按动作类型分发历史回放 */
    private async executeHistoryAction(action: IBATTLE_HISTORY_ACTION, historyKey: string): Promise<void> {
        this._isHistoryPlaying = true;
        this.initState();
        const actionUnitUID = action.actionUnitUID?.[0];
        const actionUnit = actionUnitUID ? this.Mgr.GetUnitByUID(actionUnitUID) : null;
        if (!actionUnit || !actionUnit.GetData() || !actionUnit.GetMapPos()) {
            throw new Error(`历史行动单位不存在或尚未初始化：${actionUnitUID || "空UID"}，节点：${historyKey}`);
        }

        switch (action.actionType) {
            case BATTLE_HISTORY_ACTION_TYPE.ATTACK:
                return this.playHistoryAttack(actionUnit, action, historyKey);
            case BATTLE_HISTORY_ACTION_TYPE.MOVE:
                return this.playHistoryMove(actionUnit, action, historyKey);
            case BATTLE_HISTORY_ACTION_TYPE.WAIT: {
                const sort = action.otherParam?.[0];
                if (sort !== undefined) {
                    actionUnit.GetData().sort = sort;
                }
                this.EndUnitRound(actionUnit, true);
                return;
            }
            case BATTLE_HISTORY_ACTION_TYPE.SKIP:
                this.initState();
                this.EndUnitRound(actionUnit);
                return;
            default:
                throw new Error(`未知历史动作类型：${action.actionType}`);
        }
    }
    private async playHistoryAttack(actionUnit: BattleUnit, action: IBATTLE_HISTORY_ACTION, historyKey: string): Promise<void> {
        if (action.actionUnitUID.length < 2) {
            throw new Error(`攻击记录缺少攻击目标：${historyKey}`);
        }
        if (!action.targetPos) {
            throw new Error(`攻击记录缺少目标坐标：${historyKey}`);
        }
        const targetGrid = BattleMapMgr.getInstance().getHexData(action.targetPos.q, action.targetPos.r);
        if (!targetGrid) {
            throw new Error(`攻击记录目标格子无效：${historyKey}`);
        }
        this._selectAttack = action.actionUnitUID.slice(1).map(targetUID => {
            const targetUnit = this.Mgr.GetUnitByUID(targetUID);
            if (!targetUnit || !targetUnit.GetData()) {
                throw new Error(`历史攻击目标不存在或尚未初始化：${targetUID}，节点：${historyKey}`);
            }
            return targetUnit;
        });
        const skillId = action.otherParam?.[0]?.skillId;
        if (skillId != null) {
            const skill = ConfigMgr.instance.SkillData.get(skillId);
            if (!skill) {
                throw new Error(`历史卡牌技能配置不存在：${skillId}，节点：${historyKey}`);
            }
            const attackTargets = this._selectAttack;
            this._selectAttack = [];
            const operationVersion = this._historyOperationVersion;
            await this.attackAndUseSkillSelectedTargets(actionUnit, attackTargets, skill);
            if (operationVersion != this._historyOperationVersion || !this.enabledInHierarchy || !isValid(this.node, true)) {
                return;
            }
            this.EndUnitRound(actionUnit);
            return;
        }
        return this.waitForHistoryAction(() => this.selectUnitMove(actionUnit, targetGrid));
    }
    private playHistoryMove(actionUnit: BattleUnit, action: IBATTLE_HISTORY_ACTION, historyKey: string): Promise<void> {
        if (!action.targetPos) {
            throw new Error(`移动记录缺少目标坐标：${historyKey}`);
        }
        const mapMgr = BattleMapMgr.getInstance();
        const curPos = actionUnit.GetMapPos();
        const fromGrid = mapMgr.getHexData(curPos.q, curPos.r);
        const targetGrid = mapMgr.getHexData(action.targetPos.q, action.targetPos.r);
        const isFly = actionUnit.GetData().unitCfg.move_type == MOVE_TYPE.FLY;
        const path = fromGrid && targetGrid ? PathFindingMgr.getInstance().findPath(fromGrid, targetGrid, isFly) : [];
        if (!path || path.length === 0) {
            throw new Error(`历史移动路径无效：${historyKey}`);
        }
        return this.waitForHistoryAction(() => actionUnit.StartMove(path));
    }
    /**移动完成事件统一结束历史动作的等待 */
    private waitForHistoryAction(startAction: () => void): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._historyActionResolve = resolve;
            this._historyActionReject = reject;
            startAction();
        });
    }
    private resetHistoryState() {
        this._historyOperationVersion++;
        this._historyActionResolve?.();
        this._historyActionResolve = null;
        this._historyActionReject = null;
        this._isHistoryLoading = false;
        this._isHistoryPlaying = false;
        this._loadedHistoryKey = null;
    }
    private RefreshCard() {
        if (!this.enabledInHierarchy || !isValid(this.node, true)) {
            return;
        }
        this.Mgr.clearSkillCardDrag();
        this._skillCardVersion++;
        this._hasUsedCardSkill = false;
        this._skillCards = (this.Mgr.refreshSkillCards() || []).map(skill => ({ ...skill }));
        this.listCards.updateList(this._skillCards, SkillCardCell);
        // 手牌仅用于点击和技能拖动，关闭列表自身的滚动触摸。
        this.listCards.stopAutoScroll();
        this.listCards.enabled = false;
        const cardDrag = this.node.getComponent(SkillCardDragCom) || this.node.addComponent(SkillCardDragCom);
        cardDrag.setup(this.mapCom, {
            canUse: skill => !this._hasUsedCardSkill && !this._isActioning
                && !this._isHistoryLoading && !this._isHistoryPlaying && this._skillCards.indexOf(skill) >= 0,
            onClick: skill => this.onClickSkillCard(skill),
            onRelease: (skill, target) => this.useCardSkillAttack(skill, target),
            onCancel: skill => this.onCancelSkillCard(skill),
        });
        if (this.enabledInHierarchy && isValid(this.node, true)) {
            this.Mgr.skillCardDragCom = cardDrag;
        } else {
            cardDrag.clear();
        }
    }
    /**预留：单击技能卡牌进入持续瞄准后的回调。 */
    private onClickSkillCard(skill: ISkillData) {

    }
    /**仅移除已经使用的手牌，不触发下一阶段的重新发牌。 */
    private consumeSkillCard(skill: ISkillData, version: number): void {
        const index = this._skillCards.indexOf(skill);
        if (version != this._skillCardVersion || index < 0) {
            return;
        }
        this._hasUsedCardSkill = true;
        // 列表保留旧数组引用；用新数组让它正确识别数量变化并回收格子。
        const remainingCards = this._skillCards.slice();
        remainingCards.splice(index, 1);
        this._skillCards = remainingCards;
        this.listCards.updateList(remainingCards, SkillCardCell);
    }
    /**按落点重新计算范围，攻击范围内敌人后结束当前士兵行动。 */
    private async useCardSkillAttack(skill: ISkillData, target: HexagonData) {
        if (!skill || !target || !this.enabledInHierarchy || !isValid(this.node, true)
            || this._isActioning || this._isHistoryLoading || this._isHistoryPlaying || !this.Mgr.curBattleHistoryNode
            || this._hasUsedCardSkill || this._skillCards.indexOf(skill) < 0) {
            return;
        }
        const curRoundStart = this.startSortCom.GetDatas()?.[0];
        const battleUnit = curRoundStart ? this.Mgr.GetUnitByUID(curRoundStart.uId) : null;
        if (!isValid(battleUnit, true) || !battleUnit.node.activeInHierarchy || !battleUnit.GetData() || battleUnit.CheckIsDead()) {
            return;
        }
        const camp = battleUnit.GetData().camp;
        const attackTargets: BattleUnit[] = [];
        const targetUIDs = new Set<string>();
        const areaGrids = this.mapCom.getSkillAttackAreaGrids(target, skill.attack_area);
        for (const grid of areaGrids) {
            const uId = grid.getOccupiedUnit();
            if (!uId || targetUIDs.has(uId)) {
                continue;
            }
            const enemy = this.Mgr.GetUnitByUID(uId);
            if (!isValid(enemy, true) || !enemy.node.activeInHierarchy || !enemy.GetData()
                || enemy.CheckIsDead() || !enemy.GetData().checkIsEnemy(camp)) {
                continue;
            }
            targetUIDs.add(uId);
            attackTargets.push(enemy);
        }
        if (!attackTargets.length) {
            return;
        }

        const operationVersion = this._historyOperationVersion;
        const cardVersion = this._skillCardVersion;
        const historyKey = this.getHistoryKey(this.Mgr.curBattleHistoryNode);
        const isCurrentAction = () => this.enabledInHierarchy && isValid(this.node, true)
            && operationVersion == this._historyOperationVersion && this.Mgr.curBattleHistoryNode
            && historyKey == this.getHistoryKey(this.Mgr.curBattleHistoryNode);
        this._isActioning = true;
        this.initState();
        this._selectAttack = [];
        try {
            await this.attackAndUseSkillSelectedTargets(battleUnit, attackTargets, skill);
            if (isCurrentAction()) {
                this.consumeSkillCard(skill, cardVersion);
                this.EndUnitRound(battleUnit);
            }
        } catch (error) {
            if (!isCurrentAction()) {
                return;
            }
            this._isActioning = false;
            console.error('卡牌技能释放失败', error);
            if (isValid(battleUnit, true) && !battleUnit.CheckIsDead()) {
                const pos = battleUnit.GetMapPos();
                const grid = BattleMapMgr.getInstance().getHexData(pos.q, pos.r);
                if (grid && this.Mgr.CheckIsMyUnit(battleUnit) && !this._isAutoMode) {
                    this.prepareManualAction(battleUnit, grid);
                }
            }
        }
    }
    /**预留：拖动或点击选点后在地图格子外松手。 */
    private onCancelSkillCard(skill: ISkillData) {
    }
    public clear(): void {
        this._skillCards = [];
        this._skillCardVersion++;
        this._hasUsedCardSkill = false;
        this.Mgr.clearSkillCardDrag();
        super.clear();
        this.resetHistoryState();
        this._isActioning = false;
        //清除战斗地图格子数据
        var mapMgr = BattleMapMgr.getInstance();
        mapMgr.clearMap();

        //清除战斗逻辑数据
        BattleMgr.getInstance().Clear();

    }
}


