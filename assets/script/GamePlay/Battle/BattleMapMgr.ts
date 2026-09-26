import { _decorator, Component, Node, Prefab, instantiate, Vec2, Vec3 } from 'cc';
import { BaseMgr } from '../../Common/BaseMgr';
import { HexagonData, HexagonPos } from './HexagonData';
import { HexagonCell } from './HexagonCell';
import { AssetMgr } from '../../Common/AssetMgr';
import { PathFindingMgr } from '../../Common/PathFindingMgr';
import { BattleMgr } from './BattleMgr';
import { EventManager } from '../../Common/EventManager';
import { GameEvent } from '../../Common/GameEnum';
import { ConfigMgr } from '../../Config/ConfigMgr';
const { ccclass, property } = _decorator;

/**
 * 战斗地图管理类
 */
@ccclass('BattleMapMgr')
export class BattleMapMgr extends BaseMgr {
    /** 地图宽度（格子数） */
    private static readonly MAP_WIDTH = 7;
    /** 地图高度（格子数） */
    private static readonly MAP_HEIGHT = 7;

    /** 六边形格子预制体路径 */
    private static readonly HEX_CELL_PREFAB_PATH = "GamePlay/Battle/HexagonCell";

    /** 地图容器节点 */

    public mapContainer: Node = null;

    /** 所有六边形格子数据（使用 Map 存储，key 为 "q,r"） */
    private _hexDataMap: Map<string, HexagonData> = new Map();

    /** 所有六边形格子视图（使用 Map 存储，key 为 "q,r"） */
    private _hexCellMap: Map<string, HexagonCell> = new Map();

    private _hightLightGrids: HexagonData[];

    public initEvent(): void {
        super.initEvent();
    }

    /**
     * 初始化地图（7x7 六边形网格）
     */
    public async initMap() {
        this._hexDataMap.clear();
        this._hexCellMap.clear();

        var config = ConfigMgr.instance.battleMapConfig;

        config.cells.forEach(MapCellData => {
            // 创建六边形数据（使用实际坐标）
            const hexData = new HexagonData(MapCellData.q, MapCellData.r, MapCellData.walkable, MapCellData.isDeployment);
            const key = hexData.getHashKey();
            this._hexDataMap.set(key, hexData);

            // 创建六边形格子视图
            this.createHexCell(hexData);
        })
        // 调整容器位置使地图居中显示
        this.centerMapContainer();
        PathFindingMgr.getInstance().UpdateMapGrid(this._hexDataMap);
        console.log(`地图初始化完成: ${this._hexDataMap.size} 个六边形格子`);
    }

    /**
     * 调整地图容器位置，使地图居中显示
     */
    private centerMapContainer(): void {
        if (!this.mapContainer) return;

        // 计算地图中心点的世界坐标
        const centerQ = (BattleMapMgr.MAP_WIDTH - 1) / 2;
        const centerR = (BattleMapMgr.MAP_HEIGHT - 1) / 2;
        const centerData = new HexagonData(centerQ, centerR);
        const centerPos = centerData.toPixel();

        // 将容器位置设置为负的中心点坐标，使地图居中
        this.mapContainer.setPosition(-centerPos.x + HexagonData.widthPx * 0.5, -centerPos.y, 0);
    }

    /**
     * 创建六边形格子视图（使用 AssetMgr）
     */
    private async createHexCell(hexData: HexagonData): Promise<void> {
        if (!this.mapContainer) {
            console.error('地图容器未设置');
            return;
        }

        try {
            // 使用 AssetMgr 创建预制体
            const cellNode = await AssetMgr.createPrefabFromPool(
                BattleMapMgr.HEX_CELL_PREFAB_PATH,
                Vec2.ZERO,
                this.mapContainer
            ) as Node;

            // 获取 HexagonCell 组件
            const hexCell = cellNode.getComponent(HexagonCell);
            if (hexCell) {
                hexCell.SetData(hexData);
                // 存储到 Map
                const key = hexData.getHashKey();
                this._hexCellMap.set(key, hexCell);
            } else {
                console.error('预制体上没有 HexagonCell 组件');
            }
        } catch (error) {
            console.error('创建六边形格子失败:', error);
        }
    }

    /**
     * 根据坐标获取六边形数据
     */
    public getHexData(q: number, r: number): HexagonData | null {
        const key = `${q},${r}`;
        return this._hexDataMap.get(key) || null;
    }

    public getHexDataFromPos(pos: HexagonPos): HexagonData | null {
        const key = `${pos.q},${pos.r}`;
        return this._hexDataMap.get(key) || null;
    }

    /**
     * 根据坐标获取六边形格子
     */
    public getHexCell(q: number, r: number): HexagonCell | null {
        const key = `${q},${r}`;
        return this._hexCellMap.get(key) || null;
    }

    /**选中格子中的单位并展示可移动的格子 */
    public SelectHexGridForMove(q: number, r: number) {
        var hexData = this.getHexData(q, r);
        var battleMgr = BattleMgr.getInstance();
        var selectUnit = this.SelectHexGridUnit(q, r);

        //判断可选中逻辑
        if (battleMgr.CheckIsMyUnit(selectUnit)) {
            hexData.setSelected(true);

            //获取可移动范围的格子
            var resultGrids = PathFindingMgr.getInstance().getReachableRange(hexData, 2);
            if (resultGrids && resultGrids.length > 0) {
                this._hightLightGrids = resultGrids;
                resultGrids.forEach(gridData => {
                    gridData.setHighlighted(true);
                    this.getHexCell(gridData.q, gridData.r).UpdateData(gridData);
                });
                EventManager.Instance.dispatch(GameEvent.Select_Grid_Battle_Unit, selectUnit);
            } else {
                console.log("当前单位没有可移动范围")
            }
        } else {
            console.log("该格子无可操作单位")
            // EventManager.Instance.dispatch(GameEvent.Clear_Battle_Select_Unit);
        }
    }
    /**
     * 选中格子中的单位
     */
    public SelectHexGridUnit(q: number, r: number) {
        var hexData = this.getHexData(q, r);
        var battleMgr = BattleMgr.getInstance();
        var selectUnit = battleMgr.GetUnitByUID(hexData.occupiedUnitId);

        return selectUnit;
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
    /**设置格子状态（单位占位更新） */
    public SetHexUnitId(q: number, r: number, unitId: number, isClear: boolean = false) {
        //先移除之前的格子占据单位状态
        this.RemoveUnitDataById(unitId);

        //再更新新状态
        var hexData = this.getHexData(q, r);
        if (hexData && !isClear) {
            hexData.setOccupiedUnit(unitId);
        }
    }
    /**移除战斗单位数据 */
    public RemoveUnitDataById(unitId: number) {
        this._hexDataMap.forEach(data => {
            if (data.occupiedUnitId == unitId) {
                data.occupiedUnitId = null;
            }
        })
    }

    /**
     * 获取所有六边形数据
     */
    public getAllHexData(): HexagonData[] {
        return Array.from(this._hexDataMap.values());
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

    /**
     * 清空地图
     */
    public clearMap(): void {
        // 销毁所有格子节点
        this._hexCellMap.forEach(cell => {
            if (cell && cell.node) {
                AssetMgr.removeNode(cell.node, "HexagonCell")
            }
        });

        this._hexDataMap.clear();
        this._hexCellMap.clear();
        this._hightLightGrids = null;
    }
}


