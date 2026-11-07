import { _decorator, EventTouch, Node, NodeEventType, ScrollView, UI, UITransform, v2, Vec2, Vec3 } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { child, comp } from '../../Common/Decorator';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { SCROLL_HORIZONTAL, ScrollList } from '../../Component/BaseComp/ScrollList';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { FightPrepareMap } from './FightPrepareMap';
import { BattleMapMgr } from '../Battle/BattleMapMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { AssetMgr } from '../../Common/AssetMgr';
import { GameUrl } from '../../Common/GameUrl';
import { BattleUnit } from '../Battle/BattleUnit';
import { GameEvent, ParamDefined, ParamValueType, UNIT_ACTION } from '../../Common/GameEnum';
import { BattleUnitData } from '../Battle/BattleUnitData';
import { BattleTeamData, PVEMgr } from './PVEMgr';
import { PoolMgr } from '../../Common/Pool';
import { ConfigTools } from '../../Config/ConfigTools';
import { UIMananger } from '../../Component/UIMananger';
import { HeroFightSelectWin } from './HeroFightSelectWin';
import { GridScrollList } from '../../Component/BaseComp/GridScrollList';
import { SoldierIcon, SoldierIconData } from './component/SoldierIcon';
import { WildMapWin } from '../WildMap/WildMapWin';
import { HeroFightIcon } from './component/HeroFightIcon';
import { lang } from '../../Common/LangMgr';
import { HexagonData } from '../Battle/HexagonData';
import { FightPrepareGridCell } from './component/FightPrepareGridCell';
import { SliderInputComp } from '../../Component/SliderInputComp';
import { PVETeamCtrlWin } from './PVETeamCtrlWin';
import { MenuComp } from '../../Component/MenuComp';
import { MapGridData } from '../WildMap/MapGridData';
const { ccclass, property } = _decorator;
/**一键上阵的士兵数量，最大统御值按这个数平均分 */
const ONE_KEY_SOLDIER_NUM = 5;

@ccclass('FightPrepareWin')
export class FightPrepareWin extends BaseWin {
    @comp(BaseSprite)
    sp_bg: BaseSprite = null!;

    @comp(FightPrepareMap)
    mapCom: FightPrepareMap = null!;

    @child()
    UnitContainer: Node = null!;

    @comp(BaseLabel)
    lb_heroNum: BaseLabel = null!;

    @comp(ScrollList)
    listHero: ScrollList = null!;

    @comp(BaseLabel)
    lb_team: BaseLabel = null!;

    @comp(GridScrollList)
    listSoldier: GridScrollList = null!;


    @comp(BaseBtn)
    btn_team: BaseBtn = null!;

    @comp(BaseBtn)
    btn_fight: BaseBtn = null!;

    @comp(BaseBtn)
    btn_close: BaseBtn = null!;

    @comp(BaseLabel)
    lb_command: BaseLabel = null!;

    @child()
    dragArea: Node = null!;

    @child()
    SoldierDetail: Node = null!;

    @child()
    soldierListLayer: Node = null!;




    @comp(SoldierIcon)
    selectSoilderIcon: SoldierIcon = null!;


    @comp(BaseLabel)
    lb_selectSoldierName: BaseLabel = null!;

    // @comp(BaseLabel)
    // lb_selectSoldierNum: BaseLabel = null!;

    @comp(BaseLabel)
    lb_selectSoldierCommand: BaseLabel = null!;


    @comp(SliderInputComp)
    slider_input: SliderInputComp = null!;

    // @comp(BaseLabel)
    // lb_minSolder: BaseLabel = null!;

    // @comp(BaseLabel)
    // lb_maxSolder: BaseLabel = null!;

    // @comp(BaseBtn)
    // btn_max: BaseBtn = null!;

    @comp(BaseBtn)
    btn_deleteSoldier: BaseBtn = null!;

    @comp(BaseBtn)
    btn_confirmSoldier: BaseBtn = null!;

    @comp(MenuComp)
    Menu: MenuComp = null!;

    @comp(BaseBtn)
    btn_oneKey: BaseBtn = null!;

    @child()
    mapCenterPoint: Node = null!;



