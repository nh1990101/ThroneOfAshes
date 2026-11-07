import { _decorator, Camera, Component, Node, Vec2, Vec3, UITransform, EventTouch, Input, Graphics, Label, Color, v2, Line, v3 } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { MapMgr } from './MapMgr';
import { child, comp } from '../../Common/Decorator';
import { WildRole } from './WildRole';
import { AssetMgr } from '../../Common/AssetMgr';
import { GameUrl } from '../../Common/GameUrl';
import { GameEvent, ParamDefined, ParamValueType, ROLE_DIR } from '../../Common/GameEnum';
import { MapConfig } from './MapConfig';
import { MapBlock } from './MapBlock';
import { MapGridData } from './MapGridData';
import { RectPathFindingMgr } from './RectPathFindingMgr';
import { MapObject } from './MapObject';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { UIMananger } from '../../Component/UIMananger';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { GuideArrow } from './GuideArrow';
import { Tools } from '../../Common/Tools';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { FogOfWar } from './FogOfWar';
import { WildMapCom } from './WildMapCom';
import { GameCamera } from './GameCamera';
import { GameRole } from './GameRole';
import { EventManager } from '../../Common/EventManager';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { lang, LangMgr } from '../../Common/LangMgr';
import { MapObjUserData } from './Data/MapObjUserData';
import { GlobalData } from '../../Common/GlobalData';
import { ConfigTools } from '../../Config/ConfigTools';
import { BattleWin } from '../Battle/BattleWin';
import { BagWin } from '../Bag/BagWin';
import { PVEMgr } from '../PVE/PVEMgr';
const { ccclass, property } = _decorator;

@ccclass('WildMapWin')
export class WildMapWin extends BaseWin {

    @child()
    objectContainer: Node = null!;

    @comp(FogOfWar)
    frog: FogOfWar = null!;


    @comp(BaseBtn)
    btn_ShowGridPos: BaseBtn = null!;
    @comp(BaseBtn)
    btn_BackCity: BaseBtn = null!;


    @child()
    GuideContainer: Node = null!;

    @comp(BaseSprite)
    targetPoint: BaseSprite = null!;

    @comp(BaseLabel)
    lb_Energy: BaseLabel = null!;

    @comp(BaseLabel)
    lb_rolePos: BaseLabel = null!;

    @comp(BaseLabel)
    lb_touchPos: BaseLabel = null!;

    @comp(BaseBtn)
    btn_HideFrog: BaseBtn = null!;

    @comp(WildMapCom)
    mapCom: WildMapCom = null!;

    @comp(GameCamera)
    gameCamera: GameCamera = null!;

    @comp(BaseLabel)
    lb_discorverRate: BaseLabel = null!;

    @comp(BaseBtn)
    btn_bag: BaseBtn = null!;
    @comp(BaseLabel)
    lb_mapName: BaseLabel = null!;

    /**场景ID */
    protected mapId: number = null;
    protected role: GameRole = null;
    protected mapCfg: MapConfig;

    /**寻路管理器 */
    private pathFindingMgr: RectPathFindingMgr = new RectPathFindingMgr();
    private guideArrows: GuideArrow[] = [];
    /**移动路线第几格*/
    private _moveCurStep = 0;
    private _checkFromGrid: MapGridData;//路线展示的起始格子
    private _checkTargetGrid: MapGridData;//路线展示的目标格子


    /**移动方式0：点一下动一下，1：点哪去哪并且有路线预览 */
    private _MoveStype = 0;

