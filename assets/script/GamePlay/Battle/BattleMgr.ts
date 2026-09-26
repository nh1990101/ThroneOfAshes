import { _decorator, Component, Node, Vec2, Vec3 } from 'cc';
import { BaseMgr } from '../../Common/BaseMgr';
import { BattleMapMgr } from './BattleMapMgr';
import { AssetMgr } from '../../Common/AssetMgr';
import { GameUrl } from '../../Common/GameUrl';
import { HexagonPos } from './HexagonData';
import { BattleUnit } from './BattleUnit';
import { BattleUnitData } from './BattleUnitData';
import { UNIT_ACTION } from '../../Common/GameEnum';
const { ccclass, property } = _decorator;

@ccclass('BattleMgr')
export class BattleMgr extends BaseMgr {
    /**
     * 战斗地图容器
     */
    private _mapContainer: Node;
    /**
     * 战斗单位容器
     */
    private _battleUnitContainer: Node;
    /**
     * 己方单位
     */
    private _mapMyUnit: Map<number, BattleUnit>;

    /**
    * 敌方单位
    */
    private _mapEnemyUnit: Map<number, BattleUnit>;


    public initEvent() {
        super.initEvent();
    }
    public Init(mapContainer: Node, battleUnitContainer: Node) {
        this._mapContainer = mapContainer;
        this._battleUnitContainer = battleUnitContainer;
        this._mapMyUnit = new Map<number, BattleUnit>();
        this._mapEnemyUnit = new Map<number, BattleUnit>();
        this.InitMyTeamUnit();

    }
    /**
     * 初始化己方单位布局
     */
    public InitMyTeamUnit() {

        var testData = new BattleUnitData();
        testData.uId = 1;
        testData.Id = 1001;
        testData.hp = 100;
        testData.lv = 1;
        testData.camp = 1;

        this.CreateBattleUnit(testData, { q: 0, r: 0 });
    }
    /**
     * 创建战斗单位
     */
    public CreateBattleUnit(battleData: BattleUnitData, Pos: HexagonPos) {
        return new Promise(resolve => {
            //创建战斗单位并赋值
            AssetMgr.createPrefabFromPool(GameUrl.Battle_Prefab.format("BattleUnit"), Vec2.ZERO, this._battleUnitContainer).then((unitNode: Node) => {
                var battleUnit = unitNode.getComponent(BattleUnit);

                this._mapMyUnit.set(battleData.uId, battleUnit);

                //设置服务器数据并设置位置和默认动作（待机）
                battleUnit.SetData(battleData).then(() => {
                    battleUnit.SetMapGridPos(Pos);
                    battleUnit.PlayAction(UNIT_ACTION.IDLE, true);
                    resolve(null);
                })
            });

        });
    }
    /**
     * 清除所有单位和特效
     */
    public Clear() {
        this.ClearAllUnit();
    }

    public ClearAllUnit() {
        this._mapMyUnit.forEach(myUnit => {
            this.RemoveUnit(myUnit);
        })
        this._mapMyUnit = null;

        this._mapEnemyUnit.forEach(enemyUnit => {
            this.RemoveUnit(enemyUnit);
        })
        this._mapEnemyUnit = null;
    }
    public RemoveUnit(Unit: BattleUnit) {
        Unit.Clear();
    }
    /**检测是否己方单位 */
    public CheckIsMyUnit(unit: BattleUnit) {
        return unit && this._mapMyUnit.get(unit.GetData().uId) != null;
    }
    public CheckIsMyUnitById(uId: number) {
        return uId > 0 && this._mapMyUnit.get(uId) != null;
    }
    public GetUnitByUID(uId: number): BattleUnit {
        var unit = this._mapMyUnit.get(uId);
        if (!unit) {
            unit = this._mapEnemyUnit.get(uId);
        }
        return unit;
    }
}


