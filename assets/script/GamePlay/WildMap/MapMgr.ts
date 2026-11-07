import { _decorator, Component, Node, Vec2, Vec3, Camera, UITransform, v3, v2 } from 'cc';
import { BaseMgr } from '../../Common/BaseMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { MapGridData } from './MapGridData';
import { UIMananger } from '../../Component/UIMananger';
import { Tools } from '../../Common/Tools';
import { PoolMgr } from '../../Common/Pool';
import { GameCamera } from './GameCamera';
import { ConfigTools } from '../../Config/ConfigTools';
import { GlobalData } from '../../Common/GlobalData';
import { IAutoTriggerData } from '../../Config/Typings/AutoTriggerData';
import { ISelectEventsData } from '../../Config/Typings/SelectEventsData';
import { ITransactionEventsData } from '../../Config/Typings/TransactionEventsData';
import { ISpecialEventsData } from '../../Config/Typings/SpecialEventsData';
import { GameEvent, MAP_OBJECT_FINISH_TYPE, MAP_RES_INTERATION_TYPE, ParamDefined, ParamValueType } from '../../Common/GameEnum';
import { EventManager } from '../../Common/EventManager';
import { IDropData } from '../../Config/Typings/DropData';
import { lang, LangMgr } from '../../Common/LangMgr';
import { MapObjUserData } from './Data/MapObjUserData';
import { PlayerData } from './Data/PlayerData';
import { BattleWin } from '../Battle/BattleWin';
import { IMonsterAttrData } from '../../Config/Typings/MonsterAttrData';
import { WildMapWin } from './WildMapWin';
import { WildBattleCheckWin } from './Windows/WildBattleCheckWin';
import { WildDealWin } from './Windows/WildDealWin';
import { IMapConfig } from './MapConfig';
import { IMapResourcesData } from '../../Config/Typings/MapResourcesData';
import { randIdx } from '../../Common/fn';
import { IUnitRandomData } from '../../Config/Typings/UnitRandomData';
import { IBATTLE_DATA, IBATTLE_UNIT_DATA } from '../Battle/BattleMgr';
const { ccclass, property } = _decorator;
/**交互的地图物体数据结构 */
export interface MAP_OBJ_HANDLE {
    mapResCfg: IMapResourcesData;
    mapUID: string;
}
@ccclass('MapMgr')
export class MapMgr extends BaseMgr {
    public curMapId: number;

    /** 地图容器节点引用 */
    private mapContainer: Node = null;

    /** 地图格子数据（key: "x,y"） */
    private gridMap: Map<string, MapGridData> = new Map();

    // 是否显示触碰区域
    public isShowTouchArea: boolean;
    // 交互中的地图物体
    public mapObjectHandling: MAP_OBJ_HANDLE;

    /**记录每个物体占的地图格子 */
    private _mapObjOccupyGrids: Map<MapObjUserData, MapGridData[]> = new Map();
    /**以UID找地图物体 */
    private _mapObjByUID: Map<string, MapObjUserData> = new Map();

    /**地图物件 */
    // private mapObjects: Map<IMapObject, MapObject> = new Map();



    public initEvent(): void {
        super.initEvent();
        PoolMgr.register(MapGridData, (obj) => { obj.Clear() });
        PoolMgr.register(MapObjUserData, (obj) => { obj.Clear() });
    }

