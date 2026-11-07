import { _decorator, Component, EventTouch, Node, UITransform, Vec2, Vec3 } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { HexagonCell } from './HexagonCell';
import { BattleUnit } from './BattleUnit';
import { HexagonData, HexagonPos } from './HexagonData';
import { BattleMapMgr } from './BattleMapMgr';
import { BattleMgr } from './BattleMgr';
import { EventManager } from '../../Common/EventManager';
import { GameEvent, HEXGON_GRID_COLOR, MOVE_TYPE } from '../../Common/GameEnum';
import { HexgonMap } from './HexgonMap';
import { PathFindingMgr } from '../../Common/PathFindingMgr';
const { ccclass, property } = _decorator;

@ccclass('BattleMapCom')
export class BattleMapCom extends HexgonMap {

    /**选中可操作的单位 */
    selectUnit: BattleUnit = null;

    /**开始拖拽的单位 */
    protected _beginDragUnit: BattleUnit = null;
    protected _beginDragPos: Vec2;
    protected _lastMovingGrid: HexagonCell;
    protected unitContainer: Node;
    protected _hightLightGrids: HexagonData[];
    protected _breathingGrids: HexagonCell[] = [];
    /**技能预览与移动高亮、攻击落点提示分别管理 */
    private _skillAttackAreaCells: Set<HexagonCell> = new Set();
    private _skillAttackAreaCenter: HexagonCell = null;
    private _skillAttackAreaRadius: number = -1;
    public initBattleMap(unitContainer: Node) {
        this.unitContainer = unitContainer;
        this.unitContainer.setPosition(this.node.position);
        this._breathingGrids = [];
    }
    public initEvent(): void {
        super.initEvent();
    }
    /**
       * 地图点击事件处理
       */
    protected onMapClick(event: EventTouch): void {
        //拖动操作
        if (!this.CheckIsCanNotDrag() && this._lastMovingGrid) {

            var resultGridData = this._lastMovingGrid.GetData();

            this.finishDrag(resultGridData);
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
    // 完成拖动
    protected finishDrag(gridData: HexagonData) {
        this._beginDragUnit.SetMapGridPos(gridData.pos);
    }
    /**获取触摸格子*/
    protected onTouchGridHandle(event: EventTouch): HexagonCell {
        // 获取点击位置（世界坐标）
        const touchPos = event.getUILocation();

        return this.getGridCellByUILocation(touchPos);

    }
    /**根据UI坐标获取格子（传入 event.getUILocation() 的坐标） */
    public getGridCellByUILocation(touchPos: Vec2) {

        const uiTransform = this.node.getComponent(UITransform);
        if (!uiTransform) {
            console.warn('mapContainer没有UITransform组件');
            return null;
        }
        // 将触摸位置转换为mapContainer的本地坐标
        const localPos = uiTransform.convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0));

        // 将本地坐标转换为六边形坐标（不创建实例，性能更好）
        const coord = HexagonData.pixelToCoord(localPos.x, localPos.y);

        // 检查点击的格子是否在地图上
        const clickedCell = this.getHexCell(coord.q, coord.r);

        if (clickedCell) {

            return clickedCell;

        } else {
            console.log(`点击位置不在有效格子上: (${coord.q}, ${coord.r})`);
            return null;
        }
    }
    /**开始拖拽*/
    protected onDragBegin(event: EventTouch) {
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
    protected onDragMove(event: EventTouch) {
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
    protected onDragCancle(event: EventTouch) {
        if (this.CheckIsCanNotDrag()) {
            return;
        }
        this.dragCancleHanlder();

        this.ClearDrag();
    }
    protected dragCancleHanlder() {
        if (!this._lastMovingGrid && this._beginDragUnit) {
            var beginCell = this.getGridCellByUILocation(this._beginDragPos);
            if (beginCell) {
                this._beginDragUnit.SetMapGridPos(beginCell.GetData().pos);
            }
        }
    }
    /**是否不能拖拽 */
    protected CheckIsCanNotDrag() {
        return this.selectUnit || !this._beginDragUnit
    }
    /**清除拖拽数据 */
    protected ClearDrag() {
        this._beginDragPos = null;
        this._beginDragUnit = null;

        if (this._lastMovingGrid != null) {
            this._lastMovingGrid.SetNormal();
            this._lastMovingGrid = null;
        }
    }
    /**
       * 六边形格子点击回调（可以在这里添加业务逻辑）
       * @param cell 点击的格子视图
       * @param data 点击的格子数据
       */
    protected onHexCellClicked(cell: HexagonCell): void {
        // 示例：高亮显示点击的格子
        // 可以在这里添加你的业务逻辑，比如：
        // - 移动单位到该格子
        // - 显示格子信息
        // - 标记选中状态
        // - 显示可移动范围等

        const data: HexagonData = cell.GetData();

        console.log(`格子信息: 坐标(${data.q},${data.r}), 可行走:${data.walkable}, 占据:${data.occupiedUnitId || '无'}`);

        EventManager.Instance.dispatch(GameEvent.Battle_Map_Click_Grid, data);
    }
    /**根据单位UID获取单位所在的格子 */
    public getGridCellByOccupyUID(uId: string) {
        var grids = this.getAllHexCells();
        for (let i = 0; i < grids.length; i++) {
            if (grids[i].GetData().getOccupiedUnit() == uId) {
                return grids[i];
            }
        }
        return null;
    }
    /**选中格子中的单位并展示可移动的格子 */
    public SelectHexGridForMove(q: number, r: number) {
        var mgr = BattleMapMgr.getInstance();
        var hexData = mgr.getHexData(q, r);
        var battleMgr = BattleMgr.getInstance();
        var selectUnit = mgr.SelectHexGridUnit(q, r);

        //判断可选中逻辑
        if (battleMgr.CheckIsMyUnit(selectUnit)) {
            hexData.setSelected(true);

            //获取可移动范围的格子
            var pathMgr = PathFindingMgr.getInstance();
            var isFlyUnit = selectUnit.GetData().unitCfg.move_type == MOVE_TYPE.FLY;
            var resultGrids = pathMgr.getReachableRange(hexData, selectUnit.GetData().unitCfg.move_distance, isFlyUnit);
            if (resultGrids && resultGrids.length > 0) {
                resultGrids = resultGrids.filter(grid => {
                    return grid.occupiedUnitId == null;
                })
                this._hightLightGrids = resultGrids;
                resultGrids.forEach(gridData => {
                    gridData.setHighlighted(true);
                    this.getHexCell(gridData.q, gridData.r)?.UpdateData(gridData);
                });
                this.getHexCell(q, r).UpdateShowStatus();

            } else {
                console.log("当前单位没有可移动范围")
                this._hightLightGrids = null;
            }
            EventManager.Instance.dispatch(GameEvent.Select_Grid_Battle_Unit, selectUnit);
        } else {
            console.log("该格子无可操作单位")
            // EventManager.Instance.dispatch(GameEvent.Clear_Battle_Select_Unit);
        }

    }
    public startBreath(posList: HexagonPos[], color?: HEXGON_GRID_COLOR) {
        posList.forEach(pos => {
            var gridCell = this.getHexCell(pos.q, pos.r)
            gridCell.startBreath();
            if (color) {
                gridCell.SetColor(color);
            }
            if (this._breathingGrids.indexOf(gridCell) < 0) {
                this._breathingGrids.push(gridCell)
            }
        })
    }

    public clearBreath() {
        this._breathingGrids.forEach(gridCell => {
            gridCell.stopBreath();
            gridCell.UpdateShowStatus();
        })
        this._breathingGrids = [];
    }
    /**刷新格子状态 */
    public RefreshAllGrids() {
        this._hexCellMap.forEach(cell => {
            cell.UpdateShowStatus();
        })
    }
    /**
   * 清除检测状态
   */
    public ClearHightLight() {
        if (this._hightLightGrids) {
            this._hightLightGrids.forEach(gridData => {
                gridData.setHighlighted(false);
                this.getHexCell(gridData.q, gridData.r).UpdateData(gridData);
            })
        }
    }
    public getHightLightGrids() {
        return this._hightLightGrids;
    }
    /**仅控制单位红绿提示的显示，不改变选择、占位或移动高亮数据 */
    public setUnitHintsHidden(hidden: boolean) {
        this._hexCellMap.forEach(cell => {
            if (cell.isValid) {
                cell.SetUnitHintsHidden(hidden);
            }
        });
    }
    private getSkillAttackAreaRadius(attackArea: number): number {
        return Number.isFinite(attackArea) ? Math.max(0, Math.floor(attackArea) - 1) : 0;
    }
    /**预览与释放共用技能范围，包含中心，不受障碍或占位影响 */
    public getSkillAttackAreaGrids(center: HexagonPos, attackArea: number): HexagonData[] {
        const centerCell = center ? this.getHexCell(center.q, center.r) : null;
        const centerData = centerCell?.isValid ? centerCell.GetData() : null;
        if (!centerData) {
            return [];
        }
        const radius = this.getSkillAttackAreaRadius(attackArea);
        const grids: HexagonData[] = [];
        this._hexCellMap.forEach(cell => {
            const data = cell.isValid ? cell.GetData() : null;
            if (data && HexagonData.distance(centerData.q, centerData.r, data.q, data.r) <= radius) {
                grids.push(data);
            }
        });
        return grids;
    }
    /**以触摸格子为中心显示技能范围；attackArea=1仅包含中心 */
    public showSkillAttackArea(center: HexagonCell, attackArea: number) {
        if (!center || !center.isValid || !center.GetData()) {
            this.clearSkillAttackArea();
            return;
        }
        const centerData = center.GetData();
        if (this.getHexCell(centerData.q, centerData.r) !== center) {
            this.clearSkillAttackArea();
            return;
        }
        const radius = this.getSkillAttackAreaRadius(attackArea);
        if (this._skillAttackAreaCenter === center && this._skillAttackAreaRadius === radius) {
            return;
        }
        const nextCells = new Set<HexagonCell>();
        this.getSkillAttackAreaGrids(centerData, attackArea).forEach(data => {
            const cell = this.getHexCell(data.q, data.r);
            if (cell) {
                nextCells.add(cell);
                cell.SetSkillAttackPreview(true);
            }
        });
        this._skillAttackAreaCells.forEach(cell => {
            if (cell.isValid && !nextCells.has(cell)) {
                cell.SetSkillAttackPreview(false);
            }
        });
        this._skillAttackAreaCells = nextCells;
        this._skillAttackAreaCenter = center;
        this._skillAttackAreaRadius = radius;
    }
    public clearSkillAttackArea() {
        this._skillAttackAreaCells.forEach(cell => {
            if (cell.isValid) {
                cell.SetSkillAttackPreview(false);
            }
        });
        this._skillAttackAreaCells.clear();
        this._skillAttackAreaCenter = null;
        this._skillAttackAreaRadius = -1;
    }
    public clear(): void {
        this.clearSkillAttackArea();
        this.setUnitHintsHidden(false);
        this.ClearDrag();
        this.clearBreath();
        super.clear();
        this.selectUnit = null;
        this._hightLightGrids = null;
    }
    /**清除格子状态 */
    public clearAllState() {
        this.clearSkillAttackArea();
        this.setUnitHintsHidden(false);
        if (this._hexCellMap) {
            this._hexCellMap.forEach(cell => {
                var mapData = cell.GetData()
                mapData.occupiedUnitId = null;
                mapData.selected = false;
                mapData.highlighted = false;
                cell.UpdateShowStatus();
            })
        }
    }
    /**初始化地图数据 */
    public initMap() {
        this.clearSkillAttackArea();
        this.setUnitHintsHidden(false);
        this.ClearHightLight();
        this.clearBreath();

    }
}


