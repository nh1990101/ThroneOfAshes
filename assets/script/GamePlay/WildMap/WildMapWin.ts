import { _decorator, Camera, Component, Node, Vec2, Vec3, UITransform, EventTouch, Input, Graphics, Label, Color, v2 } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { MapMgr } from './MapMgr';
import { child, comp } from '../../Common/Decorator';
import { WildRole } from './WildRole';
import { AssetMgr } from '../../Common/AssetMgr';
import { GameUrl } from '../../Common/GameUrl';
import { ROLE_DIR } from '../../Common/GameEnum';
import { MapConfig, IMapObject } from './MapConfig';
import { MapBlock } from './MapBlock';
import { MapGridData } from './MapGridData';
import { RectPathFindingMgr } from './RectPathFindingMgr';
import { MapObject } from './MapObject';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { UIMananger } from '../../Component/UIMananger';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
const { ccclass, property } = _decorator;

@ccclass('WildMapWin')
export class WildMapWin extends BaseWin {
    /**地图摄像机 */
    @comp(Camera)
    mapCamera: Camera = null!;
    /**地图块容器 */
    @child()
    mapContainer: Node = null!;;

    @child()
    objectContainer: Node = null!;


    @comp(BaseBtn)
    btn_ShowGridPos: BaseBtn = null!;
    @comp(BaseBtn)
    btn_BackCity: BaseBtn = null!;

    @comp(BaseSprite)
    testCameraCenter: BaseSprite = null!;


    protected mapId: number = null;
    protected role: WildRole = null;
    protected mapCfg: MapConfig;



    /**寻路管理器 */
    private pathFindingMgr: RectPathFindingMgr = new RectPathFindingMgr();




    /**地图拖动相关 */
    private isDragging: boolean = false;          // 是否正在拖动
    private longPressTimer: number = 0;           // 长按计时器
    private longPressThreshold: number = 0.3;     // 长按阈值（秒）
    private lastTouchPos: Vec2 = new Vec2();      // 上次触摸位置
    private touchStartPos: Vec2 = new Vec2();     // 触摸开始位置
    private dragThreshold: number = 10;           // 拖动阈值（像素，超过此距离视为拖动）
    private isCameraFollowing: boolean = true;    // 摄像机是否跟随角色

    /**网格显示相关 */
    private gridDebugNode: Node = null;           // 网格调试节点
    private isGridVisible: boolean = false;       // 网格是否可见

    //是否全屏
    public get Is_FullScene() {
        return true;
    }
    showWin(mapId: number): void {
        super.showWin(mapId);
        this.mapId = mapId;
    }
    public initEvent(): void {
        super.initEvent();
        this.initMapClickEvent();

    }
    public OnRefreshUI(): void {
        super.OnRefreshUI();
        this.Mgr.LoadMap(this.mapId).then(() => this.initMap());
    }

    initMap() {
        this.mapCfg = MapMgr.getInstance().getMapCfg();

        this.Mgr.initMapReferences(this.mapContainer, this.objectContainer, this.mapCamera, this.testCameraCenter.node);
        // 初始化格子大小
        MapGridData.WIDTH_PX = this.mapCfg.GetGridWidthPx();
        MapGridData.HEIGHT_PX = this.mapCfg.GetGridHeightPx();
        console.log(`[WildMapWin] MapGridData 格子尺寸初始化: ${MapGridData.WIDTH_PX} x ${MapGridData.HEIGHT_PX}`);

        // 设置 mapContainer 的尺寸为实际地图大小
        const mapInfo = this.mapCfg.config.mapInfo;
        const mapTransform = this.mapContainer.getComponent(UITransform);
        if (mapTransform) {
            mapTransform.setContentSize(mapInfo.mapPixelWidth, mapInfo.mapPixelHeight);
            console.log(`[WildMapWin] 设置 mapContainer 尺寸: ${mapInfo.mapPixelWidth} x ${mapInfo.mapPixelHeight}`);
            this.Mgr.UpdateCameraBounds();
        }
        // 创建格子数据
        this.Mgr.createGridData();

        // 初始化寻路系统
        this.pathFindingMgr.UpdateMapGrid(MapMgr.getInstance().getAllGridsMap());
        this.pathFindingMgr.setDirectionMode(false); // 使用4方向寻路
        // 初始化角色
        this.initRolePos();
        // 创建地图块
        this.Mgr.createMapBock();

        // 创建地图物件
        // this.createMapObjects();




    }