    /**
     * 初始化地图引用
     */
    public initMapReferences(mapContainer: Node) {
        this.mapContainer = mapContainer;
    }
    /**
        * 创建格子数据
        */
    public createGridData() {
        this.clearAllGrids();

        var mapCfg = this.getMapCfg();
        const mapInfo = mapCfg.config.mapInfo;

        // 计算逻辑格子数量：地图总像素 / 每格像素
        const maxGridX = Math.floor(mapInfo.mapPixelWidth / mapInfo.gridWidth);
        const maxGridY = Math.floor(mapInfo.mapPixelHeight / mapInfo.gridHeight);

        console.log(`[WildMapWin] 地图尺寸: ${mapInfo.mapPixelWidth}x${mapInfo.mapPixelHeight}px`);
        console.log(`[WildMapWin] 每格尺寸: ${mapInfo.gridWidth}x${mapInfo.gridHeight}px`);
        console.log(`[WildMapWin] 逻辑格子数: ${maxGridX}x${maxGridY}`);


        for (let x = 0; x < maxGridX; x++) {
            for (let y = 0; y < maxGridY; y++) {
                const walkable = !mapCfg.GetNotMoveGrid(x, y);
                const grid = PoolMgr.get(MapGridData);
                grid.SetData(x, y, walkable);
                this.setGrid(grid);
            }
        }

        console.log(`[WildMapWin] 创建了 ${MapMgr.getInstance().getGridCount()} 个格子数据`);

        this.SetupMapObjData();

    }
    /**设置地图物体占格数据 */
    private SetupMapObjData() {
        var mapCfg = this.getMapCfg();
        GlobalData.wildData.monsterMax = 0;
        const mapObjects = mapCfg.config.objects;
        mapObjects.forEach(obj => {
            var arrOccupyGrid = [];
            var mapResCfg = ConfigMgr.instance.MapResourcesData.get(Number(obj.id));
            // 统计当前地图怪物波数
            if (mapResCfg && mapResCfg.interaction_type == MAP_RES_INTERATION_TYPE.BattleEventsData) {
                GlobalData.wildData.monsterMax++;
            }
            // 计算占格区域的左下角
            let occupyLeft: number, occupyBottom: number;

            if (obj.occupyX % 2 === 0) {
                // 偶数格：左下角 = gridX - floor(occupyX/2) + 1
                occupyLeft = obj.gridX - Math.floor(obj.occupyX / 2) + 1;
            } else {
                // 奇数格：左下角 = gridX - floor(occupyX/2)
                occupyLeft = obj.gridX - Math.floor(obj.occupyX / 2);
            }

            if (obj.occupyY % 2 === 0) {
                // 偶数格：左下角 = gridY - floor(occupyY/2) + 1
                occupyBottom = obj.gridY - Math.floor(obj.occupyY / 2) + 1;
            } else {
                // 奇数格：左下角 = gridY - floor(occupyY/2)
                occupyBottom = obj.gridY - Math.floor(obj.occupyY / 2);
            }

            var mapObjUid = MapObjUserData.FormatUID(this.curMapId, obj.gridX, obj.gridY, obj.id);

            // 获取状态数据
            var mapObjstate = GlobalData.wildData.getMapObjState(mapObjUid);
            if (mapObjstate && mapObjstate.isDissapear) {
                return;
            }
            const userData = PoolMgr.get(MapObjUserData);
            userData.setData(obj, this.curMapId);
            if (mapObjstate.occupiedPlayerId) {
                userData.SetOccupy(mapObjstate.occupiedPlayerId, GlobalData.playerData.Race);
            }
            // 从左下角开始，占据 occupyX * occupyY 个格子
            for (let dx = 0; dx < obj.occupyX; dx++) {
                for (let dy = 0; dy < obj.occupyY; dy++) {
                    const x = occupyLeft + dx;
                    const y = occupyBottom + dy;
                    let gridData = this.getGrid(x, y);
                    if (gridData) {
                        gridData.addOccupied(userData);
                        gridData.walkable = obj.walkable;
                        Tools.insertArr(arrOccupyGrid, gridData);
                    }
                }
            }
            this._mapObjOccupyGrids.set(userData, arrOccupyGrid);
            this._mapObjByUID.set(userData.uId, userData);
        })
    }

    /**
     * 获取地图容器
     */
    public getMapContainer(): Node {
        return this.mapContainer;
    }

    /**
     * 添加格子数据
     */
    public setGrid(grid: MapGridData) {
        const key = `${grid.gridX},${grid.gridY}`;
        this.gridMap.set(key, grid);
    }

    /**
     * 获取格子数据
     */
    public getGrid(x: number, y: number): MapGridData | null {
        const key = `${x},${y}`;
        return this.gridMap.get(key) || null;
    }

    /**
     * 获取所有格子数据（供寻路使用）
     */
    public getAllGridsMap(): Map<string, MapGridData> {
        return this.gridMap;
    }

    /**
     * 获取格子总数
     */
    public getGridCount(): number {
        return this.gridMap.size;
    }
    public Clear() {
        this.clearAllGrids();
        // this.mapObjectHandling = null;
        this._mapObjOccupyGrids.clear();
        this._mapObjByUID.clear();
    }
    /**
     * 清空所有格子数据
     */
    public clearAllGrids() {
        this.gridMap.forEach(grid => {
            grid.occupyUnit.forEach((unit: any) => {
                if (unit instanceof MapObjUserData) {
                    this._mapObjOccupyGrids.delete(unit);   // 顺带清悬空 key
                }
            });
            PoolMgr.put<MapGridData>(grid);
        })
        this.gridMap.clear();
    }

