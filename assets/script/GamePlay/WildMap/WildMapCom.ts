import { _decorator, Color, Component, Graphics, Node, UITransform, v3, Vec2, Vec3 } from 'cc';
import { MapBase } from './MapBase';
import { MapGridData } from './MapGridData';
import { MapConfig } from './MapConfig';
import { MapMgr } from './MapMgr';
import { GameCamera } from './GameCamera';
import { MapObject } from './MapObject';
import { AssetMgr } from '../../Common/AssetMgr';
import { GameUrl } from '../../Common/GameUrl';
import { GameRole } from './GameRole';
import { FogOfWar } from './FogOfWar';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { GameEvent, MAP_SORT_ORDER, ParamDefined, ParamValueType } from '../../Common/GameEnum';
import { WildRole } from './WildRole';
import { MapObjUserData } from './Data/MapObjUserData';
import { PoolMgr } from '../../Common/Pool';
import { PlayerData } from './Data/PlayerData';
import { GlobalData } from '../../Common/GlobalData';
const { ccclass, property } = _decorator;

/**野外地图 （地图物体加载）*/

@ccclass('WildMapCom')
export class WildMapCom extends MapBase {
    /**网格显示相关 */
    private gridDebugNode: Node = null;           // 网格调试节点


    public isGridVisible: boolean = false;       // 网格是否可见
    /**当前可见的地图物体 */
    private visibleMapObjects: Map<MapObjUserData, MapObject> = new Map();
    /**正在异步创建中的地图物体，避免同一物体被重复创建 */
    private pendingMapObjects: Set<MapObjUserData> = new Set();
    /**最近一次计算出的应可见集合，供创建完成后的回调校验物体是否还在视野内 */
    private lastVisibleSet: Set<MapObjUserData> = new Set();
    /**地图物体容器 */
    protected objectContainer: Node;

    protected mapSortDefined = new Map<Function, MAP_SORT_ORDER>();


    protected SetSortDefined() {
        this.mapSortDefined.set(MapObject, MAP_SORT_ORDER.MAP_OBJ);
        this.mapSortDefined.set(WildRole, MAP_SORT_ORDER.WILD_ROLE);
    }
    public initEvent(): void {
        super.initEvent();
        this.addEvent(GameEvent.RemoveMapObj, this.onRemoveMapObjectHandler, this);
        this.addEvent(GameEvent.OccupyMapObj, this.onOccupyMapObjectHandler, this);
        this.SetSortDefined();
    }