    /**初始化角色位置 */
    async initRolePos() {
        // 获取出生点
        const spawnPoint = this.mapCfg.config.spawnPoints?.[0] || { x: 5, y: 5 };

        const worldPos = this.Mgr.getGrid(spawnPoint.x, spawnPoint.y).GetWorldPos();

        console.log(`[WildMapWin] 角色出生点格子坐标: (${spawnPoint.x}, ${spawnPoint.y})`);

        this.role = await AssetMgr.createPrefabFromPool(
            GameUrl.WildMapPrefab.format("WildRole"),
            worldPos,
            this.objectContainer,
            WildRole
        );

        await this.role.LoadAndPlay(1, ROLE_DIR.DOWN);


        // 设置角色所在格子
        const startGrid = this.Mgr.getGrid(spawnPoint.x, spawnPoint.y);
        if (startGrid) {
            this.role.setGrid(startGrid);
        }

        this.updateCameraPos(true);

        console.log(`[WildMapWin] 摄像机初始位置: (${this.mapCamera.node.position.x}, ${this.mapCamera.node.position.y})`);

        this.Mgr.updateAllNodesSortOrder();
    }

    /**
     * 初始化地图点击事件
     */
    private initMapClickEvent() {
        // 在 mapContainer 上注册触摸事件（不是 this.node）
        // 因为 mapContainer 是地图内容的容器，能正确接收触摸坐标
        this.addNodeEvent(this.mapContainer, Node.EventType.TOUCH_START, this.onMapTouchStart, this);
        this.addNodeEvent(this.mapContainer, Node.EventType.TOUCH_MOVE, this.onMapTouchMove, this);
        this.addNodeEvent(this.mapContainer, Node.EventType.TOUCH_END, this.onMapTouchEnd, this);
        this.addNodeEvent(this.mapContainer, Node.EventType.TOUCH_CANCEL, this.onMapTouchCancel, this);
        this.addNodeEvent(this.btn_ShowGridPos.node, Node.EventType.TOUCH_END, this.OnClickShowGridPos, this);
        this.addNodeEvent(this.btn_BackCity.node, Node.EventType.TOUCH_END, this.OnClickBackCity, this);
    }

    /**
     * 触摸开始
     */
    private onMapTouchStart(event: EventTouch) {
        const touchPos = event.getUILocation();
        this.touchStartPos.set(touchPos.x, touchPos.y);
        this.lastTouchPos.set(touchPos.x, touchPos.y);
        this.longPressTimer = 0;
        this.isDragging = false;
    }

    /**
     * 触摸移动
     */
    private onMapTouchMove(event: EventTouch) {
        const touchPos = event.getUILocation();
        const currentPos = new Vec2(touchPos.x, touchPos.y);

        // 计算移动距离
        const distance = Vec2.distance(this.touchStartPos, currentPos);

        // 如果移动距离超过阈值，进入拖动模式
        if (distance > this.dragThreshold) {
            this.isDragging = true;
            this.isCameraFollowing = false; // 停止摄像机跟随

            // 计算拖动偏移（UI坐标系）
            const deltaX = currentPos.x - this.lastTouchPos.x;
            const deltaY = currentPos.y - this.lastTouchPos.y;

            // 移动摄像机（注意方向相反）
            this.dragCamera(-deltaX, -deltaY);

            this.lastTouchPos.set(currentPos.x, currentPos.y);
        }
    }

    /**
     * 触摸结束
     */
    private onMapTouchEnd(event: EventTouch) {
        // 如果没有拖动，视为点击移动
        if (!this.isDragging) {
            this.onMapClick(event);
        }

        // 重置状态
        this.isDragging = false;
        this.longPressTimer = 0;

        // 恢复摄像机跟随（可选：点击移动后恢复跟随）
        this.isCameraFollowing = true;
    }

    /**
     * 触摸取消
     */
    private onMapTouchCancel(event: EventTouch) {
        this.isDragging = false;
        this.longPressTimer = 0;
        this.isCameraFollowing = true;
    }