    public async LoadMap(mapId: number) {
        this.curMapId = mapId;
        return ConfigMgr.instance.loadWildMapConfig(mapId);
    }

    public getMapCfg() {
        return ConfigMgr.instance.wildMapConfig.get(this.curMapId);
    }

    /**
     * 屏幕坐标转格子坐标
     * @param screenPos 屏幕坐标（触摸点）
     * @returns 格子数据，如果无效则返回 null
     */
    public screenPosToGrid(screenPos: Vec2): MapGridData | null {

        if (!GameCamera.instance.camera || !this.mapContainer) {
            console.error('[MapMgr] screenPosToGrid: mapCamera 或 mapContainer 未初始化');
            return null;
        }

        // 屏幕坐标 → 世界坐标
        const worldPos = GameCamera.instance.camera.screenToWorld(new Vec3(screenPos.x, screenPos.y, 0));
        return this.WorldPosToGrid(worldPos);

    }
    /**
     * 世界坐标转格子坐标（格子中心点）
     * 返回的是相对于 mapContainer 本地坐标系的坐标
     * mapContainer 的锚点在 (0.5, 0.5)，所以需要从左下角开始计算
     */
    public WorldPosToGrid(worldPos: Vec3) {
        const mapCfg = this.getMapCfg();
        if (!mapCfg) {
            console.error('[MapMgr] screenPosToGrid: mapCfg 未初始化');
            return null;
        }
        // 世界坐标 → mapContainer 本地坐标
        const mapTransform = this.mapContainer.getComponent(UITransform);
        const localPos = mapTransform?.convertToNodeSpaceAR(worldPos);

        return this.MapPosToGrid(localPos.toVec2());
    }
    public MapPosToGrid(localPos: Vec2) {
        const mapCfg = this.getMapCfg();
        if (!mapCfg) {
            console.error('[MapMgr] screenPosToGrid: mapCfg 未初始化');
            return null;
        }

        if (!localPos) {
            return null;
        }


        // 本地坐标 → 格子坐标
        const mapInfo = mapCfg.config.mapInfo;
        const mapWidth = mapInfo.mapPixelWidth;
        const mapHeight = mapInfo.mapPixelHeight;

        // mapContainer 锚点在中心，需要加上偏移
        const offsetX = localPos.x + mapWidth / 2;//- mapInfo.gridWidth * 0.5;
        const offsetY = localPos.y + mapHeight / 2;//- mapInfo.gridHeight * 0.5;


        // 计算格子坐标
        const gridX = Math.floor(offsetX / MapGridData.WIDTH_PX);
        const gridY = Math.floor(offsetY / MapGridData.HEIGHT_PX);


        // 返回格子数据
        return this.getGrid(gridX, gridY);
    }
    /**
     * 格子坐标转地图容器坐标（格子中心点）
     * 返回的是相对于 mapContainer 本地坐标系的坐标
     * mapContainer 的锚点在 (0.5, 0.5)，所以需要从左下角开始计算
     */
    public gridToMapPos(gridX: number, gridY: number): Vec2 {
        const mapCfg = this.getMapCfg();
        if (!mapCfg) {
            console.error('[MapMgr] gridToWorldPos: mapCfg 未初始化');
            return new Vec2(0, 0);
        }

        const mapInfo = mapCfg.config.mapInfo;
        const mapWidth = mapInfo.mapPixelWidth;
        const mapHeight = mapInfo.mapPixelHeight;

        // 计算格子中心点相对于 mapContainer 的本地坐标
        // 由于 mapContainer 锚点在 (0.5, 0.5)，本地坐标 (0,0) 在地图中心
        // 所以需要从左下角 (-mapWidth/2, -mapHeight/2) 开始计算
        return new Vec2(
            -mapWidth / 2 + gridX * MapGridData.WIDTH_PX + MapGridData.WIDTH_PX / 2,
            -mapHeight / 2 + gridY * MapGridData.HEIGHT_PX + MapGridData.HEIGHT_PX / 2
        );
    }

