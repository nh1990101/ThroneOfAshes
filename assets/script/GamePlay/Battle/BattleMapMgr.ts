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
import { BattleMapConfig, BattleMapGridConfig } from './BattleMapConfig';
import { PoolMgr } from '../../Common/Pool';
const { ccclass, property } = _decorator;

/**
 * 战斗地图管理类
 */
@ccclass('BattleMapMgr')
export class BattleMapMgr extends BaseMgr {
    /** 地图宽度（格子数） */
    public static readonly MAP_WIDTH = 7;
    /** 地图高度（格子数） */
    public static readonly MAP_HEIGHT = 7;

    /** 六边形格子预制体路径 */
    public static readonly HEX_CELL_PREFAB_PATH = "GamePlay/Battle/HexagonCell";

    /** 地图容器节点 */

    public mapContainer: Node = null;

    /** 所有六边形格子数据（使用 Map 存储，key 为 "q,r"） */
    protected _hexDataMap: Map<string, HexagonData> = new Map();



    public initEvent(): void {
        super.initEvent();
        PoolMgr.register(HexagonData, (obj) => { obj.reset() });
    }

    initMapData(config: BattleMapConfig) {
        // 格距统一使用地图配置，供格子、单位定位和点击坐标反算共用。
        HexagonData.UpdateGridPixelSize(config.hexWidth, config.hexHeight);
        this._hexDataMap.clear();
        const datas: BattleMapGridConfig[] = config.cells;
        datas.forEach(MapCellData => {
            // 创建六边形数据（使用实际坐标）
            const hexData = PoolMgr.get(HexagonData);
            hexData.setData(MapCellData.q, MapCellData.r, MapCellData.walkable, MapCellData.isDeployment);
            const key = hexData.getHashKey();
            this._hexDataMap.set(key, hexData);

        });
        PathFindingMgr.getInstance().UpdateMapGrid(this._hexDataMap);
        console.log(`地图初始化完成: ${this._hexDataMap.size} 个六边形格子`);
    }
    public getHexgonDatas() {
        return this._hexDataMap;
    }
    /**
     * 根据坐标获取六边形数据
     */
    public getHexData(q: number, r: number): HexagonData | null {
        const key = `${q},${r}`;
        return this._hexDataMap.get(key) || null;
    }

    public getHexDataFromPos(pos: HexagonPos): HexagonData | null {
        if (!pos)
            return null;
        const key = `${pos.q},${pos.r}`;
        return this._hexDataMap.get(key) || null;
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

    /**设置格子状态（单位占位更新） */
    public SetHexUnitId(q: number, r: number, unitId: string, isClear: boolean = false) {
        //先移除之前的格子占据单位状态
        this.RemoveUnitDataById(unitId);

        //再更新新状态
        var hexData = this.getHexData(q, r);
        if (hexData && !isClear) {
            hexData.setOccupiedUnit(unitId);
        }
    }
    /**移除战斗单位数据 */
    public RemoveUnitDataById(unitId: string) {
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
     * 清空地图
     */
    public clearMap(): void {

        this._hexDataMap.forEach(itemData => {
            PoolMgr.put(itemData);
        })
        this._hexDataMap.clear();
        // this._hightLightGrids = null;
    }
}


