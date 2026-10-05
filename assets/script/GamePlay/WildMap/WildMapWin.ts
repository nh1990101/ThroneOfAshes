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
    roleContainer: Node = null!;

    @child()
    objectContainer: Node = null!;

    @comp(BaseBtn)
    btn_ShowGridPos: BaseBtn = null!;
    @comp(BaseBtn)
    btn_BackCity: BaseBtn = null!;



    protected mapId: number = null;
    protected role: WildRole = null;
    protected mapCfg: MapConfig;

    /**地图块池 */
    private mapBlocks: MapBlock[] = [];
    /**地图物件 */
    private mapObjects: Map<string, MapObject> = new Map();

    /**寻路管理器 */
    private pathFindingMgr: RectPathFindingMgr = new RectPathFindingMgr();


    /**视口范围（用于地图块加载优化） */
    private viewportPadding: number = 2; // 视口外扩格子数（不是像素）

    /**当前可见的地图块 */
    private visibleBlocks: Map<string, MapBlock> = new Map();

    /**地图块总尺寸信息 */
    private mapBlockInfo = {
        totalBlocksX: 0,
        totalBlocksY: 0,
        blockPixelSize: 0
    };

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

        this.Mgr.initMapReferences(this.mapContainer, this.mapCamera);
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
        this.createGridData();

        // 初始化寻路系统
        this.pathFindingMgr.UpdateMapGrid(MapMgr.getInstance().getAllGridsMap());
        this.pathFindingMgr.setDirectionMode(false); // 使用4方向寻路

        // 创建地图块
        this.createMapBock();

        // 创建地图物件
        this.createMapObjects();

        // 初始化角色
        this.initRolePos();


    }



    /**
     * 创建格子数据
     */
    private createGridData() {
        MapMgr.getInstance().clearAllGrids();

        const mapInfo = this.mapCfg.config.mapInfo;

        // 计算逻辑格子数量：地图总像素 / 每格像素
        const maxGridX = Math.floor(mapInfo.mapPixelWidth / mapInfo.gridWidth);
        const maxGridY = Math.floor(mapInfo.mapPixelHeight / mapInfo.gridHeight);

        console.log(`[WildMapWin] 地图尺寸: ${mapInfo.mapPixelWidth}x${mapInfo.mapPixelHeight}px`);
        console.log(`[WildMapWin] 每格尺寸: ${mapInfo.gridWidth}x${mapInfo.gridHeight}px`);
        console.log(`[WildMapWin] 逻辑格子数: ${maxGridX}x${maxGridY}`);

        for (let x = 0; x < maxGridX; x++) {
            for (let y = 0; y < maxGridY; y++) {
                const blockData = this.mapCfg.GetBlock(x, y);
                const walkable = !blockData || blockData.movable !== 0;

                const grid = new MapGridData(x, y, walkable);
                MapMgr.getInstance().setGrid(grid);
            }
        }

        console.log(`[WildMapWin] 创建了 ${MapMgr.getInstance().getGridCount()} 个格子数据`);


    }

    /**创建地图块 */
    createMapBock() {
        const mapInfo = this.mapCfg.config.mapInfo;
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
    private updateVisibleBlocks() {
        if (!this.mapCamera) {
            console.warn('[WildMapWin] mapCamera 未初始化');
            return;
        }

        const cameraPos = this.mapCamera.node.position;
        const tileSize = this.mapBlockInfo.blockPixelSize;

        // 从根节点的 UITransform 获取屏幕尺寸
        const rootTransform = this.node.getComponent(UITransform);
        if (!rootTransform) {
            console.warn('[WildMapWin] 根节点 UITransform 未找到');
            return;
        }

        // 根据相机的 rect 和屏幕尺寸计算实际视口大小
        const screenWidth = rootTransform.width * this.mapCamera.rect.width;
        const screenHeight = rootTransform.height * this.mapCamera.rect.height;

        // 正交相机：orthoHeight 是世界坐标高度的一半
        const viewHeight = this.mapCamera.orthoHeight * 2;
        const viewWidth = viewHeight * (screenWidth / screenHeight);

        console.log(`[WildMapWin] 视口尺寸: ${viewWidth} x ${viewHeight}, 相机位置: (${cameraPos.x}, ${cameraPos.y})`);

        // 计算地图的起始坐标（左下角）
        const mapTransform = this.mapContainer.getComponent(UITransform);
        const mapStartX = -mapTransform.width / 2;
        const mapStartY = -mapTransform.height / 2;

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

        block.SetData(this.mapId, new Vec2(x, y));
        block.ShowMapCell();

        // 添加到可见列表
        this.visibleBlocks.set(key, block);
    }

    /**
     * 创建地图物件
     */
    private createMapObjects() {
        const objects = this.mapCfg.config.mapInfo.objects;
        if (!objects || objects.length === 0) return;

        for (const objData of objects) {
            this.createMapObject(objData);
        }
    }

    /**
     * 创建单个地图物件
     */
    private async createMapObject(objData: IMapObject) {
        const worldPos = this.Mgr.gridToWorldPos(objData.gridX, objData.gridY);

        const mapObj = await AssetMgr.createPrefabFromPool(
            GameUrl.WildMapPrefab.format("MapObject"),
            worldPos,
            this.objectContainer,
            MapObject
        );

        mapObj.SetData(objData);

        // 标记占据的格子为不可行走
        if (!objData.walkable) {
            for (let ox = 0; ox < objData.occupyX; ox++) {
                for (let oy = 0; oy < objData.occupyY; oy++) {
                    const grid = MapMgr.getInstance().getGrid(objData.gridX + ox, objData.gridY + oy);
                    if (grid) {
                        grid.walkable = false;
                    }
                }
            }
        }

        this.mapObjects.set(`${objData.gridX},${objData.gridY}`, mapObj);
    }

    /**初始化角色位置 */
    async initRolePos() {
        // 获取出生点
        const spawnPoint = this.mapCfg.config.spawnPoints?.[0] || { x: 5, y: 5 };

        const worldPos = this.Mgr.gridToWorldPos(spawnPoint.x, spawnPoint.y);

        console.log(`[WildMapWin] 角色出生点格子坐标: (${spawnPoint.x}, ${spawnPoint.y})`);

        this.role = await AssetMgr.createPrefabFromPool(
            GameUrl.WildMapPrefab.format("WildRole"),
            worldPos,
            this.roleContainer,
            WildRole
        );

        await this.role.LoadAndPlay(1, ROLE_DIR.DOWN);


        // 设置角色所在格子
        const startGrid = MapMgr.getInstance().getGrid(spawnPoint.x, spawnPoint.y);
        if (startGrid) {
            this.role.setGrid(startGrid);
        }

        this.updateCameraPos(true);

        console.log(`[WildMapWin] 摄像机初始位置: (${this.mapCamera.node.position.x}, ${this.mapCamera.node.position.y})`);

        this.updateAllNodesSortOrder();
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
            this.updateAllNodesSortOrder();
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

    /**
     * 更新所有节点的层级排序（Y排序）
     * Y坐标越小，zIndex越大（越靠前显示）
     */
    private updateAllNodesSortOrder() {
        // 收集所有需要排序的节点
        const sortableNodes: { node: Node, y: number }[] = [];

        // 角色
        if (this.role && this.role.node) {
            sortableNodes.push({
                node: this.role.node,
                y: this.role.node.position.y
            });
        }

        // 地图物件
        this.mapObjects.forEach(obj => {
            if (obj && obj.node) {
                sortableNodes.push({
                    node: obj.node,
                    y: obj.node.position.y
                });
            }
        });

        // 按Y坐标排序（Y越小越靠前）
        sortableNodes.sort((a, b) => b.y - a.y);

        // 设置zIndex
        sortableNodes.forEach((item, index) => {
            item.node.setSiblingIndex(index);
        });
    }

    /**上次更新地图块的摄像机位置 */
    private lastUpdateCameraPos: Vec3 = new Vec3();
    /**摄像机移动多少距离后更新地图块 */
    private updateBlockThreshold: number = 100;

    /**
     * 每帧更新
     */
    protected update(dt: number): void {
        // 摄像机平滑跟随
        if (this.role && this.role.getIsMoving()) {
            this.updateCameraPos(false);
            // 移动时实时更新排序
            this.updateAllNodesSortOrder();
        }

        // 定期更新可见地图块
        if (this.mapCamera) {
            const currentPos = this.mapCamera.node.position;
            const distance = Vec3.distance(currentPos, this.lastUpdateCameraPos);

            // 当摄像机移动超过阈值时，更新地图块
            if (distance > this.updateBlockThreshold) {
                this.updateVisibleBlocks();
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

        // 清理可见的地图块
        this.visibleBlocks.forEach(block => {
            block.HideMapCell();
            AssetMgr.removeNode(block.node);
        });
        this.visibleBlocks.clear();

        // 清理地图物件
        this.mapObjects.forEach(obj => {
            AssetMgr.removeNode(obj.node);
        });
        this.mapObjects.clear();

        // 清理角色
        if (this.role) {
            AssetMgr.removeNode(this.role.node);
            this.role = null;
        }

        // 清理格子数据
        this.Mgr.clearAllGrids();


        this.mapCamera.node.position = Vec3.ZERO;
        super.clear();
    }

    get Mgr() {
        return MapMgr.getInstance();
    }
}