    public GetOccupyGridsByMapObj(mapObj: MapObjUserData) {
        return this._mapObjOccupyGrids.get(mapObj) || [];
    }
    public GetMapObjByUID(mapUID: string) {
        return this._mapObjByUID.get(mapUID);
    }
    public RemoveMapObj(mapObj: MapObjUserData) {
        var grids = this.GetOccupyGridsByMapObj(mapObj);
        if (grids) {
            grids.forEach(grid => {
                grid.removeOccupy(mapObj);
            })
        }
    }
    /**处理地图物体（单机模式）*/
    public HandleMapObjectByClient(mapObj: MapObjUserData, role: PlayerData) {
        if (!mapObj) {
            return;
        }
        var id = mapObj.cfg.id;
        var cfg = ConfigMgr.instance.MapResourcesData.get(id);
        if (!cfg) {
            return;
        }
        var targetCfg = ConfigTools.instance.GetWildMapObjectDataByChapterId(id, GlobalData.wildData.chapter);

        if (!targetCfg) {
            return;
        }
        //执行动作
        var strContent = "";

        // 检测地图物体交互次数
        var mapObjState = GlobalData.wildData.getMapObjState(mapObj.uId);
        var isCanUse = !cfg.relive_time || mapObjState.usedTime < cfg.relive_time;
        var isRelive = cfg.relive_cd && mapObjState.nextReliveTime <= GlobalData.serverData.getServerTime();
        if (!isCanUse && !isRelive) {
            console.log("触发次数不足")
            return;
        }

        this.mapObjectHandling = { mapResCfg: cfg, mapUID: mapObj.uId };
        switch (cfg.interaction_type) {
            case MAP_RES_INTERATION_TYPE.AutoTriggerData:
                const autoTrigger = <IAutoTriggerData>targetCfg;
                // 随机掉落（服务器处理）
                var arrDrops = [];
                ConfigMgr.instance.DropData.forEach(item => {
                    if (item.group_id == autoTrigger.drop) {
                        arrDrops.push(item);
                    }
                })

                if (arrDrops) {
                    var dropData = (arrDrops[0] as IDropData)
                    var itemCfg = ConfigMgr.instance.ItemData.get(dropData.item);
                    strContent = lang(itemCfg.name) + dropData.num;
                }
                this.HandleMapOjectFinishChat(this.mapObjectHandling, role, strContent);
                break;
            case MAP_RES_INTERATION_TYPE.SelectEventsData:
                const selectEvent = <ISelectEventsData>targetCfg;
                // 随机道具获取
                var itemCfg = ConfigMgr.instance.ItemData.get(selectEvent.item_list[0]);
                if (itemCfg) {
                    strContent = lang(itemCfg.name) + selectEvent.item_count[0];
                }
                this.HandleMapOjectFinishChat(this.mapObjectHandling, role, strContent);
                break;
            case MAP_RES_INTERATION_TYPE.TransactionEventsData:
                const transactionEvent = <ITransactionEventsData>targetCfg;
                UIMananger.instance.showWin(WildDealWin, cfg);
                break;
            case MAP_RES_INTERATION_TYPE.SpecialEventsData:
                const specialEvent = <ISpecialEventsData>targetCfg;
                break;
            case MAP_RES_INTERATION_TYPE.BattleEventsData:
                const monsterAttrsInfos = <IMonsterAttrData>targetCfg;//as IMonsterAttrData;
                // 弹窗确认
                if (monsterAttrsInfos.is_confirm) {
                    UIMananger.instance.showWin(WildBattleCheckWin, monsterAttrsInfos, cfg)
                } else {
                    UIMananger.instance.showWin(BattleWin, this.GetBattleDataByMonsterAttrData(monsterAttrsInfos));
                }
                break;
        }



    }
    /**通过单位属性表获取战斗数据 */
    public GetBattleDataByMonsterAttrData(monsterAttrsData: IMonsterAttrData): IBATTLE_DATA {
        var gridPos = monsterAttrsData.coordinates;

        var list = [];

        for (var i = 0; i < gridPos.length; i++) {
            var posId = gridPos[i]

            var dataIndex = i * 2;
            var unitId = monsterAttrsData.units_list[dataIndex];
            var unitCount = monsterAttrsData.units_list[dataIndex + 1];
            var unitData: IBATTLE_UNIT_DATA = { unitAttrId: unitId, posId: posId, num: unitCount, lv: monsterAttrsData.soldier_lv_coef }
            list.push(unitData);
        }

        return { enermyUnits: list, myUnits: null };
    }
    /**完成地图物体交互后 */
    public HandleMapOjectFinishChat(mapHandler: MAP_OBJ_HANDLE, role: PlayerData, flyNoticeContent: string) {
        if (!mapHandler) {
            return;
        }
        var cfg = mapHandler.mapResCfg;
        if (!cfg) {
            return;
        }
        var wildData = GlobalData.wildData.getMapObjState(mapHandler.mapUID);
        wildData.usedTime++;
        // 如果可以刷新使用次数就更新下次刷新时间
        if (wildData.usedTime >= cfg.relive_time && cfg.relive_cd) {
            wildData.nextReliveTime = cfg.relive_cd + GlobalData.serverData.getServerTime();
        }
        if (cfg.finish_effect && cfg.finish_effect.length > 0) {
            cfg.finish_effect.forEach(effect => {
                switch (effect) {
                    case MAP_OBJECT_FINISH_TYPE.DISSAPEAR:
                        GlobalData.wildData.setMapObjDissapear(mapHandler.mapUID, true);
                        EventManager.Instance.dispatch(GameEvent.RemoveMapObj, mapHandler.mapUID);
                        break;
                    case MAP_OBJECT_FINISH_TYPE.FLY_NOTCIE:
                        if (flyNoticeContent) {
                            UIMananger.instance.showFlyNotice(`${lang(12, { name: flyNoticeContent })}`);
                        }
                        break;
                    case MAP_OBJECT_FINISH_TYPE.FLAG:
                        GlobalData.wildData.setMapObjOccupy(mapHandler.mapUID, role.uId);
                        EventManager.Instance.dispatch(GameEvent.OccupyMapObj, mapHandler.mapUID, role);
                        break;
                }
            })
        }
        this.mapObjectHandling = null;
    }
    /**检测暗雷 */
    public onCheckMoveFight() {
        GlobalData.wildData.surferFightStep++;
        var numStep = GlobalData.wildData.surferFightStep;
        // numStep++;
        var arr = ConfigMgr.instance.getParam(ParamDefined.PVE_RANDOM_ENERMY_STEP_NUM, ParamValueType.INT);
        var minStep = arr[0];
        var maxStep = arr[1];
        var isFight = false;
        if (minStep < numStep) {
            if (numStep > maxStep) {
                // 大于这个步数必定遇怪
                isFight = true;
            } else {
                // 随机遇怪
                var result = Math.random() > 0.5
                isFight = result;
            }
        }
        if (isFight) {
            console.log("触发暗雷")
        }
        return isFight;
    }
    /**随机暗雷怪 */
    public GetRandomMonsters(): IBATTLE_DATA {
        var mapData = ConfigTools.instance.getMapDataByChaper();
        if (mapData) {
            var randomGroup = mapData.random_units_list;
            if (randomGroup) {
                var randomListIds = ConfigMgr.instance.UnitRandomDataIndex.UnitRandomDataIndex[randomGroup];
                if (randomListIds) {
                    var randomList: IUnitRandomData[] = [];
                    var coordinates = null;
                    for (let key in randomListIds) {
                        let randomId = randomListIds[key]
                        var randomCfg = ConfigMgr.instance.UnitRandomData.get(randomId);
                        randomList.push(randomCfg);
                        if (!coordinates) {
                            coordinates = Tools.shuffle(randomCfg.coordinates);
                        }
                    }

                    if (randomList.length > 0) {
                        let resultArr = [];
                        randomList.forEach(unitRandomCfg => {
                            let randomUnitList = [];
                            for (let i = 0; i < unitRandomCfg.unit_attr.length; i++) {

                                var unitAttrId = unitRandomCfg.unit_attr[i];
                                var weight = unitRandomCfg.weight[i];
                                randomUnitList.push({ unitId: unitAttrId, weight: weight });
                            }
                            let resultIndex = Tools.getRandomForWeight(randomUnitList);


                            resultArr.push({ unitAttrId: resultIndex.unitId, num: Tools.getRandomRange(unitRandomCfg.count_min, unitRandomCfg.count_max) })
                        })


                        var listResultUnits = [];
                        var index = 0;
                        resultArr.forEach(unitResult => {
                            listResultUnits.push({ unitAttrId: unitResult.unitAttrId, posId: coordinates[index], num: unitResult.num, lv: 1 })
                            index++;
                        })
                        return { enermyUnits: listResultUnits, myUnits: null };
                    }
                }
            }
        }
    }
}