    private _battleDragUnit: BattleUnit;
    // 当前单击选择的士兵
    private _curSelectSoldierIcon: SoldierIcon;
    // 当前选中的士兵UID
    private _curSelectSoldierUID: number;
    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.btn_deleteSoldier.node, NodeEventType.TOUCH_END, this.onClickDeleteSoldier);
        this.addNodeEvent(this.btn_confirmSoldier.node, NodeEventType.TOUCH_END, this.onClickConfirmSoldier, this);
        this.addNodeEvent(this.btn_fight.node, NodeEventType.TOUCH_END, this.onClickFight, this);
        // this.addNodeEvent(this.btn_max.node, NodeEventType.TOUCH_END, this.onClickMax, this);

        this.addNodeEvent(this.btn_team.node, NodeEventType.TOUCH_END, this.onClickTeam, this);
        this.addNodeEvent(this.btn_oneKey.node, NodeEventType.TOUCH_END, this.onClickOneKey, this);

        this.addEvent(GameEvent.FIGHT_SELECT_UNIT_UPDATE, this.OnUpdateInfo, this);
        this.addEvent(GameEvent.BEGIN_DRAG_SOLDIER, this.onBeginDrag, this);
        this.addEvent(GameEvent.FIGHT_SELECT_SOLDIER, this.onBeginSelectSoldier, this);
        this.addEvent(GameEvent.Battle_Map_Click_Grid, this.onClickSelectGrid, this);
        this.addEvent(GameEvent.FIGHT_DRAG_UNIT_DROP, this.onDragUnitDrop, this);
        this.addEvent(GameEvent.DELETE_SOLDIER_FIGHT, this.onDeleteUnit, this);
        this.addEvent(GameEvent.CANCLE_SELECT_SOLDIER, this.clearSelectSoldier, this);

        const contents = [lang(176), lang(177), lang(178), lang(179), lang(180)];
        this.Menu.updateList(contents, this.updateSoldierList.bind(this));
    }
    public get Is_FullScene() {
        return true;
    }
    public async OnRefreshUI() {
        super.OnRefreshUI();

        var battleMapConfig = ConfigMgr.instance.battleMapConfig;
        await this.mapCom.createHexgonCells(battleMapConfig, v2(0, this.mapCenterPoint.position.y), FightPrepareGridCell);
        // this.sp_bg.node.setPosition(0, this.mapCenterPoint.position.y)
        this.mapCom.initBattleMap(this.UnitContainer);

        this.OnUpdateInfo();
    }
    OnUpdateInfo() {
        //初始化布阵实体
        var battleUnitInfos = this.Mgr.getCurBattleArray();
        if (battleUnitInfos) {
            var arrPromise = [];
            var arrHasUID = [];
            battleUnitInfos.forEach(unit => {
                if (unit.pos) {
                    arrHasUID.push(unit.uId);
                    // 坐标一律传拷贝，避免实体内部改位置时反过来污染阵容数据
                    var pos = { q: unit.pos.q, r: unit.pos.r };
                    var battleUnit = this.Mgr.getUnitEntity(unit.uId);
                    if (battleUnit) {
                        battleUnit.SetMapGridPos(pos);
                        // 切换编队/一键上阵后数量可能变了，实体数量以阵容数据为准
                        battleUnit.updateSoldierNum(unit.num);
                    } else {
                        var battleUnitData = PoolMgr.get(BattleUnitData);
                        battleUnitData.SetData(ConfigTools.instance.getUnitAttrCfgByUnitID(unit.unitId), this.Mgr.getSoldierLv(unit.uId), 1, unit.num, pos);
                        arrPromise.push(this.CreateBattleUnit(battleUnitData, unit.uId));
                    }
                }

            })
            Promise.all(arrPromise).then(() => {
                // 移除阵容里已经不存在的实体
                this.getUnitEntityMap().forEach((battleUnit, uId) => {
                    if (!arrHasUID.includes(uId)) {
                        this.removeUnitData(uId);
                    }
                })
                this.mapCom.refreshGridOccupy();
                this.updateAllNodesSortOrder();
            })
        }

        // 初始化英雄列表信息
        this.updateHeroList();
        // 初始化士兵信息
        this.updateSoldierList();

        this.lb_team.string = lang(160, { teamId: this.Mgr.curBattleArrId });

    }
    // 更新统御信息
    private updateCommand() {
        var arrHeros = this.Mgr.getCurBattleHero();
        this.lb_command.string = `${this.Mgr.getNeedCommand(this.Mgr.getCurBattleSoldier())}/${this.Mgr.getCommand(arrHeros)}`;//lang(158, { command: `${this.Mgr.getNeedCommand(this.Mgr.getCurBattleSoldier())}/${this.Mgr.getCommand(arrHeros)}` });
    }
    // 当前统御最大值
    private getCurTeamMaxCommand() {
        var arrHeros = this.Mgr.getCurBattleHero();
        return this.Mgr.getCommand(arrHeros);
    }
    // 初始化英雄列表信息
    private updateHeroList() {
        var arrHeros = this.Mgr.getCurBattleHero();
        var numHero = arrHeros.length;
        var max = ConfigMgr.instance.getParam(ParamDefined.HERO_BATTLE_MAX, ParamValueType.INT)[0];
        for (let i = 0; i < max; i++) {
            if (i >= arrHeros.length) {
                arrHeros.push(null);
            }
        }
        this.listHero.updateList(arrHeros, HeroFightIcon);
        this.lb_heroNum.string = lang(161, { num: `${numHero}/${max}` })

        this.lb_team.string = lang(160, { teamId: this.Mgr.curBattleArrId });
        this.updateCommand();
    }
    // 初始化士兵信息
    private updateSoldierList() {
        var menuFilterSelectIndex = this.Menu.selectIndex;
        var arrSoldiers = this.Mgr.soldierList.filter(soldier => {
            return menuFilterSelectIndex == 0 || ConfigMgr.instance.UnitData.get(soldier.unitId)?.faction_id == menuFilterSelectIndex;
        });

        arrSoldiers.forEach(soldier => {
            soldier.isInTeam = this.Mgr.checkIsInTeamByUnitId(soldier.uId);
        })
        arrSoldiers.sort((a, b) => {
            var sortA = (a.isInTeam ? 100000000 : 0) + this.getSoldierRankValue(a);
            var sortB = (b.isInTeam ? 100000000 : 0) + this.getSoldierRankValue(b);
            return sortA > sortB ? -1 : 1;
        })
        this.listSoldier.updateList(arrSoldiers, SoldierIcon, SCROLL_HORIZONTAL);
        this.updateCommand();
    }
    /**士兵排名分值：稀有度高的在前，同稀有度按配置ID */
    private getSoldierRankValue(soldier: SoldierIconData) {
        return ConfigMgr.instance.UnitData.get(soldier.unitId).rarity_id * 1000000 + soldier.unitId;
    }
    public get Mgr() {
        return PVEMgr.getInstance();
    }
    /**
* 更新所有节点的层级排序（按类型优先级和Y坐标排序）
* 优先级高的类型显示在前面，同优先级下按Y坐标排序
*/
    public updateAllNodesSortOrder() {
        const nodes = this.UnitContainer.children
            .map(node => ({ node, y: node.position.y }))
            .sort((a, b) => b.y - a.y);

        nodes.forEach((item, index) => item.node.setSiblingIndex(index));
    }
    /**创建单位实体 */
    public async CreateBattleUnit(battleData: BattleUnitData, uId: number) {
        return new Promise<BattleUnit>(resolve => {
            //创建战斗单位并赋值
            AssetMgr.createPrefabFromPool(GameUrl.Battle_Prefab.format("BattleUnit"), Vec2.ZERO, this.UnitContainer, BattleUnit).then((battleUnit) => {
                //设置服务器数据并设置位置和默认动作（待机）
                this.addUnitData(uId, battleUnit);
                battleUnit.SetData(battleData).then(() => {
                    battleUnit.SetMapGridPos(battleData.pos);
                    battleUnit.PlayAction(UNIT_ACTION.IDLE, true);
                    resolve(battleUnit);
                })
            });

        });
    }

    public clear(): void {
        this.endDragFunc();
        super.clear();
        this.getUnitEntityMap().forEach(unit => {
            AssetMgr.removeNode(unit.node);
        })
        this.Mgr.clearUnitEntity();
        var mapMgr = BattleMapMgr.getInstance();
        mapMgr.clearMap();
        this.closeSoldierDetail();
    }
    /**当前布阵实体表 */
    public getUnitEntityMap() {
        return this.Mgr.getUnitEntityMap();
    }
    private onClickFight() {
        if (this.Mgr.getNeedCommand(this.Mgr.getCurBattleSoldier()) > this.getCurTeamMaxCommand()) {
            UIMananger.instance.showFlyNotice(lang(181))
            return;
        }
        this.closeWin();
        var orderCfg = PVEMgr.getInstance().curStage;
        var mapData = ConfigTools.instance.getStageMapDataByChapterAndOrder(orderCfg.chapter, orderCfg.order);
        if (mapData) {
            UIMananger.instance.showWin(WildMapWin, mapData.scene);
        }
    }
    public addUnitData(uId: number, battleUnit: BattleUnit) {
        this.Mgr.addUnitEntity(uId, battleUnit);
    }
    public removeUnitData(uId: number) {
        var battleUnit = this.Mgr.removeUnitEntity(uId);
        if (battleUnit) {
            AssetMgr.removeNode(battleUnit.node);
        }
    }

    // 选中士兵
    private onBeginSelectSoldier(soldierCell: SoldierIcon) {
        if (this._curSelectSoldierIcon === soldierCell) {
            return;
        }
        if (this._curSelectSoldierIcon) {
            this._curSelectSoldierIcon.setSelected(false);
        }
        this._curSelectSoldierIcon = soldierCell;

        var uId = soldierCell.getData().uId

        // 选中当前士兵如果上阵了就调整上阵数量

        var battleUnit = this.Mgr.getUnitEntity(uId)
        if (battleUnit) {
            this.showSoldierDetail(uId, battleUnit.GetData().soidierNum)
        } else {

            // 当前选中的士兵格子，选中后需要闪烁可布阵的格子
            this.mapCom.flashCanEmployGrid();
        }

    }
    /**显示士兵详情页 */
    private showSoldierDetail(uId: number, selectNum: number) {
        if (this._curSelectSoldierUID) {
            (this.mapCom.getGridCellByOccupyUID(this._curSelectSoldierUID.toString()) as FightPrepareGridCell)?.stopBreath();
        }
        this._curSelectSoldierUID = uId;
        var battleUnit = this.Mgr.getUnitEntity(uId);
        if (battleUnit) {
            (this.mapCom.getGridCellByOccupyUID(uId.toString()) as FightPrepareGridCell).startBreath();
            this.SoldierDetail.active = true;
            this.soldierListLayer.active = !this.SoldierDetail.active;
            var battleData = battleUnit.GetData();
            var unitCfg = ConfigMgr.instance.UnitData.get(battleData.Id);
            if (unitCfg) {
                var maxComman = this.getCurTeamMaxCommand();
                var left = maxComman - this.Mgr.getNeedCommand(this.Mgr.getCurBattleSoldier());
                var max = Math.floor(left / unitCfg.need_bonus) + selectNum;
                this.lb_selectSoldierName.string = lang(unitCfg.name);
                // var maxSoldierNum = this.Mgr.getSoldierNum(uId);
                // this.lb_selectSoldierNum.string = lang(162, { num: this.Mgr.getSoldierNum(uId) });
                this.lb_selectSoldierCommand.string = unitCfg.need_bonus.toString();//lang(163, { num: unitCfg.need_bonus });

                this.slider_input.setSlider({
                    init_value: selectNum,
                    min_value: 1, max_value: max, btn_step: 1, value_step: { step: 1 }, on_value_changed: (soldierNum: number, before: number) => {
                        var battleUnit = this.Mgr.getUnitEntity(uId);

                        if (battleUnit) {
                            battleUnit.updateSoldierNum(soldierNum);
                            this.Mgr.addUnitInCurBattleArray({ uId: this._curSelectSoldierUID, num: soldierNum, pos: battleUnit.GetMapPos(), unitId: battleUnit.GetData().Id })
                            this.updateCommand();
                        }
                        // this.lb_command.string = lang(158, { command: `${this.Mgr.getNeedCommand(this.Mgr.getCurBattleSoldier())}/${maxComman}` });
                    }
                })
                // this.lb_minSolder.string = this.slider_input.getParam().min_value.toString();
                // this.lb_maxSolder.string = this.slider_input.getParam().max_value.toString();
                this.selectSoilderIcon.setData({ uId: uId, unitId: battleData.Id, num: this.Mgr.getSoldierNum(uId), lv: this.Mgr.getSoldierLv(uId) })

            }
        }
    }
    // 确认上阵
    private onClickConfirmSoldier() {
        if (this._curSelectSoldierUID) {
            var battleUnit = this.Mgr.getUnitEntity(this._curSelectSoldierUID);
            var soldierNum = this.slider_input.getValue();
            if (battleUnit) {
                battleUnit.updateSoldierNum(soldierNum);
                this.Mgr.addUnitInCurBattleArray({ uId: this._curSelectSoldierUID, num: soldierNum, pos: battleUnit.GetMapPos(), unitId: battleUnit.GetData().Id })
                this.updateCommand();
            }
        }
        this.closeSoldierDetail();
    }
    // 取消上阵
    private onClickDeleteSoldier() {
        if (this._curSelectSoldierUID) {
            this.onDeleteUnit(this._curSelectSoldierUID)
        }
        this.closeSoldierDetail();
    }
    private closeSoldierDetail() {
        this.SoldierDetail.active = false;
        this.soldierListLayer.active = !this.SoldierDetail.active;
        this.clearSelectSoldier();
    }
    private onClickMax() {
        if (this._curSelectSoldierUID) {
            var battleUnit = this.Mgr.getUnitEntity(this._curSelectSoldierUID);
            if (battleUnit) {
                this.slider_input.setValue(this.slider_input.getParam().max_value);
            }
        }
    }

    /**取消士兵选中状态 */
    private clearSelectSoldier() {
        if (this._curSelectSoldierUID) {
            (this.mapCom.getGridCellByOccupyUID(this._curSelectSoldierUID.toString()) as FightPrepareGridCell)?.stopBreath();
        }
        if (this._curSelectSoldierIcon) {
            this._curSelectSoldierIcon.setSelected(false);
            this._curSelectSoldierIcon = null;
        }
        this.mapCom.cancleFlash();
    }
    // 选中士兵后点击地图格子选择士兵上阵到地图位置
    private async onClickSelectGrid(gridData: HexagonData) {
        if (!this._curSelectSoldierIcon) {
            // 视为选中当前格子士兵，触发显示士兵详情页
            let uId = Number(gridData.occupiedUnitId)
            if (uId) {
                this.showSoldierDetail(uId, this.Mgr.getUnitEntity(uId).GetData().soidierNum);
            }
            return;
        }
        var soldierData = this._curSelectSoldierIcon.getData();
        var soldierNum = await this.dropUnit(soldierData.uId, soldierData.unitId, gridData);
        if (soldierNum > 0) {
            this.clearSelectSoldier();
            this.showSoldierDetail(soldierData.uId, soldierNum)
        } else {
            UIMananger.instance.showFlyNotice(lang(159))
        }
    }
    /**
     * 把单位放到格子上，统一处理上阵/交换/下阵
     * @returns 是否发生了有效操作(最大士兵数量)
     */
    private async dropUnit(uId: number, unitId: number, gridData: HexagonData): Promise<number> {
        // 拖到地图外/非格子：直接下阵
        if (!gridData) {
            this.deleteUnit(uId);
            return -1;
        }
        var isMaxUnit = this.Mgr.getCurTeamSoldierUnitNum() >= ConfigMgr.instance.getParam(ParamDefined.BATTLE_SOLDIER_UNIT_MAX, ParamValueType.INT)[0];

        var occupied = gridData.getOccupiedUnit();
        var occupiedUId = occupied != null ? Number(occupied) : -1;
        var isInteam = this.Mgr.checkIsInTeamByUnitId(uId);
        var bolReplace = false;
        if (occupiedUId >= 0 && occupiedUId != uId) {
            // 两个都已上阵的单位互换位置
            if (isInteam && this.Mgr.checkIsInTeamByUnitId(occupiedUId)) {
                this.swapUnitPos(uId, occupiedUId);
                return this.Mgr.getUnitEntity(Number(occupied))?.GetData()?.soidierNum;
            } else if (!isInteam) {
                // 可以直接替换已有单位
                // 1.先移除当前格子的单位
                this.deleteUnit(occupiedUId);
                bolReplace = true;
            }
            else {
                return 0;
            }
        }
        if (!gridData.isDeployment) {
            // 非布阵格子：下阵
            this.deleteUnit(uId);
            return 0;
        }
        if (isInteam) {
            var resultMax = this.Mgr.getUnitEntity(Number(uId))?.GetData()?.soidierNum;
            await this.placeUnit(uId, unitId, gridData, resultMax);
            return resultMax;
        }
        if (!isMaxUnit || bolReplace) {

            var resultMax = this.getDefaultDeployNum(uId, unitId);
            if (resultMax > 0) {
                await this.placeUnit(uId, unitId, gridData, resultMax);
            }
            return resultMax;
        }
        return 0;
    }
    /**
     * 上阵默认数量：按当前最大统御的1/5算建议数量，再受剩余统御和库存限制
     * 均分额度不够1个兵、但剩余统御还带得动时，至少上1个；剩余统御连1个都带不了返回0
     */
    private getDefaultDeployNum(uId: number, unitId: number) {
        var bonus = this.Mgr.getCommandByUnitId(unitId);
        var left = this.getCurTeamMaxCommand() - this.Mgr.getNeedCommand(this.Mgr.getCurBattleSoldier());
        if (!bonus || left < bonus) {
            return 0;
        }
        var suggestNum = Math.floor(this.getCurTeamMaxCommand() / ONE_KEY_SOLDIER_NUM / bonus);
        return Math.max(1, Math.min(suggestNum, Math.floor(left / bonus), this.Mgr.getSoldierNum(uId)));
    }
    /**上阵/移动单位到指定格子 */
    private async placeUnit(uId: number, unitId: number, gridData: HexagonData, num: number) {
        // 格子坐标要拷贝，避免实体设置位置时污染格子数据
        var pos = { q: gridData.pos.q, r: gridData.pos.r };
        var battleUnit = this.Mgr.getUnitEntity(uId);
        if (battleUnit) {
            battleUnit.SetMapGridPos(pos);
        } else {
            var battleUnitData = PoolMgr.get(BattleUnitData);
            battleUnitData.SetData(ConfigTools.instance.getUnitAttrCfgByUnitID(unitId), this.Mgr.getSoldierLv(uId), 1, num, { q: pos.q, r: pos.r });
            battleUnit = await this.CreateBattleUnit(battleUnitData, uId);
            // this.showSoldierDetail(uId);
        }
        this.Mgr.addUnitInCurBattleArray({ uId: uId, unitId: unitId, pos: pos, num: num });
        this.mapCom.refreshGridOccupy();
        this.updateAllNodesSortOrder();
        this.updateSoldierList();
    }
    /**交换两个已上阵单位的位置 */
    private swapUnitPos(uIdA: number, uIdB: number) {
        if (!this.Mgr.swapUnitPos(uIdA, uIdB)) {
            return;
        }
        var arr = this.Mgr.getCurBattleArray();
        var dataA = arr.get(uIdA);
        var dataB = arr.get(uIdB);
        var unitA = this.Mgr.getUnitEntity(uIdA);
        var unitB = this.Mgr.getUnitEntity(uIdB);
        if (unitA && dataA.pos) {
            unitA.SetMapGridPos({ q: dataA.pos.q, r: dataA.pos.r });
        }
        if (unitB && dataB.pos) {
            unitB.SetMapGridPos({ q: dataB.pos.q, r: dataB.pos.r });
        }
        this.mapCom.refreshGridOccupy();
        this.updateAllNodesSortOrder();
    }
    /**单位下阵 */
    private deleteUnit(uId: number) {
        if (!this.Mgr.checkIsInTeamByUnitId(uId)) {
            return;
        }
        this.Mgr.deleteUnitInCurBattleArray(uId);
        this.removeUnitData(uId);
        if (this._curSelectSoldierUID == uId) {
            this.closeSoldierDetail()
        }
        this.mapCom.refreshGridOccupy();
        this.OnUpdateInfo();
    }

    // ==================== 列表拖拽上阵 ====================
    // 拖拽会话，用于处理实体创建完成前手指已经抬起的情况
    private _dragSession: number = 0;
    // 当前拖拽的士兵uId
    private _dragUnitUId: number = -1;
    // 当前拖拽的士兵配置ID
    private _dragUnitId: number = -1;

    private async onBeginDrag(data: SoldierIconData, dragBeginPos: Vec3) {
        var session = ++this._dragSession;
        this._dragUnitUId = data.uId;
        this._dragUnitId = data.unitId;
        // this.Mgr.isDragingUnit = true;
        // 拖拽期间禁用列表滚动
        this.listSoldier.enabled = false;
        // 可布阵格子闪烁提示
        this.mapCom.flashCanEmployGrid();

        var battleUnitData = PoolMgr.get(BattleUnitData);
        battleUnitData.SetData(ConfigTools.instance.getUnitAttrCfgByUnitID(data.unitId), data.lv, 1, 0, { q: 0, r: 0 });

        this.dragArea.active = true;
        // 监听挂在窗口根节点上并用捕获阶段：手指按在列表项上时，触摸被列表项认领，
        // 全局 input 和冒泡都收不到，只有从根向下的捕获能稳定拿到 MOVE/END
        this.node.on(NodeEventType.TOUCH_MOVE, this.onDragUnitMove, this, true);
        this.node.on(NodeEventType.TOUCH_END, this.onEndDragUnit, this, true);
        this.node.on(NodeEventType.TOUCH_CANCEL, this.onCancleDrag, this, true);

        var dragUnit = await AssetMgr.createPrefabFromPool(GameUrl.Battle_Prefab.format("BattleUnit"), dragBeginPos.toVec2(), this.dragArea, BattleUnit, true);
        if (session != this._dragSession) {
            // 加载期间拖拽已经结束
            if (dragUnit && dragUnit.node && dragUnit.node.isValid) {
                AssetMgr.removeNode(dragUnit.node);
            }
            PoolMgr.put(battleUnitData);
            return;
        }
        if (!dragUnit || !dragUnit.node || !dragUnit.node.isValid) {
            PoolMgr.put(battleUnitData);
            this.endDragFunc();
            return;
        }
        this._battleDragUnit = dragUnit;
        this._battleDragUnit.node.setSiblingIndex(this.dragArea.children.length - 1);
        this._battleDragUnit.SetWorldPos(dragBeginPos);
        await this._battleDragUnit.SetData(battleUnitData);
        // 加载期间拖拽已经结束（endDragFunc 里已经回收并置空了）
        if (session != this._dragSession || !this._battleDragUnit || !this._battleDragUnit.node.isValid) {
            return;
        }

        this._battleDragUnit.PlayAction(UNIT_ACTION.IDLE, true);
        this.updateDragUnitPos(dragBeginPos);
    }
    // 拖动单位
    private onDragUnitMove(event: EventTouch) {
        if (!this._battleDragUnit) {
            return;
        }
        var uiPos = event.getUILocation();
        // 拖拽单位跟随手指
        this.updateDragUnitPos(uiPos);
        // 移动的时候经过的格子高亮显示
        this.mapCom.cancleFlash();
        var cell = this.mapCom.getGridCellByUILocation(uiPos);
        this.mapCom.showDragHover(cell, this._dragUnitUId);
    }
    /**把拖拽单位摆到指定UI坐标 */
    private updateDragUnitPos(uiPos: Vec2 | Vec3) {
        if (!this._battleDragUnit) {
            return;
        }
        var areaTrans = this.dragArea.getComponent(UITransform);
        if (!areaTrans) {
            return;
        }
        var localPos = areaTrans.convertToNodeSpaceAR(new Vec3(uiPos.x, uiPos.y, 0));
        this._battleDragUnit.node.setPosition(localPos);
    }
    private async onEndDragUnit(event: EventTouch) {
        await this.finishDragUnit(event);
    }
    /**松手位置不在列表项上时引擎会派发 CANCEL，落点判定和 END 一样 */
    private async onCancleDrag(event: EventTouch) {
        await this.finishDragUnit(event);
    }
    /**结束列表拖拽并把单位落到松手位置 */
    private async finishDragUnit(event: EventTouch) {
        var uiPos = event ? event.getUILocation() : null;
        var cell = uiPos ? this.mapCom.getGridCellByUILocation(uiPos) : null;
        var uId = this._dragUnitUId;
        var unitId = this._dragUnitId;
        this.endDragFunc();
        if (unitId < 0 || uId < 0) {
            return;
        }
        // 拖到地图外或非布阵格子直接下阵；没上阵的单位不会有实际变化
        var maxSoldierNum = await this.dropUnit(uId, unitId, cell ? cell.GetData() : null)
        if (maxSoldierNum == 0) {
            var isMaxUnit = this.Mgr.getCurTeamSoldierUnitNum() >= ConfigMgr.instance.getParam(ParamDefined.BATTLE_SOLDIER_UNIT_MAX, ParamValueType.INT)[0];

            UIMananger.instance.showFlyNotice(lang(isMaxUnit ? 182 : 159))

        } else {
            this.showSoldierDetail(uId, maxSoldierNum);
        }
        this.clearSelectSoldier();
    }
    private endDragFunc() {
        this._dragSession++;
        this.node.off(NodeEventType.TOUCH_MOVE, this.onDragUnitMove, this, true);
        this.node.off(NodeEventType.TOUCH_END, this.onEndDragUnit, this, true);
        this.node.off(NodeEventType.TOUCH_CANCEL, this.onCancleDrag, this, true);
        if (this._battleDragUnit && this._battleDragUnit.node && this._battleDragUnit.node.isValid) {
            AssetMgr.removeNode(this._battleDragUnit.node);
        }
        this._battleDragUnit = null;
        this._dragUnitUId = -1;
        this._dragUnitId = -1;
        if (this.listSoldier) {
            this.listSoldier.enabled = true;
        }
        if (this.mapCom) {
            this.mapCom.cancleFlash();
            this.mapCom.clearDragHover();
        }
        // 这里用的是根节点捕获阶段，会比 SoldierIcon 自己的点击回调先执行，
        // 延后一帧复位，让同一次抬手的点击回调还能读到“拖拽中”而跳过选中
        this.scheduleOnce(() => {
            this.Mgr.isDragingUnit = false;
        });
        if (this.dragArea) {
            this.dragArea.active = false;
        }
    }

    // ==================== 地图内拖拽回调 ====================
    /**地图上的单位拖到格子上 */
    private onDragUnitDrop(uId: number, gridData: HexagonData) {
        if (this._curSelectSoldierUID) {
            (this.mapCom.getGridCellByOccupyUID(this._curSelectSoldierUID.toString()) as FightPrepareGridCell)?.stopBreath();
        }
        var data = this.Mgr.getCurBattleArray()?.get(uId);
        if (!data) {
            return;
        }
        this.dropUnit(uId, data.unitId, gridData).then(soldierMaxNum => {
            // 拖拽被拒绝时把单位放回原位
            if (soldierMaxNum <= 0) {
                this.mapCom.resetUnitPos(uId);
                UIMananger.instance.showFlyNotice(lang(159))
            }
            else if (this._curSelectSoldierUID == uId && this.SoldierDetail.active) {
                (this.mapCom.getGridCellByOccupyUID(uId.toString()) as FightPrepareGridCell)?.startBreath();
            }
        });
    }
    /**地图上的单位拖出地图/拖到非布阵格子 */
    private onDeleteUnit(uId: number) {
        this.deleteUnit(uId);
    }
    /**打开编队 */
    private onClickTeam() {
        UIMananger.instance.showWin(PVETeamCtrlWin);
    }
    /**一键上阵 */
    private onClickOneKey() {
        //按照当前最大统御值平均分成5份分别分配给士兵列表（不受过滤影响）按照排名前5的士兵，并保存当前阵容
        var maxCommand = this.getCurTeamMaxCommand();
        var shareCommand = maxCommand / ONE_KEY_SOLDIER_NUM;
        var grids = this.getOneKeyDeployGrids();
        // 英雄不占格子原样保留，士兵全部重新分配
        var newBattleArr = new Map<number, BattleTeamData>();
        this.Mgr.getCurBattleArray()?.forEach(data => {
            if (this.Mgr.checkIsHero(data.uId)) {
                newBattleArr.set(data.uId, data);
            }
        })
        var soldiers = this.Mgr.soldierList.slice().sort((a, b) => this.getSoldierRankValue(b) - this.getSoldierRankValue(a));
        var deployList: BattleTeamData[] = [];
        for (let i = 0; i < soldiers.length && deployList.length < ONE_KEY_SOLDIER_NUM && deployList.length < grids.length; i++) {
            var soldier = soldiers[i];
            var num = Math.min(Math.floor(shareCommand / this.Mgr.getCommandByUnitId(soldier.unitId)), this.Mgr.getSoldierNum(soldier.uId));
            // 一份统御连1个兵都带不了就顺延给下一名
            if (num <= 0) {
                continue;
            }
            var grid = grids[deployList.length];
            var data: BattleTeamData = { uId: soldier.uId, unitId: soldier.unitId, num: num, pos: { q: grid.q, r: grid.r } };
            newBattleArr.set(soldier.uId, data);
            deployList.push(data);
        }
        if (deployList.length == 0) {
            UIMananger.instance.showFlyNotice(lang(159));
            return;
        }
        // 平均分之后剩下的统御值再补给上阵士兵
        this.distributeLeftCommand(deployList, maxCommand);
        this.closeSoldierDetail();
        this.clearSelectSoldier();
        this.Mgr.saveCurrBattleArray(newBattleArr);
        this.OnUpdateInfo();
    }
    /**二次分配：把平均分成5份后剩下的统御值按排名顺序继续补给上阵士兵，补到各自持有上限为止 */
    private distributeLeftCommand(deployList: BattleTeamData[], maxCommand: number) {
        var left = maxCommand;
        deployList.forEach(data => left -= data.num * this.Mgr.getCommandByUnitId(data.unitId));
        deployList.forEach(data => {
            var bonus = this.Mgr.getCommandByUnitId(data.unitId);
            if (bonus <= 0) {
                return;
            }
            // 剩余统御够几个兵就补几个，不超过持有上限
            var add = Math.min(this.Mgr.getSoldierNum(data.uId) - data.num, Math.floor(left / bonus));
            if (add > 0) {
                data.num += add;
                left -= add * bonus;
            }
        })
    }
    /**一键上阵用的布阵格子：q 小的列优先（第一列先上），同一列里从列中心往两边排 */
    /**一键上阵用的布阵格子：q 小的列优先（第一列先上），同一列里从列中心往两边排 */
    private getOneKeyDeployGrids() {
        var columns = new Map<number, HexagonData[]>();
        var mgr = BattleMapMgr.getInstance();
        var posList = [[0, 0], [0, 2], [0, 4], [0, 6], [0, 8],]
        var result: HexagonData[] = [];
        posList.forEach(grid => {
            result.push(mgr.getHexData(grid[0], grid[1]))
        })

        return result;
    }
}


