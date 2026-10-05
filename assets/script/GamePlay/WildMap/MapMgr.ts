import { _decorator, Component, Node, Vec2, Vec3, Camera, UITransform } from 'cc';
import { BaseMgr } from '../../Common/BaseMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { MapGridData } from './MapGridData';
import { UIMananger } from '../../Component/UIMananger';
const { ccclass, property } = _decorator;

@ccclass('MapMgr')
export class MapMgr extends BaseMgr {
    public curMapId: number;

    /** 地图容器节点引用 */
    private mapContainer: Node = null;

    /** 地图格子数据（key: "x,y"） */
    private gridMap: Map<string, MapGridData> = new Map();

    /** 地图摄像机引用 */
    private mapCamera: Camera = null;


    /**摄像机边界限制 */
    private cameraBounds = {
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0
    };

    public initEvent(): void {
        super.initEvent();
    }

    /**
     * 初始化地图引用
     */
    public initMapReferences(mapContainer: Node, mapCamera: Camera) {
        this.mapContainer = mapContainer;
        this.mapCamera = mapCamera;

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

    /**
     * 清空所有格子数据
     */
    public clearAllGrids() {
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
}