    public SetObjectContainer(container: Node) {
        this.objectContainer = container;
    }
    public createMapBock(mapConfig: MapConfig) {
        super.createMapBock(mapConfig);

        // this.mapConfig = mapConfig;
    }
    public get Mgr() {
        return MapMgr.getInstance();
    }
    updateMapInfo() {
        super.updateMapInfo();
        this.UpdateVisibleMapObj(this.isGridVisible);
    }
    /**地图物体可视化检测 */
    public UpdateVisibleMapObj(isShowTouchArea: boolean) {
        var resultGrids = GameCamera.instance.GetVisibleAreaGrids();
        var minGridPos = resultGrids[0], MaxGridPos = resultGrids[1];
        if (!MaxGridPos || !minGridPos) {
            return;
        }
        var startX = minGridPos.gridX - this.viewportPadding;
        var startY = minGridPos.gridY - this.viewportPadding;

        var endX = MaxGridPos.gridX + this.viewportPadding;
        var endY = MaxGridPos.gridY + this.viewportPadding;
        // 记录本次应该可见的地图物体
        const shouldBeVisible = new Set<MapObjUserData>();
        // 角色当前世界坐标，整轮检测只取一次，避免每格都做一次节点坐标换算
        const roleWorldPos = this.getRoleWorldPos();

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                let mapData = this.Mgr.getGrid(x, y);
                if (!mapData) {
                    continue;
                }
                let mapObjUserData = mapData.GetMapObject();
                if (!mapObjUserData || shouldBeVisible.has(mapObjUserData)) {
                    continue;
                }
                let hasMeet = this.checkHasMeetObj(mapObjUserData)
                if (hasMeet || this.CheckIsMeetRangeByMapObj(mapObjUserData, roleWorldPos)) {
                    shouldBeVisible.add(mapObjUserData)
                    // 已在场景中，或已有一次创建在途，都直接跳过
                    if (this.visibleMapObjects.has(mapObjUserData) || this.pendingMapObjects.has(mapObjUserData)) {
                        continue;
                    }
                    this.pendingMapObjects.add(mapObjUserData)
                    this.createMapObject(mapObjUserData).then(mapObj => {
                        this.pendingMapObjects.delete(mapObjUserData)
                        if (!mapObj) {
                            return;
                        }
                        // 创建期间角色可能已经走开，此时直接回收，不要留在场景里
                        if (!this.lastVisibleSet.has(mapObjUserData)) {
                            AssetMgr.removeNode(mapObj.node);
                            return;
                        }
                        this.updateFrogByVisibleMapObj(mapObj)
                        mapObj.SetShowTouchArea(isShowTouchArea)
                        this.visibleMapObjects.set(mapObjUserData, mapObj);
                    })
                }
            }
        }

        // 记录本轮可见集合，创建完成的回调据此判断物体是否已被移出视野
        this.lastVisibleSet = shouldBeVisible;

        // 隐藏/回收不在视口内的地图物体（同步执行，不受创建中的请求影响）
        const toRemove: MapObjUserData[] = [];
        this.visibleMapObjects.forEach((mapObj, key) => {
            if (!shouldBeVisible.has(key)) {
                AssetMgr.removeNode(mapObj.node);
                toRemove.push(key);
            }
        });
        toRemove.forEach(key => this.visibleMapObjects.delete(key));
    }
    /**获取角色当前世界坐标（移动过程中取实际位置，而不是整格走完才更新的格子坐标） */
    private getRoleWorldPos(): Vec2 {
        var role = GameRole.instance;
        if (!role) {
            return null;
        }
        if (role.getIsMoving()) {
            return role.node.worldPosition.toVec2();
        }
        var roleGrid = role.getCurrentGrid();
        return roleGrid ? roleGrid.GetWorldPos() : role.node.worldPosition.toVec2();
    }
    /**是否进入探索范围（矩形：以角色为中心，半宽/半高均为 WATCH_AREA） */
    CheckIsMeetRangeByVector(worldPos: Vec2, roleWorldPos?: Vec2) {
        var rolePos = roleWorldPos ?? this.getRoleWorldPos();
        if (!rolePos) {
            return false;
        }
        // WATCH_AREA 是半宽，矩形边长为其两倍，与视野框显示大小一致
        var halfRange = ConfigMgr.instance.getParam(ParamDefined.WATCH_AREA, ParamValueType.FLOAT)[0];
        return Math.abs(worldPos.x - rolePos.x) <= halfRange
            && Math.abs(worldPos.y - rolePos.y) <= halfRange;
    }
    /**
     * 地图物体占格包围盒是否与角色视野矩形相交
     * 包围盒由配置 occupyX/occupyY 与格子像素尺寸得出，不依赖美术资源，物件创建前即可判定
     */
    CheckIsMeetRangeByMapObj(mapObj: MapObjUserData, roleWorldPos?: Vec2): boolean {
        var rolePos = roleWorldPos ?? this.getRoleWorldPos();
        if (!rolePos || !mapObj || !mapObj.cfg) {
            return false;
        }
        var cfg = mapObj.cfg;
        var occupyX = Math.max(1, cfg.occupyX);
        var occupyY = Math.max(1, cfg.occupyY);

        // 占格区域（与 MapMgr.SetupMapObjData 的排布一致）
        var left = cfg.gridX - Math.floor(occupyX / 2) + (occupyX % 2 === 0 ? 1 : 0);
        var bottom = cfg.gridY - Math.floor(occupyY / 2) + (occupyY % 2 === 0 ? 1 : 0);
        // 区域中心可能落在格子边界上（偶数占格时），所以用格子小数坐标取中心
        var centerGridX = left + (occupyX - 1) * 0.5;
        var centerGridY = bottom + (occupyY - 1) * 0.5;

        var mapTransform = this.Mgr.getMapContainer()?.getComponent(UITransform);
        if (!mapTransform) {
            return false;
        }
        // gridToMapPos 对格子坐标是线性的，小数坐标可直接得到区域中心
        var worldCenter = mapTransform.convertToWorldSpaceAR(this.Mgr.gridToMapPos(centerGridX, centerGridY).toVec3()).toVec2();

        // 半宽半高按容器世界缩放换算到世界坐标，避免与角色世界坐标不同量纲
        var worldScale = mapTransform.node.worldScale;
        var halfWidth = occupyX * MapGridData.WIDTH_PX * 0.5 * Math.abs(worldScale.x);
        var halfHeight = occupyY * MapGridData.HEIGHT_PX * 0.5 * Math.abs(worldScale.y);
        // WATCH_AREA 是角色视野矩形的半宽
        var halfRange = ConfigMgr.instance.getParam(ParamDefined.WATCH_AREA, ParamValueType.FLOAT)[0];

        return Math.abs(worldCenter.x - rolePos.x) <= halfWidth + halfRange
            && Math.abs(worldCenter.y - rolePos.y) <= halfHeight + halfRange;
    }
    getMapObjDistanceFromRole(worldPos: Vec2, roleWorldPos?: Vec2) {
        var rolePos = roleWorldPos ?? this.getRoleWorldPos();
        if (!rolePos) {
            return 0;
        }
        return Vec2.distance(worldPos, rolePos);
    }

    updateFrogByVisibleMapObj(mapObj: MapObject) {

        var mapObjData = mapObj.GetData();
        if (!this.checkHasMeetObj(mapObjData)) {
            GlobalData.wildData.addFindMapObj(mapObjData.uId);
        }
        var objSize = mapObj.getUISize();
        if (objSize) {
            // FogOfWar.instance.StampRevealAt(mapObj.node.worldPosition, objSize.width, objSize.height);
        }


    }

    checkHasMeetObj(mapUnitData: MapObjUserData) {
        return mapUnitData.hasFinded;
    }

    public updateMapObjToucheAreaShow(bolShow: boolean) {
        this.visibleMapObjects.forEach(mapObj => {
            mapObj.SetShowTouchArea(bolShow);
        });
    }
    /**
     * 创建地图物件
     */
    private createMapObjects(x: number, y: number) {
        var gridData = this.Mgr.getGrid(x, y);

        if (gridData) {
            const IMapData = gridData.GetMapObject();

            return this.createMapObject(IMapData);

        }
        return null;
    }
    /**
       * 创建单个地图物件
       */
    private async createMapObject(objUserData: MapObjUserData) {
        return new Promise<MapObject>(resolve => {
            if (!objUserData) {
                resolve(null);
                return;
            }
            var cfg = objUserData.cfg;
            const worldPos = this.Mgr.getGrid(cfg.gridX, cfg.gridY)?.GetWorldPos() || Vec2.ZERO;

            AssetMgr.createPrefabFromPool(
                GameUrl.WildMapPrefab.format("MapObject"),
                worldPos,
                this.objectContainer,
                MapObject
            ).then(mapObj => {
                mapObj.SetData(objUserData);

                var offPos = v3(cfg.occupyX % 2 == 0 ? MapGridData.WIDTH_PX * 0.5 : 0, cfg.occupyY % 2 == 0 ? MapGridData.HEIGHT_PX * 0.5 : 0)
                mapObj.node.setWorldPosition(worldPos.toVec3());
                mapObj.node.position = mapObj.node.position.add(offPos);
                resolve(mapObj);

            })
        })

    }
    /**
  * 更新所有节点的层级排序（按类型优先级和Y坐标排序）
  * 优先级高的类型显示在前面，同优先级下按Y坐标排序
  */
    public updateAllNodesSortOrder() {
        const nodes = this.objectContainer.children
            .map(node => ({ node, sortOrder: this.getSortOrder(node), y: node.position.y }))
            .sort((a, b) => b.y - a.y || b.sortOrder - a.sortOrder);

        nodes.forEach((item, index) => item.node.setSiblingIndex(index));
    }
    /**获取显示排序 */
    private getSortOrder(node: Node): number {
        for (const [componentType, sortOrder] of this.mapSortDefined) {
            if (node.getComponent(componentType as any)) {
                return sortOrder;
            }
        }
        return 0;
    }
    /**
    * 显示网格调试信息（显示逻辑行走格子）
    */
    public showGridDebug() {
        this.isGridVisible = true;
        // 如果已经存在，先清理
        if (this.gridDebugNode) {
            this.gridDebugNode.destroy();
            this.gridDebugNode = null;
        }

        // 创建网格调试节点
        this.gridDebugNode = new Node('GridDebug');
        this.gridDebugNode.layer = this.node.layer; // 使用 layer 0，确保摄像机能看到
        this.gridDebugNode.setParent(this.node);
        this.gridDebugNode.setPosition(0, 0, 0);

        const mapInfo = this.mapConfig.config.mapInfo;

        // 计算逻辑格子数量（地图总像素 / 每格像素）
        const logicCols = Math.floor(mapInfo.mapPixelWidth / mapInfo.gridWidth);
        const logicRows = Math.floor(mapInfo.mapPixelHeight / mapInfo.gridHeight);

        console.log(`[WildMapWin] 逻辑格子数量: ${logicCols} x ${logicRows}`);
        console.log(`[WildMapWin] 每格尺寸: ${mapInfo.gridWidth} x ${mapInfo.gridHeight} px`);


        // 设置节点的 UITransform，确保足够大以容纳所有绘制内容
        const gridTransform = this.gridDebugNode.getComponent(UITransform) || this.gridDebugNode.addComponent(UITransform);
        gridTransform.setContentSize(mapInfo.mapPixelWidth, mapInfo.mapPixelHeight);
        gridTransform.setAnchorPoint(0.5, 0.5); // 与 mapContainer 保持一致


        // 添加 Graphics 组件绘制网格线
        const graphics = this.gridDebugNode.addComponent(Graphics);
        graphics.lineWidth = 3;
        graphics.strokeColor = new Color(0, 255, 0, 255);

        // 计算地图左下角的坐标（相对于 mapContainer 锚点）
        const mapTransform = this.getComponent(UITransform);
        const startX = -mapTransform.width / 2;
        const startY = -mapTransform.height / 2;
        const endX = mapTransform.width / 2;
        const endY = mapTransform.height / 2;

        console.log(`[WildMapWin] 地图尺寸: ${mapTransform.width} x ${mapTransform.height}`);

        // 绘制竖线
        let lastVerticalX = startX;
        for (let x = 0; x <= logicCols; x++) {
            const posX = startX + x * mapInfo.gridWidth;
            graphics.moveTo(posX, startY);
            graphics.lineTo(posX, endY); // 使用 endY 而不是计算
            lastVerticalX = posX;
        }

        // 绘制横线
        let lastHorizontalY = startY;
        for (let y = 0; y <= logicRows; y++) {
            const posY = startY + y * mapInfo.gridHeight;
            graphics.moveTo(startX, posY);
            graphics.lineTo(endX, posY); // 使用 endX 而不是计算
            lastHorizontalY = posY;
        }

        // 如果最后一条线没到边界，补一条封边线
        if (Math.abs(lastVerticalX - endX) > 1) {
            graphics.moveTo(endX, startY);
            graphics.lineTo(endX, endY);

        }
        if (Math.abs(lastHorizontalY - endY) > 1) {
            graphics.moveTo(startX, endY);
            graphics.lineTo(endX, endY);

        }

        graphics.stroke();

        // 绘制不可移动的格子（红色填充）
        graphics.fillColor = new Color(255, 0, 0, 100); // 红色半透明
        const mgr = MapMgr.getInstance();

        for (let gridX = 0; gridX < logicCols; gridX++) {
            for (let gridY = 0; gridY < logicRows; gridY++) {
                const grid = mgr.getGrid(gridX, gridY);
                if (grid && !grid.walkable) {
                    // 计算格子的世界坐标（中心点）
                    const mapPos = mgr.gridToMapPos(gridX, gridY);
                    // 计算格子的左下角坐标
                    const rectX = mapPos.x - mapInfo.gridWidth / 2;
                    const rectY = mapPos.y - mapInfo.gridHeight / 2;
                    // 绘制红色矩形
                    graphics.rect(rectX, rectY, mapInfo.gridWidth, mapInfo.gridHeight);
                }
            }
        }
        graphics.fill();

        console.log('[WildMapWin] 网格显示已开启（不可移动格子标红）');

    }
    /**移除地图物体处理 */
    protected onRemoveMapObjectHandler(mapObjUID: string) {
        var mapObjUserData: MapObjUserData = this.Mgr.GetMapObjByUID(mapObjUID);
        var mapObj = this.visibleMapObjects.get(mapObjUserData);
        if (mapObj) {
            AssetMgr.removeNode(mapObj.node);
        }
        this.Mgr.RemoveMapObj(mapObjUserData);
        this.visibleMapObjects.delete(mapObjUserData);
    }
    protected onOccupyMapObjectHandler(mapObjUID: string, role: PlayerData) {
        var mapObjUserData: MapObjUserData = this.Mgr.GetMapObjByUID(mapObjUID);
        if (mapObjUserData) {
            mapObjUserData.SetOccupy(role.uId, role.Race);
            var mapObj = this.visibleMapObjects.get(mapObjUserData);
            if (mapObj) {
                mapObj.OccupyShow();
            }
        }
    }
    /**
     * 隐藏网格调试信息
     */
    public hideGridDebug() {
        this.isGridVisible = false;
        if (this.gridDebugNode) {
            this.gridDebugNode.destroy();
            this.gridDebugNode = null;
        }
        console.log('[WildMapWin] 网格显示已关闭');
    }
    public clear(): void {
        super.clear();
        this.hideGridDebug();
        //清除地图物体
        this.visibleMapObjects.forEach(mapObj => {
            AssetMgr.removeNode(mapObj.node);
        })
        this.visibleMapObjects.clear();

    }
}


