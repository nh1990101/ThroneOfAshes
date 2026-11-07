import { _decorator, Component, EventTouch, Node, UITransform, v2, Vec2, Vec3 } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { HexagonCell } from './HexagonCell';
import { HexagonData } from './HexagonData';
import { EventManager } from '../../Common/EventManager';
import { GameEvent } from '../../Common/GameEnum';
import { BattleMapMgr } from './BattleMapMgr';
import { AssetMgr } from '../../Common/AssetMgr';
import { BattleMapConfig, BattleMapGridConfig } from './BattleMapConfig';
import { PathFindingMgr } from '../../Common/PathFindingMgr';
const { ccclass, property } = _decorator;

@ccclass('HexgonMap')
export class HexgonMap extends BaseComp {
    /** 所有六边形格子视图（使用 Map 存储，key 为 "q,r"） */
    protected _hexCellMap: Map<string, HexagonCell> = new Map();
    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.node, Node.EventType.TOUCH_END, this.onMapClick);
        this.addNodeEvent(this.node, Node.EventType.TOUCH_START, this.onDragBegin);
        this.addNodeEvent(this.node, Node.EventType.TOUCH_MOVE, this.onDragMove);
        this.addNodeEvent(this.node, Node.EventType.TOUCH_CANCEL, this.onDragCancle);
    }
    public createHexgonCells<T extends HexagonCell>(config: BattleMapConfig, offset?: Vec2, itemClass?: new () => T) {

        var mapMgr = BattleMapMgr.getInstance()
        mapMgr.initMapData(config);

        var resultPos = offset ? offset.add2f(config.offsetX, config.offsetY) : v2(config.offsetX, config.offsetY)
        this.node.setPosition(resultPos.toVec3());

        this._hexCellMap.clear();

        var hexgonDatas = mapMgr.getHexgonDatas();

        var arrPromise = [];
        hexgonDatas.forEach(hexData => {
            // 创建六边形格子视图
            arrPromise.push(this.createHexCell(hexData, itemClass ? itemClass : HexagonCell));
        })
        Promise.all(arrPromise).then(this.finishCreateMapGrid.bind(this));
    }
    /**创建地图格子实体完成 */
    protected finishCreateMapGrid() {

    }
    /**
     * 创建六边形格子视图（使用 AssetMgr）
     */
    private createHexCell<T extends HexagonCell>(hexData: HexagonData, itemClass: new () => T): Promise<void> {
        return new Promise(resolve => {
            try {
                // 获取 HexagonCell 组件
                AssetMgr.createPrefabFromPool(BattleMapMgr.HEX_CELL_PREFAB_PATH, Vec2.ZERO, this.node, itemClass).then((hexCell) => {
                    if (hexCell) {
                        hexCell.SetData(hexData);
                        // 存储到 Map
                        const key = hexData.getHashKey();
                        this._hexCellMap.set(key, hexCell);
                    } else {
                        console.error('预制体上没有 HexagonCell 组件');
                    }
                    resolve();
                })
            } catch (error) {
                console.error('创建六边形格子失败:', error);
                resolve();
            }
        })
    }
    /**
      * 地图点击事件处理
      */
    protected onMapClick(event: EventTouch): void {

    }


    /**开始拖拽*/
    protected onDragBegin(event: EventTouch) {

    }
    /**拖拽单位跟着移动 */
    protected onDragMove(event: EventTouch) {

    }
    /**拖出触碰范围外 */
    protected onDragCancle(event: EventTouch) {

    }

    /**
     * 根据坐标获取六边形格子
     */
    public getHexCell(q: number, r: number): HexagonCell | null {
        const key = `${q},${r}`;
        return this._hexCellMap.get(key) || null;
    }
    /**
     * 获取所有六边形格子
     */
    public getAllHexCells(): HexagonCell[] {
        return Array.from(this._hexCellMap.values());
    }
    /**
     * 根据HexagonData获取世界坐标
     * @param hexData 六边形数据
     * @returns 世界坐标，如果不存在返回null
     */
    public getHexWorldPos(hexData: HexagonData): Vec3 | null {
        const cell = this.getHexCell(hexData.q, hexData.r);
        return cell ? cell.GetWorldPos() : null;
    }

    public clear(): void {
        super.clear();
        // 销毁所有格子节点
        this._hexCellMap.forEach(cell => {
            if (cell && cell.node) {
                AssetMgr.removeNode(cell.node)
            }
        });
        this._hexCellMap.clear();

    }
}


