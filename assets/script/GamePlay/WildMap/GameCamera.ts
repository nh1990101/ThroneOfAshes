import { _decorator, Camera, Component, Node, UITransform, v2, v3, Vec2, Vec3 } from 'cc';
import { UIMananger } from '../../Component/UIMananger';
import { BaseComp } from '../../Component/BaseComp';
import { GameEvent } from '../../Common/GameEnum';
import { MapMgr } from './MapMgr';
import { EventManager } from '../../Common/EventManager';
const { ccclass, property } = _decorator;

@ccclass('GameCamera')
export class GameCamera extends BaseComp {
    public camera: Camera;
    /**跟随对象 */
    private _followTarget: Node;

    /**摄像机边界限制 */
    private cameraBounds = {
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0
    };
    public isCameraFollowing: boolean = true;
    /**摄像机移动多少距离后更新地图块 */
    private updateBlockThreshold: number = 1;
    /**上次更新地图块的摄像机位置 */
    private lastUpdateCameraPos: Vec3 = new Vec3();
    private mapMgr: MapMgr;
    public static instance: GameCamera;
    protected onLoad(): void {
        // super.onLoad();
        if (!GameCamera.instance) {
            GameCamera.instance = this;
        }
    }
    init() {
        if (!this.camera) {
            this.camera = this.getComponent(Camera);
        }
        this.mapMgr = MapMgr.getInstance();
        super.init();
    }
    public initEvent(): void {
        super.initEvent();
        this.addEvent(GameEvent.MapDraging, this.dragCamera, this);
        this.addEvent(GameEvent.MapEndTouch, this.EndTouchHandler, this);
        this.addEvent(GameEvent.MapCancleTouch, this.CancleTouchHandler, this);
    }
    public setFollowTarget(target: Node) {
        this._followTarget = target;
    }
    update(deltaTime: number) {
        // 定期更新可见地图块
        if (this.camera) {
            const currentPos = this.node.position;
            const distance = Vec3.distance(currentPos, this.lastUpdateCameraPos);

            // 当摄像机移动超过阈值时，更新地图块
            if (distance > this.updateBlockThreshold) {
                // this.mapMgr.updateVisibleBlocks();
                // this.mapMgr.UpdateVisibleMapObj();
                EventManager.Instance.dispatch(GameEvent.UpdateMapBlock);
                this.lastUpdateCameraPos.set(currentPos);
            }
        }
    }
    /**
     * 拖动摄像机
     * deltaX/deltaY 移动像素
     */
    private dragCamera(beginPos: Vec2, endPos: Vec2) {

        this.isCameraFollowing = false; // 停止摄像机跟随

        // 计算拖动偏移（UI坐标系）
        const deltaX = -(beginPos.x - endPos.x);
        const deltaY = -(beginPos.y - endPos.y);

        const cameraNode = this.node;
        const currentPos = cameraNode.position;


        // UI坐标到世界坐标的转换比例
        const worldToUIRatio = UIMananger.instance.GetUIRatio(this.camera);

        // 计算新位置
        let newX = currentPos.x + deltaX * worldToUIRatio;
        let newY = currentPos.y + deltaY * worldToUIRatio;

        var resultPos = this.CameraBoundsTranceLocalPos(v2(newX, newY))

        cameraNode.setPosition(resultPos.x, resultPos.y, currentPos.z);
    }
    private EndTouchHandler() {
        this.isCameraFollowing = true;
    }
    private CancleTouchHandler() {
        this.isCameraFollowing = true;
    }

