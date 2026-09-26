import { _decorator, Component, Node, EventTouch, Vec2, Vec3, UITransform } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BattleUnit } from './BattleUnit';
import { GameEvent, UNIT_ACTION } from '../../Common/GameEnum';
import { BattleMgr } from './BattleMgr';
import { BattleMapMgr } from './BattleMapMgr';
import { HexagonData } from './HexagonData';
import { HexagonCell } from './HexagonCell';
import { PathFindingMgr } from '../../Common/PathFindingMgr';
const { ccclass, property } = _decorator;

@ccclass('BattleWin')
export class BattleWin extends BaseWin {

    @property(BaseBtn)
    btn_HideGrid: BaseBtn = null!;

    @property(BaseBtn)
    btn_showGridLb: BaseBtn = null!;

    @property(Node)
    mapContainer: Node = null;

    @property(Node)
    unitContainer: Node = null;

    @property(BaseBtn)
    btn_close: BaseBtn = null!;

    /**选中可操作的单位 */
    selectUnit: BattleUnit = null;

    /**开始拖拽的单位 */
    private _beginDragUnit: BattleUnit = null;
    private _beginDragPos: Vec2;
    private _lastMovingGrid: HexagonCell;

    public initEvent(): void {

        super.initEvent();
        this.addEvent(GameEvent.Select_Grid_Battle_Unit, this.OnSelectUnit, this);
        this.addEvent(GameEvent.Clear_Battle_Select_Unit, this.OnClearSelectUnit, this);


        this.addNodeEvent(this.btn_showGridLb.node, Node.EventType.TOUCH_END, this.OnTapShowGridPos);
        this.addNodeEvent(this.btn_HideGrid.node, Node.EventType.TOUCH_END, this.OnTapHideGridPos);
        // 添加地图点击事件
        if (this.mapContainer) {
            this.addNodeEvent(this.mapContainer, Node.EventType.TOUCH_END, this.onMapClick);
            this.addNodeEvent(this.mapContainer, Node.EventType.TOUCH_START, this.onDragBegin);
            this.addNodeEvent(this.mapContainer, Node.EventType.TOUCH_MOVE, this.onDragMove);
            this.addNodeEvent(this.mapContainer, Node.EventType.TOUCH_CANCEL, this.onDragCancle);
        }
    }
    async OnRefreshUI() {
        super.OnRefreshUI();


        //战斗地图初始化
        var mapMgr = BattleMapMgr.getInstance();
        mapMgr.mapContainer = this.mapContainer;
        await mapMgr.initMap();

        //战斗主逻辑初始化
        BattleMgr.getInstance().Init(this.mapContainer, this.unitContainer);


    }
    closeWin(): void {
        super.closeWin();

        //清除战斗地图格子数据
        var mapMgr = BattleMapMgr.getInstance();
        mapMgr.clearMap();

        //清除战斗逻辑数据
        BattleMgr.getInstance().Clear();

        this.selectUnit = null;

        this.ClearDrag();
    }
    /**获取触摸格子*/
    private onTouchGridHandle(event: EventTouch): HexagonCell {
        // 获取点击位置（世界坐标）
        const touchPos = event.getUILocation();

        return this.GetGridCellByLocalPos(touchPos);

    }
    private GetGridCellByLocalPos(touchPos: Vec2) {

        const uiTransform = this.mapContainer.getComponent(UITransform);
        if (!uiTransform) {
            console.warn('mapContainer没有UITransform组件');
            return null;
        }
        // 将触摸位置转换为mapContainer的本地坐标
        const localPos = uiTransform.convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0));

        // 将本地坐标转换为六边形坐标（不创建实例，性能更好）
        const coord = HexagonData.pixelToCoord(localPos.x, localPos.y);

        // 获取地图管理器
        const mapMgr = BattleMapMgr.getInstance();

        // 检查点击的格子是否在地图上
        const clickedCell = mapMgr.getHexCell(coord.q, coord.r);

        if (clickedCell) {

            return clickedCell;

        } else {
            console.log(`点击位置不在有效格子上: (${coord.q}, ${coord.r})`);
            return null;
        }
    }
    /**
     * 地图点击事件处理
     */
    private onMapClick(event: EventTouch): void {
        //拖动操作
        if (!this.CheckIsCanNotDrag() && this._lastMovingGrid) {

            var resultGridData = this._lastMovingGrid.GetData();
            this._beginDragUnit.SetMapGridPos(resultGridData.pos);

        }
        //点击操作
        else {

            // 检查点击的格子是否在地图上
            const clickedCell = this.onTouchGridHandle(event);
            if (clickedCell) {

                const cellData = clickedCell.GetData();
                console.log(`点击了六边形格子: (${cellData.q}, ${cellData.r})`);
                if (clickedCell) {

                    this.onHexCellClicked(clickedCell);
                }
            } else {
                console.log(`点击了区域外，找不到格子`);
            }
        }
        this.ClearDrag();

    }


    /**
     * 六边形格子点击回调（可以在这里添加业务逻辑）
     * @param cell 点击的格子视图
     * @param data 点击的格子数据
     */
    private onHexCellClicked(cell: HexagonCell): void {
        // 示例：高亮显示点击的格子
        // 可以在这里添加你的业务逻辑，比如：
        // - 移动单位到该格子
        // - 显示格子信息
        // - 标记选中状态
        // - 显示可移动范围等

        const data: HexagonData = cell.GetData();

        console.log(`格子信息: 坐标(${data.q},${data.r}), 可行走:${data.walkable}, 占据:${data.occupiedUnitId || '无'}`);



        var mapMgr = BattleMapMgr.getInstance();
        if (this.selectUnit) {

            if (data.highlighted && data.isEmpty() && data.isWalkable()) {
                var fromData = mapMgr.getHexDataFromPos(this.selectUnit.GetMapPos());
                this.selectUnit.StartMove(PathFindingMgr.getInstance().findPath(fromData, data));

            }
            this.OnClearSelectUnit();
        } else {

            mapMgr.SelectHexGridForMove(data.q, data.r);
        }
    }
    /**
     * 显示格子坐标
     */
    private OnTapShowGridPos() {
        var mapMgr = BattleMapMgr.getInstance();
        mapMgr.getAllHexCells().forEach(cell => {
            cell.ShowPosLabel(true)
        })
        this.btn_HideGrid.node.active = true;
        this.btn_showGridLb.node.active = false;
    }
    /**
     * 隐藏格子坐标
     */
    private OnTapHideGridPos() {
        var mapMgr = BattleMapMgr.getInstance();
        mapMgr.getAllHexCells().forEach(cell => {
            cell.ShowPosLabel(false)
        });
        this.btn_HideGrid.node.active = false;
        this.btn_showGridLb.node.active = true;
    }
    /**
     * 选中单位操作
     */
    private OnSelectUnit(selectUnit: BattleUnit) {
        this.selectUnit = selectUnit;
    }
    private OnClearSelectUnit() {
        this.selectUnit = null;
        var mapMgr = BattleMapMgr.getInstance();
        mapMgr.ClearHightLight();
    }

    /**开始拖拽*/
    private onDragBegin(event: EventTouch) {
        if (this.selectUnit) {
            return;
        }
        // 检查点击的格子是否在地图上
        const clickedCell = this.onTouchGridHandle(event);

        if (clickedCell) {

            const data: HexagonData = clickedCell.GetData();
            var battleMgr = BattleMgr.getInstance();
            var unitId = data.getOccupiedUnit();
            if (unitId && battleMgr.CheckIsMyUnitById(unitId)) {
                this._beginDragUnit = battleMgr.GetUnitByUID(unitId);
                this._beginDragPos = event.getUILocation();
            }
        }
    }
    /**拖拽单位跟着移动 */
    private onDragMove(event: EventTouch) {
        //经过的格子
        if (this.CheckIsCanNotDrag()) {
            return;
        }

        var movingPos = event.getUILocation();

        const uiTransform = this.unitContainer.getComponent(UITransform);
        if (!uiTransform) {
            console.warn('mapContainer没有UITransform组件');
            return null;
        }

        const localPos = uiTransform.convertToNodeSpaceAR(new Vec3(movingPos.x, movingPos.y, 0));
        this._beginDragUnit.node.setPosition(localPos);

        const movingCell = this.onTouchGridHandle(event);
        if (!movingCell) {
            return;
        }
        const movingCellData = movingCell.GetData();

        if (!this._lastMovingGrid) {
            this._lastMovingGrid = movingCell;
        }
        //设置经过的格子
        if (this._lastMovingGrid && this._lastMovingGrid != movingCell && movingCellData.isEmpty() && movingCellData.isWalkable()) {
            this._lastMovingGrid.SetNormal();
            movingCell.SetGreen();
            this._lastMovingGrid = movingCell;
        }
    }
    /**拖出触碰范围外 */
    private onDragCancle(event: EventTouch) {
        if (this.CheckIsCanNotDrag()) {
            return;
        }
        if (!this._lastMovingGrid && this._beginDragUnit) {
            var beginCell = this.GetGridCellByLocalPos(this._beginDragPos);
            if (beginCell) {
                this._beginDragUnit.SetMapGridPos(beginCell.GetData().pos);
            }
        }

        this.ClearDrag();
    }
    /**是否不能拖拽 */
    private CheckIsCanNotDrag() {
        return this.selectUnit || !this._beginDragUnit
    }
    /**清除拖拽数据 */
    private ClearDrag() {
        this._beginDragPos = null;
        this._beginDragUnit = null;

        if (this._lastMovingGrid != null) {
            this._lastMovingGrid.SetNormal();
            this._lastMovingGrid = null;
        }
    }
}