    //是否全屏
    public get Is_FullScene() {
        return true;
    }
    showWin(mapId: number): void {
        this.mapId = mapId;
        super.showWin(mapId);
    }
    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.btn_ShowGridPos.node, Node.EventType.TOUCH_END, this.OnClickShowGridPos, this);
        this.addNodeEvent(this.btn_BackCity.node, Node.EventType.TOUCH_END, this.OnClickBackCity, this);
        this.addNodeEvent(this.btn_HideFrog.node, Node.EventType.TOUCH_END, this.OnClickHideFrog, this);
        this.addNodeEvent(this.btn_bag.node, Node.EventType.TOUCH_END, this.OnClickBag, this);

        this.addEvent(GameEvent.MapClick, this.onMapClick, this);
        this.addEvent(GameEvent.Finish_Move_Step, this.OnMoveStepOneFinish, this);
        this.addEvent(GameEvent.MapObject_Touch, this.OnTouchMapObject, this);
        this.addEvent(GameEvent.UpdateEnergy, this.onUpdateEnergy, this);
        this.addEvent(GameEvent.UpdateMapDiscover, this.onUpdateMapDiscover, this);

    }
    public OnRefreshUI(): void {
        super.OnRefreshUI();
        GlobalData.wildData.surferFightStep = 0;

        this.Mgr.LoadMap(this.mapId).then(() => this.initMap());
    }
    initFrog(mapWidthPx: number, mapHeightPx: number) {
        this.frog.fogEnabled = true;

        // 每次都 init：命中缓存则逐像素恢复该地图上次的迷雾，未命中则按本次地图尺寸建全黑
        const restored = this.frog.init(this.mapId, this.mapCom.node.parent, mapWidthPx, mapHeightPx);

        // 只有没缓存时才用走过的格子补雾——重放出来是一格格的中心点，雾边是散的；
        // 有缓存的话像素级状态已经完整，补一遍纯属浪费
        if (restored) return;

        var watchArea = ConfigMgr.instance.getParam(ParamDefined.WATCH_AREA, ParamValueType.FLOAT)[0];
        var movePoints = GlobalData.wildData.getMovePoints(this.mapId);
        movePoints.forEach(point => {
            var grid = this.Mgr.getGrid(point.x, point.y);
            if (!grid) return;
            this.frog.StampRevealAt(grid.GetWorldPos().toVec3(), watchArea, watchArea);
        });
    }
    initMap() {
        // 创建格子数据
        this.Mgr.createGridData();

        this.mapCfg = MapMgr.getInstance().getMapCfg();

        this.Mgr.initMapReferences(this.mapCom.node);
        this.mapCom.SetObjectContainer(this.objectContainer);

        // 初始化格子大小
        MapGridData.WIDTH_PX = this.mapCfg.GetGridWidthPx();
        MapGridData.HEIGHT_PX = this.mapCfg.GetGridHeightPx();
        console.log(`[WildMapWin] MapGridData 格子尺寸初始化: ${MapGridData.WIDTH_PX} x ${MapGridData.HEIGHT_PX}`);

        // 设置 mapContainer 的尺寸为实际地图大小
        const mapInfo = this.mapCfg.config.mapInfo;

        console.log(`[WildMapWin] 设置 mapContainer 尺寸: ${mapInfo.mapPixelWidth} x ${mapInfo.mapPixelHeight}`);
        this.gameCamera.UpdateCameraBounds(mapInfo.mapPixelWidth, mapInfo.mapPixelHeight);
        // 初始化迷雾
        this.initFrog(mapInfo.mapPixelWidth, mapInfo.mapPixelHeight)

        // 初始化寻路系统
        this.pathFindingMgr.UpdateMapGrid(MapMgr.getInstance().getAllGridsMap());
        this.pathFindingMgr.setDirectionMode(false); // 使用4方向寻路
        // 初始化角色
        this.initRolePos();
        // 创建地图块
        this.mapCom.createMapBock(this.mapCfg);
        // this.mapMask.getComponent(UITransform).setContentSize(this.mapCom.getComponent(UITransform).contentSize);

        var uiTrans = this.targetPoint.getComponent(UITransform);
        uiTrans.width = this.mapCfg.config.mapInfo.gridWidth;
        uiTrans.height = this.mapCfg.config.mapInfo.gridHeight;
        this.targetPoint.node.active = false;

        var stageCg = PVEMgr.getInstance().curStage;
        if (stageCg) {
            this.lb_mapName.string = lang(stageCg.name);
        }
    }


    /**初始化角色位置 */
    async initRolePos() {
        // 获取出生点
        const spawnPoint = GlobalData.wildData.getRolePos() || this.mapCfg.config.spawnPoints?.[0] || { x: 5, y: 5 };

        const worldPos = this.Mgr.getGrid(spawnPoint.x, spawnPoint.y).GetWorldPos();

        console.log(`[WildMapWin] 角色出生点格子坐标: (${spawnPoint.x}, ${spawnPoint.y})`);

        this.role = await AssetMgr.createPrefabFromPool(
            GameUrl.WildMapPrefab.format("WildRole"),
            worldPos,
            this.objectContainer,
            GameRole
        );

        await this.role.LoadAndPlay(1, GlobalData.wildData.myRoleDir ?? ROLE_DIR.DOWN);


        // 设置角色所在格子
        const startGrid = this.Mgr.getGrid(spawnPoint.x, spawnPoint.y);
        if (startGrid) {
            this.role.setGrid(startGrid);
        }

        GameCamera.instance.setFollowTarget(this.role.node);
        this.gameCamera.updateCameraPos(true);

        console.log(`[WildMapWin] 摄像机初始位置: (${this.gameCamera.node.position.x}, ${this.gameCamera.node.position.y})`);

        // 让迷雾跟随玩家
        var watchArea = ConfigMgr.instance.getParam(ParamDefined.WATCH_AREA, ParamValueType.FLOAT)[0];
        this.frog.addRevealer(this.role.node, watchArea, watchArea);

        this.mapCom.updateAllNodesSortOrder();

        this.updateRolePosInfo();

        this.onUpdateMapDiscover();
        this.onUpdateEnergy();
        EventManager.Instance.dispatch(GameEvent.UpdateMapBlock);
    }
    private updateRolePosInfo() {
        this.lb_rolePos.setText(this.role.getCurrentGrid().toString());
    }
    private updateTouchePosInfo(targetGrid: MapGridData) {
        this.lb_touchPos.setText(targetGrid.toString());
    }

    /**
     * 地图点击处理
     */
    private onMapClick(event: EventTouch) {
        if (this.role.getIsMoving()) {
            console.log('[WildMapWin] 角色正在移动中');
            return;
        }

        // 获取屏幕坐标并转换为格子数据
        const screenPos = event.getLocation();
        const targetGrid = MapMgr.getInstance().screenPosToGrid(screenPos);

        var resultGrid = targetGrid;

        if (this._MoveStype == 0) {
            var rolePos = this.role.getCurrentGrid();
            if (!rolePos || rolePos.equals(targetGrid)) {
                console.log('[WildMapWin] 点击了自己格子');
                return;
            }
            var dir = MapGridData.calculateDirection4(rolePos, targetGrid);

            var gridPos = rolePos.getNeighbors4()[dir / 2];
            resultGrid = this.Mgr.getGrid(gridPos.x, gridPos.y);
        }

        this.updateTouchePosInfo(targetGrid);

        this.FindPathMove(resultGrid, 1, this._MoveStype != 0,);
    }

    private FindPathMove(targetGrid: MapGridData, findStep: number = 1, isIgnorOccupy: boolean = this._MoveStype != 0) {
        if (!targetGrid) {
            console.warn('[WildMapWin] 点击位置不在地图范围内');
            return;
        }

        // if (!targetGrid.walkable) {
        //     console.warn('[WildMapWin] 目标格子不可行走');
        //     return;
        // }

        // if (targetGrid.occupied) {
        //     console.warn('[WildMapWin] 目标格子已被占据');
        //     return;
        // }

        // 寻路
        const currentGrid = this.role.getCurrentGrid();
        if (!currentGrid) {
            console.warn('[WildMapWin] 角色当前格子无效');
            return;
        }
        const path = this.pathFindingMgr.findPath(currentGrid, targetGrid, isIgnorOccupy, false);
        if (path.length === 0) {
            console.warn('[WildMapWin] 无法找到路径');
            var needPath = this.pathFindingMgr.findPath(currentGrid, targetGrid, isIgnorOccupy, true);
            if (needPath.length > 1) {
                var resultGrid = needPath[1];
                var noticeDir = MapGridData.calculateDirection4(currentGrid, resultGrid) / 2;
                var noticeContent = lang(13, { dir: lang(14 + noticeDir) });
                UIMananger.instance.showFlyNotice(noticeContent);
            }
            return;
        }

        //裁剪路径至步数数量
        var filterPaths = [];
        var len = this._MoveStype == 0 ? Math.min(findStep + 1, path.length) : path.length;
        for (let i = 0; i < len; i++) {
            let pathGrid = path[i];
            if (pathGrid && pathGrid.walkable) {
                Tools.insertArr(filterPaths, pathGrid);
            }
        }
        console.log(`[WildMapWin] 找到路径，长度: ${filterPaths.length}`);

        var lastPathGrid = filterPaths[filterPaths.length - 1];

        // 检测体力
        if (GlobalData.wildData.energy < 1) {
            UIMananger.instance.showFlyNotice(lang(29));
        }
        else if (this._MoveStype == 0 || (this._checkFromGrid && currentGrid.equals(this._checkFromGrid) && this._checkTargetGrid && lastPathGrid.equals(this._checkTargetGrid))) {
            // 开始移动（点击移动后恢复摄像机跟随）
            this.gameCamera.isCameraFollowing = true;
            this.role.moveAlongPath(filterPaths).then(() => {
                console.log('[WildMapWin] 移动完成');
                this.mapCom.updateAllNodesSortOrder();
                this.ClearGuide();
                this._checkFromGrid = null;
                this._checkTargetGrid = null;
                var mapObjData = this.role.getCurrentGrid()?.GetMapObject();
                if (mapObjData) {
                    this.HandleMapOjectArrive(mapObjData, false);

                } else if (this.Mgr.onCheckMoveFight()) {//触发暗雷

                    // var targetCfg = ConfigTools.instance.GetWildMapObjectDataByChapterId(4, GlobalData.wildData.chapter);
                    UIMananger.instance.showWin(BattleWin, this.Mgr.GetRandomMonsters())
                }
            });
        }
        else {
            //再次确认路线后移动
            this._checkFromGrid = currentGrid;
            this._checkTargetGrid = lastPathGrid;
            this.targetPoint.node.setWorldPosition(this._checkTargetGrid.GetWorldPos().toVec3());
            this.createGuideArrow(path);
        }
    }

    /**显示导航箭头 */
    private createGuideArrow(path: MapGridData[]) {
        this.ClearGuide();
        if (path.length > 1) {
            for (let i = 0; i < path.length - 1; i++) {
                let itemPath = path[i + 1];
                let preGrid = path[i];
                AssetMgr.createPrefabFromPool(GameUrl.WildMapPrefab.format("GuideArrow"), Vec2.ZERO, this.GuideContainer, GuideArrow).then(guideArrow => {
                    guideArrow.SetData(itemPath, MapGridData.calculateDirection(preGrid, itemPath));
                    this.guideArrows.push(guideArrow);
                })
            }
        }
        this.targetPoint.node.active = true;
    }

    private OnMoveStepOneFinish() {
        this._moveCurStep++;
        console.log("_testStep" + this._moveCurStep)
        if (this.guideArrows && this.guideArrows.length > 0) {
            var guideArrow = this.guideArrows.shift();
            AssetMgr.removeNode(guideArrow.node);
        }
        this.updateRolePosInfo();
    }
    private OnTouchMapObject(mapObjData: MapObjUserData) {
        if (mapObjData) {
            var cfg = mapObjData.cfg;
            // var rolePos=
            var rolePosGrid = this.role.getCurrentGrid();
            var targetGrid = this.Mgr.getGrid(cfg.gridX, cfg.gridY);
            //到达目标物体后
            if (rolePosGrid) {
                this.HandleMapOjectArrive(mapObjData, true)
            } else {
                //还没到达就寻路
                targetGrid = this.pathFindingMgr.GetNearestGrids(rolePosGrid, this.Mgr.GetOccupyGridsByMapObj(mapObjData))
                this.FindPathMove(targetGrid, 1, this._MoveStype != 0);
            }
        }
    }
    private onUpdateEnergy() {
        var curEnergy = GlobalData.wildData.energy;
        if (curEnergy < 0) {
            curEnergy = 0;
        }
        this.lb_Energy.setText(`${curEnergy}/${ConfigMgr.instance.getParam(ParamDefined.PVE_ENERGY_MAX, ParamValueType.INT)[0]}`)
    }
    private onUpdateMapDiscover() {
        var wildData = GlobalData.wildData;
        var curPro = wildData.getKillMonserNum(this.Mgr.curMapId) / wildData.monsterMax;
        if (curPro > 1) {
            curPro = 1;
        }
        this.lb_discorverRate.setText(`${(100 * curPro).toFixed(2)}%`)
    }
    private HandleMapOjectArrive(mapObjData: MapObjUserData, isAutoMove: boolean) {
        console.log(`处理地图物体事件：${mapObjData}`)
        var cfg = mapObjData.cfg;
        var grid = this.Mgr.getGrid(cfg.gridX, cfg.gridY);

        var rolePosGrid = this.role.getCurrentGrid();
        if (MapGridData.CheckIsArriveMapObject(rolePosGrid, mapObjData, 0)) {
            var mapResData = ConfigMgr.instance.MapResourcesData.get(cfg.id);
            if (mapResData) {

                // var interCfg = ConfigMgr.instance.GetConfigByName(mapResData.interaction_type);
                this.Mgr.HandleMapObjectByClient(mapObjData, GlobalData.playerData);
            }
        }
        // 可以行走的话直接走过去点     
        else if (isAutoMove && grid && cfg.walkable) {
            this.FindPathMove(grid, 1, this._MoveStype != 0);
        }

    }


    /**
     * 每帧更新
     */
    protected update(dt: number): void {
        // 摄像机平滑跟随
        if (this.role && this.role.getIsMoving()) {
            this.gameCamera.updateCameraPos(false);
            // 移动时实时更新排序
            this.mapCom.updateAllNodesSortOrder();
        }
    }

    /**
     * 显示/隐藏网格坐标
     */
    OnClickShowGridPos() {
        if (!this.mapCom.isGridVisible) {
            this.mapCom.showGridDebug();
        } else {
            this.mapCom.hideGridDebug();
        }
        this.role.showWatchArea(this.mapCom.isGridVisible)
        this.mapCom.updateMapObjToucheAreaShow(this.mapCom.isGridVisible);
    }

    // closeWin(): void {
    //     // this.scheduleOnce(() => {
    //     //     super.closeWin();
    //     //     this.clear();
    //     // }, 1)
    //     super.closeWin();
    //     this.clear();
    // }
    OnClickBackCity() {
        this.closeWin();
        GlobalData.wildData.ClearRolePos();
    }
    private _showFrog = true;
    OnClickHideFrog() {
        this._showFrog = !this._showFrog;
        this.frog.setShow(this._showFrog);
    }
    private OnClickBag() {
        UIMananger.instance.showWin(BagWin)
    }
    /**
     * 清理资源
     */
    public clear() {
        // 清理网格调试节点


        // 清理角色
        if (this.role) {
            AssetMgr.removeNode(this.role.node);
            this.role = null;
        }

        // 清理格子数据
        this.Mgr.Clear();

        this.ClearGuide();

        GameCamera.instance.clear();

        super.clear();
    }
    public ClearGuide() {
        this.guideArrows.forEach(guide => {
            AssetMgr.removeNode(guide.node);
        })
        this.guideArrows = [];
        this.targetPoint.node.active = false;
        this._moveCurStep = 0;

    }

    get Mgr() {
        return MapMgr.getInstance();
    }
}