    /**摄像机边界约束坐标转换 */
    public CameraBoundsTranceLocalPos(cameraLocalPos: Vec2) {
        // 获取相机视口大小
        const rootTransform = UIMananger.instance.getComponent(UITransform);
        if (!rootTransform) return;

        const screenWidth = rootTransform.width * this.camera.rect.width;
        const screenHeight = rootTransform.height * this.camera.rect.height;

        // 计算正交相机的世界坐标视口
        const viewHeight = this.camera.orthoHeight * 2;
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
    /**更新摄像机位置，跟随角色 */
    updateCameraPos(isInit: boolean) {
        if (!this._followTarget || !this.camera) return;

        // 如果不跟随（正在拖动），直接返回
        if (!this.isCameraFollowing) return;

        // 获取角色的世界坐标
        const roleWorldPos = this._followTarget.worldPosition;

        // 获取相机节点
        const cameraNode = this.node;
        const currentPos = cameraNode.worldPosition;

        // 计算目标位置（跟随角色的世界坐标）
        let targetX = roleWorldPos.x;
        let targetY = roleWorldPos.y;


        var resultPos = this.CameraBoundsTranceWorldPos(v2(targetX, targetY))

        // 初始化时直接设置位置，之后平滑移动
        if (isInit) {
            // 初始化：直接设置为目标位置
            cameraNode.setPosition(resultPos.x, resultPos.y, currentPos.z);
        } else {
            // 平滑移动
            const smoothSpeed = 0.1;
            const newX = cameraNode.x + (resultPos.x - cameraNode.x) * smoothSpeed;
            const newY = cameraNode.y + (resultPos.y - cameraNode.y) * smoothSpeed;
            cameraNode.setPosition(newX, newY, currentPos.z);
        }
    }
    public CameraBoundsTranceWorldPos(cameraWorldPos: Vec2) {
        var localPos = this.camera.node.parent.getComponent(UITransform).convertToNodeSpaceAR(cameraWorldPos.toVec3())
        return this.CameraBoundsTranceLocalPos(localPos.toVec2());
    }
    /**更新摄像机边界值 */
    public UpdateCameraBounds(width: number, height: number) {
        // 计算摄像机边界（以 mapContainer 锚点为中心）
        this.cameraBounds.minX = -width * 0.5;
        this.cameraBounds.maxX = width * 0.5;
        this.cameraBounds.minY = -height * 0.5;
        this.cameraBounds.maxY = height * 0.5;
        // console.log(`[WildMapWin] 摄像机边界: (${this.cameraBounds.minX}, ${this.cameraBounds.minY}) 到 (${this.cameraBounds.maxX}, ${this.cameraBounds.maxY})`);

    }
    /**获取可视化范围格子 */
    public GetVisibleAreaGrids() {
        const cameraPos = this.node.worldPosition;

        // 从根节点的 UITransform 获取屏幕尺寸
        const rootTransform = UIMananger.instance.getComponent(UITransform);
        if (!rootTransform) {
            console.warn('[WildMapWin] 根节点 UITransform 未找到');
            return;
        }
        // 根据相机的 rect 和屏幕尺寸计算实际视口大小
        const screenWidth = rootTransform.width * this.camera.rect.width;
        const screenHeight = rootTransform.height * this.camera.rect.height;

        // 计算正交相机的世界坐标视口
        const viewHeight = this.camera.orthoHeight * 2;
        const viewWidth = viewHeight * (screenWidth / screenHeight);

        // 计算视口范围在地图中的位置（世界坐标）
        const viewMinX = cameraPos.x - viewWidth / 2;
        const viewMaxX = cameraPos.x + viewWidth / 2;
        const viewMinY = cameraPos.y - viewHeight / 2;
        const viewMaxY = cameraPos.y + viewHeight / 2;

        var worldPosMin = v3(viewMinX, viewMinY);
        var wolrdPosMax = v3(viewMaxX, viewMaxY);

        // 获取地图配置，计算地图格子边界
        const mapCfg = this.mapMgr.getMapCfg();
        if (!mapCfg) {
            return [this.mapMgr.WorldPosToGrid(worldPosMin), this.mapMgr.WorldPosToGrid(wolrdPosMax)];
        }

        const mapInfo = mapCfg.config.mapInfo;
        const maxGridXBound = Math.floor(mapInfo.mapPixelWidth / mapInfo.gridWidth) - 1;
        const maxGridYBound = Math.floor(mapInfo.mapPixelHeight / mapInfo.gridHeight) - 1;

        // 将世界坐标转换为地图本地坐标并计算格子坐标
        const mapTransform = this.mapMgr.getMapContainer().getComponent(UITransform);

        // 处理 minGridPos
        const localPosMin = mapTransform?.convertToNodeSpaceAR(worldPosMin);
        let minGridX = 0, minGridY = 0;
        if (localPosMin) {
            const mapWidth = mapInfo.mapPixelWidth;
            const mapHeight = mapInfo.mapPixelHeight;
            const offsetX = localPosMin.x + mapWidth / 2;
            const offsetY = localPosMin.y + mapHeight / 2;
            minGridX = Math.floor(offsetX / mapInfo.gridWidth);
            minGridY = Math.floor(offsetY / mapInfo.gridHeight);
        }
        // 分别限制 X 和 Y 坐标
        minGridX = Math.max(0, Math.min(minGridX, maxGridXBound));
        minGridY = Math.max(0, Math.min(minGridY, maxGridYBound));
        const minGridPos = this.mapMgr.getGrid(minGridX, minGridY);

        // 处理 MaxGridPos
        const localPosMax = mapTransform?.convertToNodeSpaceAR(wolrdPosMax);
        let maxGridXCalc = maxGridXBound, maxGridYCalc = maxGridYBound;
        if (localPosMax) {
            const mapWidth = mapInfo.mapPixelWidth;
            const mapHeight = mapInfo.mapPixelHeight;
            const offsetX = localPosMax.x + mapWidth / 2;
            const offsetY = localPosMax.y + mapHeight / 2;
            maxGridXCalc = Math.floor(offsetX / mapInfo.gridWidth);
            maxGridYCalc = Math.floor(offsetY / mapInfo.gridHeight);
        }
        // 分别限制 X 和 Y 坐标
        maxGridXCalc = Math.max(0, Math.min(maxGridXCalc, maxGridXBound));
        maxGridYCalc = Math.max(0, Math.min(maxGridYCalc, maxGridYBound));
        const MaxGridPos = this.mapMgr.getGrid(maxGridXCalc, maxGridYCalc);

        return [minGridPos, MaxGridPos];
    }
    public clear(): void {
        super.clear();
        this.lastUpdateCameraPos.set(Vec3.ZERO);
        this.node.position.set(Vec3.ZERO);
        this.lastUpdateCameraPos.set(Vec3.ZERO);
    }
}


