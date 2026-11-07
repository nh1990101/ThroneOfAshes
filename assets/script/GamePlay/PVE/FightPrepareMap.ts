import { _decorator, EventTouch, UITransform, Vec3 } from 'cc';
import { BattleMapCom } from '../Battle/BattleMapCom';
import { HexagonCell } from '../Battle/HexagonCell';
import { HexagonData } from '../Battle/HexagonData';
import { EventManager } from '../../Common/EventManager';
import { GameEvent } from '../../Common/GameEnum';
import { PVEMgr } from './PVEMgr';
import { FightPrepareGridCell } from './component/FightPrepareGridCell';
const { ccclass, property } = _decorator;

@ccclass('FightPrepareMap')
export class FightPrepareMap extends BattleMapCom {
    /**是否正在呼吸灯提示 */
    private _isFlashing: boolean = false;
    /**拖拽过程中手指经过的格子 */
    private _dragHoverCell: HexagonCell = null;
    /**拖拽起始格子 */
    private _beginDragCell: HexagonCell = null;
    /**地图上开始拖拽的单位uId（阵容uId） */
    private _beginDragUId: number = -1;
    /**是否真的发生了拖动（用于区分点击和拖拽） */
    private _isDragging: boolean = false;

    public finishCreateMapGrid() {
        super.finishCreateMapGrid();
        this.scheduleOnce(() => {
            this.showEmployGrid();
        }, 0.2)
    }
    /**展示可出战格子高亮显示 */
    public showEmployGrid() {
        this.ClearHightLight();
        this._hightLightGrids = [];
        this._hexCellMap.forEach(grid => {
            var data = grid.GetData();
            if (data.isDeployment) {
                data.setHighlighted(true)
                this._hightLightGrids.push(data);
                grid.UpdateShowStatus()
            }
        })
    }
    //可布阵的格子做呼吸灯提示
    public flashCanEmployGrid() {
        this.cancleFlash();
        this._isFlashing = true;
        this._hightLightGrids = [];
        this._hexCellMap.forEach(grid => {
            var data = grid.GetData();
            if (!data.isDeployment) {
                return;
            }
            data.setHighlighted(true);
            this._hightLightGrids.push(data);
            grid.UpdateShowStatus();
            (grid as FightPrepareGridCell).startBreath?.();
        })
    }
    // 取消呼吸灯效果
    public cancleFlash() {
        if (!this._isFlashing) {
            return;
        }
        this._isFlashing = false;
        this._hexCellMap.forEach(grid => {
            (grid as FightPrepareGridCell).stopBreath?.();
        })
        this.showEmployGrid();
    }
    /**拖拽中高亮手指所在的格子，dragUId为正在拖拽的单位 */
    public showDragHover(cell: HexagonCell, dragUId: number) {
        if (this._dragHoverCell === cell) {
            return;
        }
        this.clearDragHover();
        if (!cell) {
            return;
        }
        this._dragHoverCell = cell;
        var data = cell.GetData();
        var occupied = data.getOccupiedUnit();
        var occupiedUId = occupied != null ? Number(occupied) : -1;
        var mgr = PVEMgr.getInstance();
        var isValid = false;
        if (occupiedUId >= 0 && occupiedUId !== dragUId) {
            // 两个都已上阵的单位可以交换位置
            isValid = mgr.checkIsInTeamByUnitId(dragUId) && mgr.checkIsInTeamByUnitId(occupiedUId);
        } else {
            // 空格子必须是布阵位置
            isValid = data.isDeployment;
        }
        if (isValid) {
            (cell as FightPrepareGridCell).SetYellow();
        } else {
            cell.SetRed();
        }
    }
    /**清除拖拽高亮 */
    public clearDragHover() {
        if (this._dragHoverCell) {
            this._dragHoverCell.UpdateShowStatus();
            this._dragHoverCell = null;
        }
    }
    /**按阵容数据重建所有格子的占位关系（数据与显示一起刷新） */
    public refreshGridOccupy() {
        this._hexCellMap.forEach(cell => {
            cell.GetData().setOccupiedUnit(null);
        })
        var arr = PVEMgr.getInstance().getCurBattleArray();
        if (arr) {
            arr.forEach(data => {
                if (!data.pos) {
                    return;
                }
                var cell = this.getHexCell(data.pos.q, data.pos.r);
                if (cell) {
                    cell.GetData().setOccupiedUnit(String(data.uId));
                }
            })
        }
        // 占位变化后必须重绘，否则会残留上一次的黄色占位显示
        this.RefreshAllGrids();
    }
    /**
     * 地图内开始拖拽：从格子占位里找到对应的布阵实体
     * 父类用的是战斗单位表，布阵界面要换成阵容里的实体
     */
    protected onDragBegin(event: EventTouch) {
        this._beginDragUId = -1;
        this._beginDragUnit = null;
        this._beginDragCell = null;
        this._isDragging = false;
        if (this.selectUnit) {
            return;
        }
        const clickedCell = this.onTouchGridHandle(event);
        if (!clickedCell) {
            return;
        }
        const occupied = clickedCell.GetData().getOccupiedUnit();
        if (occupied == null) {
            return;
        }
        const uId = Number(occupied);
        if (isNaN(uId) || !PVEMgr.getInstance().checkIsInTeamByUnitId(uId)) {
            return;
        }
        const unit = PVEMgr.getInstance().getUnitEntity(uId);
        if (!unit) {
            return;
        }

        this._beginDragUId = uId;
        this._beginDragUnit = unit;
        this._beginDragCell = clickedCell;
        this._beginDragPos = event.getUILocation();
        this._lastMovingGrid = null;
        // this.selectUnit = unit;
    }
    /**拖拽单位跟着手指移动 */
    protected onDragMove(event: EventTouch) {
        if (this.CheckIsCanNotDrag()) {
            return;
        }
        if (!this._isDragging) {
            // 第一次移动才算真正开始拖拽（区分点击）
            this._isDragging = true;
            // PVEMgr.getInstance().isDragingUnit = true;
            // 拖动中的单位放到最上面
            this._beginDragUnit.node.setSiblingIndex(this.unitContainer.children.length - 1);
            this.cancleFlash();
            // 单位已经被拖走，起点格子恢复成空占位并重绘
            if (this._beginDragCell) {
                this._beginDragCell.GetData().setOccupiedUnit(null);
                this._beginDragCell.UpdateShowStatus();
                (this._beginDragCell as FightPrepareGridCell)?.stopBreath();

            }
        }
        var movingPos = event.getUILocation();
        const uiTransform = this.unitContainer.getComponent(UITransform);
        if (!uiTransform) {
            return;
        }
        const localPos = uiTransform.convertToNodeSpaceAR(new Vec3(movingPos.x, movingPos.y, 0));
        this._beginDragUnit.node.setPosition(localPos);

        const movingCell = this.onTouchGridHandle(event);
        this._lastMovingGrid = movingCell;
        this.showDragHover(movingCell, this._beginDragUId);
    }
    /**地图点击：拖拽结束时按松手位置判定落点，否则走点击逻辑 */
    protected onMapClick(event: EventTouch): void {
        if (this._isDragging && !this.CheckIsCanNotDrag()) {
            const cell = this.onTouchGridHandle(event);
            if (cell) {
                this.finishDrag(cell.GetData());
            } else {
                // 松开在地图范围内但不在格子上，按下阵处理
                this.dragCancleHanlder();
            }
            this.endPrepareDrag();
            return;
        }
        // 只是点击，没有拖动
        this.endPrepareDrag();
        super.onMapClick(event);
    }
    /**拖出地图范围，按下阵处理 */
    protected onDragCancle(event: EventTouch) {
        if (this.CheckIsCanNotDrag()) {
            this.endPrepareDrag();
            return;
        }
        // 只有真正拖动过才下阵，单纯点击后被打断不算下阵
        if (this._isDragging) {
            this.dragCancleHanlder();
        }
        this.endPrepareDrag();
    }
    protected finishDrag(gridData: HexagonData) {
        if (this._beginDragUId < 0 || !this._beginDragUnit) {
            return;
        }
        if (gridData.getOccupiedUnit() != null || gridData.isDeployment) {
            // 有占位单位（交换）或可布阵格子（移动）
            EventManager.Instance.dispatch(GameEvent.FIGHT_DRAG_UNIT_DROP, this._beginDragUId, gridData);
        } else if (!gridData.isDeployment) {
            this.resetUnitPos(this._beginDragUId)
        }
        else {
            // 其余都算下阵操作
            this.dragCancleHanlder();
        }
    }
    /**地图上的拖拽结束，恢复状态 */
    private endPrepareDrag() {
        // 先清父类拖拽记录（会把最后经过的格子恢复成普通状态），再恢复拖拽高亮
        this.ClearDrag();
        this.clearDragHover();
        this._beginDragUId = -1;
        this._beginDragCell = null;
        this._isDragging = false;
        PVEMgr.getInstance().isDragingUnit = false;
    }
    /**把单位放回阵容记录的位置（拖拽被拒绝时使用） */
    public resetUnitPos(uId: number) {
        var data = PVEMgr.getInstance().getCurBattleArray()?.get(uId);
        var unit = PVEMgr.getInstance().getUnitEntity(uId);
        if (data && data.pos && unit) {
            unit.SetMapGridPos({ q: data.pos.q, r: data.pos.r });
        }
        // 起点格子已经清空过占位，这里按阵容数据补回来
        this.refreshGridOccupy();
    }
    // 覆盖父类方法拖拽到外边后直接下阵
    protected dragCancleHanlder() {
        if (this._beginDragUId >= 0 && this._beginDragUnit) {
            EventManager.Instance.dispatch(GameEvent.DELETE_SOLDIER_FIGHT, this._beginDragUId);
        }
    }
    public clear(): void {
        this.cancleFlash();
        this.clearDragHover();
        this._beginDragUId = -1;
        this._beginDragCell = null;
        this._isDragging = false;
        super.clear();
    }
}