    /**
     * 拖动摄像机
     */
    private dragCamera(deltaX: number, deltaY: number) {
        const cameraNode = this.mapCamera.node;
        const currentPos = cameraNode.position;


        // UI坐标到世界坐标的转换比例
        const worldToUIRatio = UIMananger.instance.GetUIRatio(this.mapCamera);

        // 计算新位置
        let newX = currentPos.x + deltaX * worldToUIRatio;
        let newY = currentPos.y + deltaY * worldToUIRatio;

        var resultPos = this.Mgr.CameraBoundsTranceLocalPos(v2(newX, newY))

        cameraNode.setPosition(resultPos.x, resultPos.y, currentPos.z);
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

        if (!targetGrid) {
            console.warn('[WildMapWin] 点击位置不在地图范围内');
            return;
        }

        if (!targetGrid.walkable) {
            console.warn('[WildMapWin] 目标格子不可行走');
            return;
        }

        if (targetGrid.occupied) {
            console.warn('[WildMapWin] 目标格子已被占据');
            return;
        }

        // 寻路
        const currentGrid = this.role.getCurrentGrid();
        if (!currentGrid) {
            console.warn('[WildMapWin] 角色当前格子无效');
            return;
        }

        const path = this.pathFindingMgr.findPath(currentGrid, targetGrid);
        if (path.length === 0) {
            console.warn('[WildMapWin] 无法找到路径');
            return;
        }

        console.log(`[WildMapWin] 找到路径，长度: ${path.length}`);

        // 开始移动（点击移动后恢复摄像机跟随）
        this.isCameraFollowing = true;
        this.role.moveAlongPath(path).then(() => {
            console.log('[WildMapWin] 移动完成');
            this.Mgr.updateAllNodesSortOrder();
        });
    }

    /**更新摄像机位置，跟随角色 */
    updateCameraPos(isInit: boolean) {
        if (!this.role || !this.mapCamera) return;

        // 如果不跟随（正在拖动），直接返回
        if (!this.isCameraFollowing) return;

        // 获取角色的世界坐标
        const roleWorldPos = this.role.node.worldPosition;

        // 获取相机节点
        const cameraNode = this.mapCamera.node;
        const currentPos = cameraNode.worldPosition;

        // 计算目标位置（跟随角色的世界坐标）
        let targetX = roleWorldPos.x;
        let targetY = roleWorldPos.y;


        var resultPos = this.Mgr.CameraBoundsTranceWorldPos(v2(targetX, targetY))

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



    /**上次更新地图块的摄像机位置 */
    private lastUpdateCameraPos: Vec3 = new Vec3();
    /**摄像机移动多少距离后更新地图块 */
    private updateBlockThreshold: number = 32;

    /**
     * 每帧更新
     */
    protected update(dt: number): void {
        // 摄像机平滑跟随
        if (this.role && this.role.getIsMoving()) {
            this.updateCameraPos(false);
            // 移动时实时更新排序
            this.Mgr.updateAllNodesSortOrder();
        }

        // 定期更新可见地图块
        if (this.mapCamera) {
            const currentPos = this.mapCamera.node.position;
            const distance = Vec3.distance(currentPos, this.lastUpdateCameraPos);

            // 当摄像机移动超过阈值时，更新地图块
            if (distance > this.updateBlockThreshold) {
                this.Mgr.updateVisibleBlocks();
                this.Mgr.UpdateVisibleMapObj();
                this.lastUpdateCameraPos.set(currentPos);
            }
        }
    }

    /**
     * 显示/隐藏网格坐标
     */
    OnClickShowGridPos() {
        this.isGridVisible = !this.isGridVisible;

        if (this.isGridVisible) {
            this.showGridDebug();
        } else {
            this.hideGridDebug();
        }
    }
    closeWin(): void {
        super.closeWin();
        this.clear();
    }
    OnClickBackCity() {
        this.closeWin();

    }

    /**
     * 显示网格调试信息（显示逻辑行走格子）
     */
    private showGridDebug() {
        // 如果已经存在，先清理
        if (this.gridDebugNode) {
            this.gridDebugNode.destroy();
            this.gridDebugNode = null;
        }

        // 创建网格调试节点
        this.gridDebugNode = new Node('GridDebug');
        this.gridDebugNode.layer = this.mapContainer.layer; // 使用 layer 0，确保摄像机能看到
        this.gridDebugNode.setParent(this.mapContainer);
        this.gridDebugNode.setPosition(0, 0, 0);

        const mapInfo = this.mapCfg.config.mapInfo;

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
        const mapTransform = this.mapContainer.getComponent(UITransform);
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


    }

    /**
     * 隐藏网格调试信息
     */
    private hideGridDebug() {
        if (this.gridDebugNode) {
            this.gridDebugNode.destroy();
            this.gridDebugNode = null;
        }
        console.log('[WildMapWin] 网格显示已关闭');
    }

    /**
     * 清理资源
     */
    public clear() {
        // 清理网格调试节点
        this.hideGridDebug();

        // 清理角色
        if (this.role) {
            AssetMgr.removeNode(this.role.node);
            this.role = null;
        }

        // 清理格子数据
        this.Mgr.Clear();


        this.mapCamera.node.position = Vec3.ZERO;
        super.clear();
    }

    get Mgr() {
        return MapMgr.getInstance();
    }
}


