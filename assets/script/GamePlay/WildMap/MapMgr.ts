import { _decorator, Component, Node, Vec2, Vec3, Camera, UITransform, v3, v2 } from 'cc';
import { BaseMgr } from '../../Common/BaseMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { MapGridData } from './MapGridData';
import { UIMananger } from '../../Component/UIMananger';
import { MapBlock } from './MapBlock';
import { MapObject } from './MapObject';
import { AssetMgr } from '../../Common/AssetMgr';
import { GameUrl } from '../../Common/GameUrl';
import { IMapObject } from './MapConfig';
import test from 'node:test';
import { WildRole } from './WildRole';
import { Tools } from '../../Common/Tools';
import { PoolMgr } from '../../Common/Pool';
const { ccclass, property } = _decorator;

@ccclass('MapMgr')
export class MapMgr extends BaseMgr {
    public curMapId: number;

    /** 地图容器节点引用 */
    private mapContainer: Node = null;
    /**地图物体容器 */
    private objectContainer: Node = null;

    /** 地图格子数据（key: "x,y"） */
    private gridMap: Map<string, MapGridData> = new Map();

    /** 地图摄像机引用 */
    private mapCamera: Camera = null;

    private testCenterPoint: Node = null;


    /**摄像机边界限制 */
    private cameraBounds = {
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0
    };

    /**视口范围（用于地图块加载优化） */
    private viewportPadding: number = 2; // 视口外扩格子数（不是像素）

    /**当前可见的地图块 */
    private visibleBlocks: Map<string, MapBlock> = new Map();

    /**当前可见的地图物体 */
    private visibleMapObjects: Map<IMapObject, MapObject> = new Map();

    /**记录每个物体占的地图格子 */
    private _mapObjOccupyGrids: Map<IMapObject, MapGridData[]> = new Map();

    /**地图物件 */
    // private mapObjects: Map<IMapObject, MapObject> = new Map();

    /**地图块总尺寸信息 */
    private mapBlockInfo = {
        totalBlocksX: 0,
        totalBlocksY: 0,
        blockPixelSize: 0
    };

    public initEvent(): void {
        super.initEvent();
        PoolMgr.register(MapGridData, (obj) => { obj.Clear() });
    }

    /**
     * 初始化地图引用
     */
    public initMapReferences(mapContainer: Node, objectContainer: Node, mapCamera: Camera, testCenterPoint: Node) {
        this.mapContainer = mapContainer;
        this.objectContainer = objectContainer;
        this.mapCamera = mapCamera;
        this.testCenterPoint = testCenterPoint;
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

        const mapObjects = mapCfg.config.objects;
        mapObjects.forEach(obj => {
            var arrOccupyGrid = [];
            var occupyX = Math.floor(obj.occupyX / 2);
            var occupyY = Math.floor(obj.occupyY / 2);
            var startGridX = obj.gridX - occupyX;
            var endGridX = obj.gridX + occupyX;
            var startGridY = obj.gridY - occupyY;
            var endGridY = obj.gridY + occupyY;
            for (let x = startGridX; x <= endGridX; x++) {
                for (let y = startGridY; y <= endGridY; y++) {
                    var gridData = this.getGrid(x, y);
                    if (gridData) {
                        gridData.setOccupied(obj);
                        gridData.walkable = obj.walkable;
                        Tools.insertArr(arrOccupyGrid, gridData);
                    }
                }
            }
            this._mapObjOccupyGrids.set(obj, arrOccupyGrid);
        })
    }
    /**更新摄像机边界值 */
    public UpdateCameraBounds() {
        // 计算摄像机边界（以 mapContainer 锚点为中心）
        const mapTransform = this.mapContainer.getComponent(UITransform);
        this.cameraBounds.minX = -mapTransform.width / 2;
        this.cameraBounds.maxX = mapTransform.width / 2;
        this.cameraBounds.minY = -mapTransform.height / 2;
        this.cameraBounds.maxY = mapTransform.height / 2;
        // console.log(`[WildMapWin] 摄像机边界: (${this.cameraBounds.minX}, ${this.cameraBounds.minY}) 到 (${this.cameraBounds.maxX}, ${this.cameraBounds.maxY})`);

    }
    /**摄像机边界约束坐标转换 */
    public CameraBoundsTranceLocalPos(cameraLocalPos: Vec2) {
        // 获取相机视口大小
        const rootTransform = UIMananger.instance.getComponent(UITransform);
        if (!rootTransform) return;

        const screenWidth = rootTransform.width * this.mapCamera.rect.width;
        const screenHeight = rootTransform.height * this.mapCamera.rect.height;

        // 计算正交相机的世界坐标视口
        const viewHeight = this.mapCamera.orthoHeight * 2;
        const viewWidth = viewHeight * (screenWidth / screenHeight);

        const halfViewWidth = viewWidth / 2;
        const halfViewHeight = viewHeight / 2;

        // UI坐标到世界坐标的转换比例
        // const worldToUIRatio = viewHeight / screenHeight;

        // 应用边界限制
        var newX = cameraLocalPos.x;
        var newY = cameraLocalPos.y;
        cameraLocalPos.x = Math.max(this.cameraBounds.minX + halfViewWidth, Math.min(newX, this.cameraBounds.maxX - halfViewWidth));
        cameraLocalPos.y = Math.max(this.cameraBounds.minY + halfViewHeight, Math.min(newY, this.cameraBounds.maxY - halfViewHeight));

        return cameraLocalPos;
    }
    public CameraBoundsTranceWorldPos(cameraWorldPos: Vec2) {
        var localPos = this.mapCamera.node.parent.getComponent(UITransform).convertToNodeSpaceAR(cameraWorldPos.toVec3())
        return this.CameraBoundsTranceLocalPos(localPos.toVec2());
    }
    /**
     * 获取地图容器
     */
    public getMapContainer(): Node {
        return this.mapContainer;
    }

