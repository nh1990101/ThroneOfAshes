import { _decorator, Component, EventTouch, Node, UITransform, Vec2 } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { GameEvent } from '../../Common/GameEnum';
import { EventManager } from '../../Common/EventManager';
import { MapMgr } from './MapMgr';
import { MapGridData } from './MapGridData';
import { MapConfig } from './MapConfig';
import { GameCamera } from './GameCamera';
import { UIMananger } from '../../Component/UIMananger';
import { MapBlock } from './MapBlock';
import { AssetMgr } from '../../Common/AssetMgr';
import { GameUrl } from '../../Common/GameUrl';
const { ccclass, property } = _decorator;

/**基础地图功能：地图块加载+点击事件 */
@ccclass('MapBase')
export class MapBase extends BaseComp {
    /**地图拖动相关 */
    protected isDragging: boolean = false;          // 是否正在拖动
    protected lastTouchPos: Vec2 = new Vec2();      // 上次触摸位置
    protected touchStartPos: Vec2 = new Vec2();     // 触摸开始位置
    protected dragThreshold: number = 10;           // 拖动阈值（像素，超过此距离视为拖动）
    // /**地图块总尺寸信息 */
    protected mapBlockInfo = {
        totalBlocksX: 0,
        totalBlocksY: 0,
        blockPixelSize: 0
    };

    /**当前可见的地图块 */
    protected visibleBlocks: Map<string, MapBlock> = new Map();
    /**视口范围（用于地图块加载优化） */
    protected viewportPadding: number = 2; // 视口外扩格子数（不是像素）
    protected mapConfig: MapConfig;
    public initEvent(): void {
        super.initEvent();
        this.initMapClickEvent();
        this.addEvent(GameEvent.UpdateMapBlock, this.updateMapInfo, this);
    }
    /**创建地图块 */
    public createMapBock(mapConfig: MapConfig) {
        this.mapConfig = mapConfig;
        const mapInfo = mapConfig.config.mapInfo;

        const mapTransform = this.getComponent(UITransform);
        if (mapTransform) {
            mapTransform.setContentSize(mapInfo.mapPixelWidth, mapInfo.mapPixelHeight);
        }

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
 * 初始化地图点击事件
 */
    private initMapClickEvent() {
        this.addNodeEvent(this.node, Node.EventType.TOUCH_START, this.onMapTouchStart, this);
        this.addNodeEvent(this.node, Node.EventType.TOUCH_MOVE, this.onMapTouchMove, this);
        this.addNodeEvent(this.node, Node.EventType.TOUCH_END, this.onMapTouchEnd, this);
        this.addNodeEvent(this.node, Node.EventType.TOUCH_CANCEL, this.onMapTouchCancel, this);
    }
    /**
   * 触摸开始
   */
    private onMapTouchStart(event: EventTouch) {
        const touchPos = event.getUILocation();
        this.touchStartPos.set(touchPos.x, touchPos.y);
        this.lastTouchPos.set(touchPos.x, touchPos.y);
        this.isDragging = false;
        EventManager.Instance.dispatch(GameEvent.MapTouchBegin, event);
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

            EventManager.Instance.dispatch(GameEvent.MapDraging, currentPos, this.lastTouchPos)
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

        EventManager.Instance.dispatch(GameEvent.MapEndTouch, event);
    }

    /**
     * 触摸取消
     */
    private onMapTouchCancel(event: EventTouch) {
        this.isDragging = false;
        EventManager.Instance.dispatch(GameEvent.MapCancleTouch, event);
    }
    /**地图点击事件 */
    private onMapClick(event: EventTouch) {
        EventManager.Instance.dispatch(GameEvent.MapClick, event)
    }
    /**
        * 更新可见的地图块（基于摄像机视口）
        */
    public updateVisibleBlocks() {
        var mapCamera = GameCamera.instance.camera;
        if (!mapCamera) {
            console.warn('[WildMapWin] mapCamera 未初始化');
            return;
        }
        const cameraPos = mapCamera.node.worldPosition;
        const tileSize = this.mapBlockInfo.blockPixelSize;

        // 从根节点的 UITransform 获取屏幕尺寸
        const rootTransform = UIMananger.instance.getComponent(UITransform);
        if (!rootTransform) {
            console.warn('[WildMapWin] 根节点 UITransform 未找到');
            return;
        }

        // 根据相机的 rect 和屏幕尺寸计算实际视口大小
        const screenWidth = rootTransform.width * mapCamera.rect.width;
        const screenHeight = rootTransform.height * mapCamera.rect.height;

        // 计算地图的起始坐标（左下角）
        const mapTransform = this.getComponent(UITransform);
        const mapStartX = -mapTransform.width / 2;
        const mapStartY = -mapTransform.height / 2;


        // 计算正交相机的世界坐标视口
        const viewHeight = mapCamera.orthoHeight * 2;
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
    /**
         * 创建单个地图块
         */
    private async createMapBlockTile(x: number, y: number) {
        const key = `${x},${y}`;

        // 防止重复创建
        if (this.visibleBlocks.has(key)) return;

        // 计算地图块位置（从地图左下角开始）
        const mapTransform = this.getComponent(UITransform);
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
            this.node,
            MapBlock
        );

        block.SetData(this.mapConfig.config.mapInfo.mapName, new Vec2(x, y));
        block.ShowMapCell();

        // 添加到可见列表
        this.visibleBlocks.set(key, block);
    }
    updateMapInfo() {
        this.updateVisibleBlocks();
    }
    public clear(): void {
        super.clear();
        // 清理可见的地图块
        this.visibleBlocks.forEach(block => {
            block.HideMapCell();
            AssetMgr.removeNode(block.node);
        });
        this.visibleBlocks.clear();
    }

}