    /**
     * 获取地图摄像机
     */
    public getMapCamera(): Camera {
        return this.mapCamera;
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
        // 清理可见的地图块
        this.visibleBlocks.forEach(block => {
            block.HideMapCell();
            AssetMgr.removeNode(block.node);
        });
        this.visibleBlocks.clear();
        //清除地图物体
        this.visibleMapObjects.forEach(mapObj => {
            AssetMgr.removeNode(mapObj.node);
        })
        this.visibleMapObjects.clear();
    }
    /**
     * 清空所有格子数据
     */
    public clearAllGrids() {
        this.gridMap.forEach(grid => {
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
        if (!this.mapCamera || !this.mapContainer) {
            console.error('[MapMgr] screenPosToGrid: mapCamera 或 mapContainer 未初始化');
            return null;
        }

        // 屏幕坐标 → 世界坐标
        const worldPos = this.mapCamera.screenToWorld(new Vec3(screenPos.x, screenPos.y, 0));
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
        const offsetX = localPos.x + mapWidth / 2;
        const offsetY = localPos.y + mapHeight / 2;


        // 计算格子坐标
        const gridX = Math.floor(offsetX / MapGridData.WIDTH_PX);
        const gridY = Math.floor(offsetY / MapGridData.HEIGHT_PX);


        // 返回格子数据
        return this.getGrid(gridX, gridY);
    }
    /**
     * 格子坐标转世界坐标（格子中心点）
     * 返回的是相对于 mapContainer 本地坐标系的坐标
     * mapContainer 的锚点在 (0.5, 0.5)，所以需要从左下角开始计算
     */
    public gridToWorldPos(gridX: number, gridY: number): Vec2 {
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
    /**创建地图块 */
    createMapBock() {
        const mapInfo = this.getMapCfg().config.mapInfo;
        const tileSize = mapInfo.tileSize;

        // 计算逻辑格子总数
        const logicCols = Math.floor(mapInfo.mapPixelWidth / MapGridData.WIDTH_PX);
        const logicRows = Math.floor(mapInfo.mapPixelHeight / MapGridData.HEIGHT_PX);

        console.log(`[WildMapWin] 地图块尺寸 tileSize: ${tileSize}`);
        console.log(`[WildMapWin] 逻辑格子尺寸: ${MapGridData.WIDTH_PX} x ${MapGridData.HEIGHT_PX}`);
        console.log(`[WildMapWin] 地图块总数: ${mapInfo.totalRows} x ${mapInfo.totalCols}`);
        console.log(`[WildMapWin] 逻辑格子总数: ${logicCols} x ${logicRows}`);

        // 保存地图块信息
        this.mapBlockInfo.blockPixelSize = tileSize;
        this.mapBlockInfo.totalBlocksX = mapInfo.totalRows || 6;
        this.mapBlockInfo.totalBlocksY = mapInfo.totalCols || 6;

        // 初始加载视口内的地图块（基于角色初始位置）
        this.updateVisibleBlocks();

        console.log(`[WildMapWin] 地图块信息: totalBlocksX=${this.mapBlockInfo.totalBlocksX}, totalBlocksY=${this.mapBlockInfo.totalBlocksY}, blockPixelSize=${this.mapBlockInfo.blockPixelSize}`);
    }

    /**
     * 更新可见的地图块（基于摄像机视口）
     */
    public updateVisibleBlocks() {
        if (!this.mapCamera) {
            console.warn('[WildMapWin] mapCamera 未初始化');
            return;
        }

        const cameraPos = this.mapCamera.node.worldPosition;
        const tileSize = this.mapBlockInfo.blockPixelSize;

        // 从根节点的 UITransform 获取屏幕尺寸
        const rootTransform = UIMananger.instance.getComponent(UITransform);
        if (!rootTransform) {
            console.warn('[WildMapWin] 根节点 UITransform 未找到');
            return;
        }

        // 根据相机的 rect 和屏幕尺寸计算实际视口大小
        const screenWidth = rootTransform.width * this.mapCamera.rect.width;
        const screenHeight = rootTransform.height * this.mapCamera.rect.height;

        // 计算地图的起始坐标（左下角）
        const mapTransform = this.mapContainer.getComponent(UITransform);
        const mapStartX = -mapTransform.width / 2;
        const mapStartY = -mapTransform.height / 2;


        // 计算正交相机的世界坐标视口
        const viewHeight = this.mapCamera.orthoHeight * 2;
        const viewWidth = viewHeight * (screenWidth / screenHeight);

        // 计算视口范围在地图中的位置（世界坐标）
        const viewMinX = cameraPos.x - viewWidth / 2;
        const viewMaxX = cameraPos.x + viewWidth / 2;
        const viewMinY = cameraPos.y - viewHeight / 2;
        const viewMaxY = cameraPos.y + viewHeight / 2;

        // 转换为地图块索引（从地图左下角开始计算）
        const minBlockX = Math.floor((viewMinX - mapStartX) / tileSize) - this.viewportPadding;
        const maxBlockX = Math.ceil((viewMaxX - mapStartX) / tileSize) + this.viewportPadding;
        const minBlockY = Math.floor((viewMinY - mapStartY) / tileSize) - this.viewportPadding;
        const maxBlockY = Math.ceil((viewMaxY - mapStartY) / tileSize) + this.viewportPadding;

        // 限制在地图范围内
        const startX = Math.max(0, minBlockX);
        const endX = Math.min(this.mapBlockInfo.totalBlocksX - 1, maxBlockX);
        const startY = Math.max(0, minBlockY);
        const endY = Math.min(this.mapBlockInfo.totalBlocksY - 1, maxBlockY);

        console.log(`[WildMapWin] 加载地图块范围: X(${startX} - ${endX}), Y(${startY} - ${endY})`);

        // 记录本次应该可见的地图块
        const shouldBeVisible = new Set<string>();

        // 加载视口内的地图块
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x},${y}`;
                shouldBeVisible.add(key);

                // 如果地图块不存在，创建它
                if (!this.visibleBlocks.has(key)) {
                    this.createMapBlockTile(x, y);
                }
            }
        }

        // 隐藏/回收不在视口内的地图块
        const toRemove: string[] = [];
        this.visibleBlocks.forEach((block, key) => {
            if (!shouldBeVisible.has(key)) {
                block.HideMapCell();
                AssetMgr.removeNode(block.node);
                toRemove.push(key);
            }
        });

        // 从可见列表中移除
        toRemove.forEach(key => this.visibleBlocks.delete(key));

    }
    /**地图物体可视化检测 */
    public UpdateVisibleMapObj() {
        const cameraPos = this.mapCamera.node.worldPosition;

        // 从根节点的 UITransform 获取屏幕尺寸
        const rootTransform = UIMananger.instance.getComponent(UITransform);
        if (!rootTransform) {
            console.warn('[WildMapWin] 根节点 UITransform 未找到');
            return;
        }
        // 根据相机的 rect 和屏幕尺寸计算实际视口大小
        const screenWidth = rootTransform.width * this.mapCamera.rect.width;
        const screenHeight = rootTransform.height * this.mapCamera.rect.height;

        // 计算正交相机的世界坐标视口
        const viewHeight = this.mapCamera.orthoHeight * 2;
        const viewWidth = viewHeight * (screenWidth / screenHeight);

        // 计算视口范围在地图中的位置（世界坐标）
        const viewMinX = cameraPos.x - viewWidth / 2;
        const viewMaxX = cameraPos.x + viewWidth / 2;
        const viewMinY = cameraPos.y - viewHeight / 2;
        const viewMaxY = cameraPos.y + viewHeight / 2;

        // 记录本次应该可见的地图物体
        const shouldBeVisible = new Set<IMapObject>();

        var worldPosMin = v3(viewMinX, viewMinY);
        var wolrdPosMax = v3(viewMaxX, viewMaxY);

        // this.testCenterPoint.setWorldPosition(worldPosMin);

        var minGridPos = this.WorldPosToGrid(worldPosMin);

        var MaxGridPos = this.WorldPosToGrid(wolrdPosMax);


        console.log(`起始格子坐标：${minGridPos.gridX},${minGridPos.gridY},结束格子坐标${MaxGridPos.gridX},${MaxGridPos.gridY}`)
        var arrPromise = []
        for (let x = minGridPos.gridX; x < MaxGridPos.gridX; x++) {
            for (let y = minGridPos.gridY; y < MaxGridPos.gridY; y++) {
                let mapData = this.getGrid(x, y);
                if (mapData && mapData.occupyUnit && !(mapData.occupyUnit instanceof WildRole)) {
                    if (!shouldBeVisible.has(mapData.occupyUnit)) {
                        shouldBeVisible.add(mapData.occupyUnit)
                        if (!this.visibleMapObjects.get(mapData.occupyUnit)) {
                            arrPromise.push(this.createMapObjects(x, y).then(mapObj => {
                                if (mapObj) {
                                    this.visibleMapObjects.set(mapData.occupyUnit, mapObj);
                                }
                            }));
                        }
                    }
                }
            }
        }
        Promise.all(arrPromise).then(() => {
            // 隐藏/回收不在视口内的地图块
            const toRemove: IMapObject[] = [];
            this.visibleMapObjects.forEach((mapObj, key) => {
                if (!shouldBeVisible.has(key)) {
                    AssetMgr.removeNode(mapObj.node);
                    toRemove.push(key);
                    // this.mapObjects.delete(key);
                }
            });

            // 从可见列表中移除
            toRemove.forEach(key => this.visibleMapObjects.delete(key));
        })

    }

    /**
       * 创建单个地图块
       */
    private async createMapBlockTile(x: number, y: number) {
        const key = `${x},${y}`;

        // 防止重复创建
        if (this.visibleBlocks.has(key)) return;

        // 计算地图块位置（从地图左下角开始）
        const mapTransform = this.mapContainer.getComponent(UITransform);
        const startX = -mapTransform.width / 2;
        const startY = -mapTransform.height / 2;
        const tileSize = this.mapBlockInfo.blockPixelSize;

        // MapBlock 的锚点是 (0.5, 0.5)，所以需要加上半个块的偏移
        const blockPos = new Vec2(
            startX + x * tileSize + tileSize / 2,
            startY + y * tileSize + tileSize / 2
        );

        const block = await AssetMgr.createPrefabFromPool(
            GameUrl.WildMapPrefab.format("MapBlock"),
            blockPos,
            this.mapContainer,
            MapBlock
        );

        block.SetData(this.curMapId, new Vec2(x, y));
        block.ShowMapCell();

        // 添加到可见列表
        this.visibleBlocks.set(key, block);
    }
    /**
     * 创建地图物件
     */
    private createMapObjects(x: number, y: number) {
        var gridData = this.getGrid(x, y);
        if (gridData && gridData.occupyUnit) {
            // var mapObj = this.mapObjects.get(gridData.occupyUnit)
            // if (mapObj) {
            //     return new Promise<MapObject>(resolve => {
            //         if (!mapObj.node.active) {
            //             mapObj.node.active = true;
            //             mapObj.SetData(gridData.occupyUnit)
            //         }
            //         resolve(mapObj)
            //     });
            // }
            return this.createMapObject(gridData.occupyUnit);
        }
    }
    /**
       * 创建单个地图物件
       */
    private async createMapObject(objData: IMapObject) {
        return new Promise<MapObject>(resolve => {

            const worldPos = this.getGrid(objData.gridX, objData.gridY)?.GetWorldPos() || Vec2.ZERO;

            AssetMgr.createPrefabFromPool(
                GameUrl.WildMapPrefab.format("MapObject"),
                worldPos,
                this.objectContainer,
                MapObject
            ).then(mapObj => {
                mapObj.SetData(objData);
                mapObj.node.setWorldPosition(worldPos.toVec3());

                resolve(mapObj);

            })
        })

    }
    /**
  * 更新所有节点的层级排序（Y排序）
  * Y坐标越小，zIndex越大（越靠前显示）
  */
    public updateAllNodesSortOrder() {
        // 收集所有需要排序的节点
        const sortableNodes: { node: Node, y: number }[] = [];

        this.objectContainer.children.forEach(child => {
            sortableNodes.push({
                node: child,
                y: child.position.y
            });
        })

        // 按Y坐标排序（Y越小越靠前）
        sortableNodes.sort((a, b) => b.y - a.y);

        // 设置zIndex
        sortableNodes.forEach((item, index) => {
            item.node.setSiblingIndex(index);
        });
    }

    public GetOccupyGridsByMapObj(mapObj: IMapObject) {
        return this._mapObjOccupyGrids.get(mapObj) || [];
    }
}

