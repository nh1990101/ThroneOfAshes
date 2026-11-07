import { _decorator, Component, isValid, Node, Vec2, Vec3 } from 'cc';
import { BaseMgr } from '../../Common/BaseMgr';
import { BattleMapMgr } from './BattleMapMgr';
import { AssetMgr } from '../../Common/AssetMgr';
import { GameUrl } from '../../Common/GameUrl';
import { HexagonData, HexagonPos } from './HexagonData';
import { BattleUnit } from './BattleUnit';
import { BattleUnitData } from './BattleUnitData';
import { BATTLE_HISTORY_ACTION_TYPE, BATTLE_RESULT, ParamDefined, ParamValueType, UNIT_ACTION } from '../../Common/GameEnum';
import { PoolMgr } from '../../Common/Pool';
import { IUnitAttrData } from '../../Config/Typings/UnitAttrData';
import { IMonsterAttrData } from '../../Config/Typings/MonsterAttrData';
import { PVEMgr } from '../PVE/PVEMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { ConfigTools } from '../../Config/ConfigTools';
import { IUnitStartSortData } from './UnitStartSortCell';
import { PathFindingMgr } from '../../Common/PathFindingMgr';
import { DamageTextMgr } from './DamageTextMgr';
import type { SkillCardDragCom } from './Skill/SkillCardDragCom';
const { ccclass, property } = _decorator;
/**战斗单位数据 */
export interface IBATTLE_UNIT_DATA {
    posId: number;
    unitAttrId: number;
    num: number;
    lv: number;
}
export interface IBATTLE_DATA {
    myUnits: IBATTLE_UNIT_DATA[];
    enermyUnits: IBATTLE_UNIT_DATA[];
}
/**单位基础属性 */
export interface IBASE_PROPERTY {
    /**攻击 */
    attack: number;
    /**血量 */
    hp: number;
    /**速度 */
    speed: number;
    /**防御 */
    define: number;
}
/**英雄基础属性 */
export interface IHERO_PROPERTY extends IBASE_PROPERTY {
    /**智力 */
    intelligence: number;
    /**统帅 */
    command: number;
    /**初始移动力 */
    move: number;

}
export type IUNIT_PROPERTY = IHERO_PROPERTY | IBASE_PROPERTY;

// 战斗单位数据
export interface IBATTLE_HISTORY_UNIT_DATA {
    battleUnitData: BattleUnitData;
    pos: HexagonPos;
}
//战斗单位行为记录
export interface IBATTLE_HISTORY_ACTION {
    /**行为类型 */
    actionType: BATTLE_HISTORY_ACTION_TYPE;
    /**发生者UID */
    actionUnitUID: string[];
    /**移动坐标 */
    targetPos?: HexagonPos;
    /**其他参数 */
    otherParam?: any[];
}
/**战斗表现记录数据结构 */
export interface IBATTLE_HISTORY_DATA {
    // 所有单位数据信息
    battleUnits: Map<string, IBATTLE_HISTORY_UNIT_DATA>;
    // 战斗记流程轴节点
    historyNode: IHISTORY_NODE;
    //行为
    action?: IBATTLE_HISTORY_ACTION;
}
/**战斗记流程轴节点 */
export interface IHISTORY_NODE {
    round: number;
    index: number;
    actionStep: number;
}

@ccclass('BattleMgr')
export class BattleMgr extends BaseMgr {


    /**血条容器 */
    private _hpContainer: Node;
    /**
     * 己方单位
     */
    private _mapMyUnit: Map<string, BattleUnit>;

    /**
    * 敌方单位
    */
    private _mapEnemyUnit: Map<string, BattleUnit>;

    /**当前轮次 */
    public curRound = 0;

    /**当前可攻击单位 */
    public arrAvalbleAttackUnit: BattleUnit[];

    /**战斗记录 阶段-> */
    public battleHistory: Map<number, IBATTLE_HISTORY_DATA[]>;

    /**当前战斗时间轴 */
    public curBattleHistoryNode: IHISTORY_NODE;

    /**是否记录战斗流程 */
    public isSaveBattleHistory: boolean = true;

    /**战斗加速倍率 */
    public playSpeedRate = 1;

    /**特效层 */
    public EffectContainer: Node;
    /**
 * 战斗单位容器
 */
    public battleUnitContainer: Node;
    /**飘字容器 */
    public numberContainer: Node;

    /**当前战斗窗口的技能卡牌拖动组件，由窗口初始化后传给卡牌。 */
    public skillCardDragCom: SkillCardDragCom = null;

    public initEvent() {
        super.initEvent();
        this._mapMyUnit = new Map();
        this._mapEnemyUnit = new Map();
        this.battleHistory = new Map();
        PoolMgr.register(BattleUnitData, (obj) => { obj.Clear() });
    }
    public Init(battleUnitContainer: Node, hpContainer: Node, EffectContainer: Node, numberContainer: Node) {
        this.clearSkillCardDrag();
        this.battleUnitContainer = battleUnitContainer;
        this._hpContainer = hpContainer;
        this.EffectContainer = EffectContainer;
        this.numberContainer = numberContainer;
        this._mapMyUnit.clear();
        this._mapEnemyUnit.clear();

    }
    /**
     * 初始化己方单位布局
     */
    public InitMyTeamUnit() {

        return new Promise(resolve => {
            var listBattleArray = PVEMgr.getInstance().getCurBattleArray();
            var arr_Promise = [];
            listBattleArray.forEach(soldierBattleData => {
                if (soldierBattleData.pos) {
                    var unitId = soldierBattleData.unitId;
                    var unitCount = soldierBattleData.num;
                    var unitCfg = ConfigMgr.instance.UnitData.get(unitId);
                    var unitAttrCfg = ConfigMgr.instance.UnitAttrData.get(unitCfg.unit_attr);
                    if (unitAttrCfg) {
                        var unitData = PoolMgr.get(BattleUnitData);
                        unitData.SetData(unitAttrCfg, PVEMgr.getInstance().getSoldierLv(soldierBattleData.uId), 1, unitCount, soldierBattleData.pos);
                        arr_Promise.push(this.CreateBattleUnit(unitData));
                    }
                }
            })
            Promise.all(arr_Promise).then(() => {
                resolve(null);
            })
        })

    }
    /**初始化敌方单位 */
    public InitEnermy(list: BattleUnitData[]) {
        return new Promise(resolve => {
            var arr_Promise = [];
            list.forEach(energy => {
                arr_Promise.push(this.CreateBattleUnit(energy));
            })
            Promise.all(arr_Promise).then(() => {
                resolve(null);
            })
        })
    }
    public InitHistoryUnit(battleUnitDatas: Map<string, IBATTLE_HISTORY_UNIT_DATA>) {

        var arrPromise = []
        battleUnitDatas.forEach(battleUnit => {
            arrPromise.push(this.CreateBattleUnit(battleUnit.battleUnitData.Clone(), battleUnit.pos));
        })
        return Promise.all(arrPromise);

    }
    /**
     * 创建战斗单位
     */
    // public CreateBattleUnit(battleData: BattleUnitData) {
    //     return new Promise(resolve => {
    //         //创建战斗单位并赋值
    //         AssetMgr.createPrefabFromPool(GameUrl.Battle_Prefab.format("BattleUnit"), Vec2.ZERO, this._battleUnitContainer, BattleUnit).then((battleUnit) => {
    //             if (battleData.IsEnemy()) {
    //                 this._mapEnemyUnit.set(battleData.uId, battleUnit);
    //             } else {
    //                 this._mapMyUnit.set(battleData.uId, battleUnit);
    //             }
    //             //设置服务器数据并设置位置和默认动作（待机）
    //             battleUnit.SetData(battleData).then(() => {
    //                 battleUnit.SetMapGridPos(battleData.pos);
    //                 battleUnit.PlayAction(UNIT_ACTION.IDLE, true);
    //                 resolve(battleUnit);
    //             })
    //         });

    //     });
    // }
    public CreateBattleUnit(battleData: BattleUnitData, bornPos?: HexagonPos) {
        return new Promise((resolve, reject) => {
            const url = GameUrl.Battle_Prefab.format("BattleUnit");

            console.log("[CreateBattleUnit] 开始创建", {
                url,
                uId: battleData?.uId,
                unitId: battleData?.Id,
                containerValid: this.battleUnitContainer?.isValid
            });

            AssetMgr.createPrefabFromPool(
                url,
                Vec2.ZERO,
                this.battleUnitContainer,
                BattleUnit
            ).then((battleUnit) => {
                console.log("[CreateBattleUnit] 预制体创建成功", battleData.uId);

                if (battleData.IsEnemy()) {
                    this._mapEnemyUnit.set(battleData.uId, battleUnit);
                } else {
                    this._mapMyUnit.set(battleData.uId, battleUnit);
                }
                battleUnit.SetData(battleData, this._hpContainer).then(() => {
                    battleUnit.SetMapGridPos(bornPos ? bornPos : battleData.pos);
                    battleUnit.SetSpeedRate(this.playSpeedRate);
                    battleUnit.PlayAction(UNIT_ACTION.IDLE, true);
                    resolve(battleUnit);
                }).catch(reject);
            }).catch((error) => {
                console.error("[CreateBattleUnit] 预制体创建失败", {
                    error,
                    url,
                    uId: battleData?.uId,
                    unitId: battleData?.Id,
                    containerValid: this.battleUnitContainer?.isValid
                });
                reject(error);
            });
        });
    }
    /**
     * 清除所有单位和特效
     */
    public Clear() {
        this.clearSkillCardDrag();
        this.ClearAllUnit();
        this.curRound = 0;
        this.battleHistory.clear();
    }

    public clearSkillCardDrag(): void {
        const cardDrag = this.skillCardDragCom;
        this.skillCardDragCom = null;
        if (isValid(cardDrag, true)) {
            cardDrag.clear();
        }
    }

    public ClearAllUnit() {
        this._mapMyUnit.forEach(myUnit => {
            this.RemoveUnit(myUnit);
        })
        this._mapMyUnit.clear();// = null;

        this._mapEnemyUnit.forEach(enemyUnit => {
            this.RemoveUnit(enemyUnit);
        })
        this._mapEnemyUnit.clear();// = null;
    }
    public RemoveUnit(Unit: BattleUnit) {
        var battleUnitData = Unit.GetData();
        BattleMapMgr.getInstance().RemoveUnitDataById(battleUnitData.uId)
        if (battleUnitData.IsEnemy()) {
            this._mapEnemyUnit.delete(battleUnitData.uId);
        } else {
            this._mapMyUnit.delete(battleUnitData.uId);
        }
        AssetMgr.removeNode(Unit.node);
    }
    /**检测是否己方单位 */
    public CheckIsMyUnit(unit: BattleUnit) {
        return unit && unit.GetData() && this._mapMyUnit.get(unit.GetData().uId) != null;
    }
    public CheckIsMyUnitById(uId: string) {
        return uId != null && this._mapMyUnit.get(uId) != null;
    }
    public GetUnitByUID(uId: string): BattleUnit {
        var unit = this._mapMyUnit.get(uId);
        if (!unit) {
            unit = this._mapEnemyUnit.get(uId);
        }
        return unit;
    }
    /**根据阵营获取敌人 */
    public GetAttackTargets(camp: number) {
        if (camp == 2) {
            return this._mapMyUnit
        }
        return this._mapEnemyUnit;
    }
    /**获取当前轮次出手顺序数据 */
    public GetUnitSortDatas() {
        var sortData: IUnitStartSortData[] = [];
        if (this._mapEnemyUnit.size > 0) {
            this._mapEnemyUnit.forEach(enemy => {
                sortData.push(this.GetSortDataByBattleUnitData(enemy?.GetData()))
            })
        }
        if (this._mapMyUnit.size > 0) {
            this._mapMyUnit.forEach(myUnit => {

                sortData.push(this.GetSortDataByBattleUnitData(myUnit?.GetData()))
            })
        }
        sortData.sort((a, b) => {
            if (a.round == b.round) {
                return a.sort >= b.sort ? -1 : 1;
            }
            return a.round < b.round ? -1 : 1;
        })
        if (sortData.length > 0) {
            sortData[0].isCurAction = true;
        }
        return sortData;
    }
    public GetSortDataByBattleUnitData(unitData: BattleUnitData) {
        if (unitData) {

            return { uId: unitData.uId, isCurAction: false, sort: unitData.GetSort(), round: unitData.round }
        }
        return null;
    }
    /**获取当前阵容属性加成（受上阵英雄属性影响） */
    public GetPropertyByCurBattlArr() {
        var addSort: IUNIT_PROPERTY = { attack: 0, define: 0, hp: 0, speed: 0, intelligence: 0, command: 0, move: 0 };
        var pveMgr = PVEMgr.getInstance()
        var arrHeros = pveMgr.getCurBattleHero();
        arrHeros.forEach(hero => {
            addSort = ConfigTools.instance.AddProperty(addSort, this.GetPropertyByHero(hero.uId));
        })
        return addSort;
    }

    /**根据英雄ID获取当前英雄加成的属性 */
    public GetPropertyByHero(uId: number): IHERO_PROPERTY {
        var heroData = PVEMgr.getInstance().getHeroDataByUID(uId);
        if (heroData) {

            var config = ConfigTools.instance.getUnitAttrCfgByUnitID(heroData.unitId);
            if (config) {
                return ConfigTools.instance.getHeroPropertyByLv(config, heroData.lv);
                // return { attack: config.atk, define: config.def, hp: config.hp, speed: config.speed, intelligence: config.intelligence, command: config.command, move: config.command };
            }
        }
        return { attack: 0, define: 0, hp: 0, speed: 0, intelligence: 0, command: 0, move: 0 };
    }
    /**根据格子获取范围内可攻击的对象 */
    public GetAvalbleAttackUnits(hexData: HexagonData, camp: number, distance: number) {
        var resultGrids = PathFindingMgr.getInstance().getCellsInRange(hexData, distance);
        if (resultGrids && resultGrids.length > 0) {
            // 获取可攻击单位
            var arrAvalbleAttackUnit: BattleUnit[] = [];
            resultGrids.forEach(gridData => {
                if (gridData.occupiedUnitId) {

                    let resultUnit = this.GetUnitByUID(gridData.occupiedUnitId);
                    if (resultUnit && resultUnit.GetData().checkIsEnemy(camp)) {
                        arrAvalbleAttackUnit.push(resultUnit);
                    }
                }
            })

            return arrAvalbleAttackUnit;
        }
        return null;
    }
    /**根据可移动的格子范围内获取与目标某个范围内的格子最近的距离格子 */
    public GetNearAroundTargetFromPosGrid(fromData: HexagonData, targetData: HexagonData, avalibleGrids: HexagonData[], distance: number): HexagonData[] {
        if (!fromData || !targetData || !avalibleGrids || avalibleGrids.length === 0 || distance < 0) {
            return [];
        }

        var resultGrids = PathFindingMgr.getInstance().getCellsInRange(targetData, distance);
        if (!resultGrids || resultGrids.length === 0) {
            return [];
        }

        // 按与起点的距离对可到达的攻击格子分组
        var mapGrid = new Map<number, HexagonData[]>();
        var minDistance = Number.POSITIVE_INFINITY;
        var avalibleGridSet = new Set(avalibleGrids);
        // avalibleGridSet.add(fromData);
        resultGrids.forEach(gridData => {
            if (!avalibleGridSet.has(gridData)) {
                return;
            }

            let dis = HexagonData.distance(gridData.q, gridData.r, targetData.q, targetData.r);
            minDistance = Math.min(minDistance, dis);
            if (!mapGrid.has(dis)) {
                mapGrid.set(dis, [gridData]);
            } else {
                mapGrid.get(dis).push(gridData);
            }
        });

        return minDistance === Number.POSITIVE_INFINITY ? [] : mapGrid.get(minDistance) || [];
    }
    /**根据攻击方对受击方进行血量扣减 */
    public attackFunc(attackUnit: BattleUnit, beAttackUnits: BattleUnit[]): Map<string, number> {
        var attackParam = ConfigMgr.instance.getParam(ParamDefined.BATTLE_ATTACK_VALUE, ParamValueType.FLOAT)[0]
        var defineParam = ConfigMgr.instance.getParam(ParamDefined.BATTLE_DEFIND_VALUE, ParamValueType.FLOAT)[0]
        var singleAttack = attackUnit.GetData().GetSingleProperty().attack;
        var mapResult = new Map();
        beAttackUnits.forEach(beAttack => {
            let singleDefind = beAttack.GetData().GetSingleProperty().define;
            let result = -attackUnit.GetData().GetProperty().attack * ((attackParam + singleAttack) / (defineParam + singleDefind)) >> 0;
            // beAttack.HpHandler(result);
            mapResult.set(beAttack.GetData().uId, result);

        })
        return mapResult;
    }
    /** 根据可移动格子获取可攻击的敌人*/
    public GetAvalibleAttackByAvalibleWalkGrids(target: BattleUnit, avalibleGrids: HexagonData[], isIgnoreBlock: boolean = false) {
        var battleData = target.GetData();
        var attackDistance = battleData.unitCfg.attack_distance;
        var enemys = this.GetAttackTargets(battleData.camp);
        var avalibleAttackTargets: BattleUnit[] = [];
        enemys.forEach(enemy => {
            var enermyPos = enemy.GetMapPos();
            for (let i = 0; i < avalibleGrids.length; i++) {
                let grid = avalibleGrids[i]
                if (HexagonData.distance(enermyPos.q, enermyPos.r, grid.q, grid.r) <= attackDistance) {
                    avalibleAttackTargets.push(enemy)
                    break;
                }
            }

        })
        return avalibleAttackTargets;
    }
    /**电脑AI自动索敌 */
    public EnemyAIActionAutoSelectTarget(enemyUnit: BattleUnit) {
        var pos = enemyUnit.GetMapPos();
        var hexData = BattleMapMgr.getInstance().getHexData(pos.q, pos.r);
        var resultGrids = PathFindingMgr.getInstance().getReachableRange(hexData, enemyUnit.GetData().unitCfg.move_distance);
        var targetEnemys = this.GetAvalibleAttackByAvalibleWalkGrids(enemyUnit, resultGrids)
        if (targetEnemys && targetEnemys.length > 0) {
            // 如果在可攻击范围内的敌人，选择最近距离的
            targetEnemys.sort((a, b) => {
                let posA = a.GetMapPos();
                let posB = b.GetMapPos();
                return HexagonData.distance(posA.q, posA.r, pos.q, pos.r) <= HexagonData.distance(posB.q, posB.r, pos.q, pos.r) ? -1 : 1;

            })
            return targetEnemys[0];
        }
        return null;
    }
    /**获取地图上最近距离的敌人 */
    public GetNearEnemy(enemyUnit: BattleUnit) {
        var enemys = this.GetAttackTargets(enemyUnit.GetData().camp);
        var minDistance = Number.POSITIVE_INFINITY;
        var myPos = enemyUnit.GetMapPos();
        var nearestEnemy: BattleUnit;
        enemys.forEach(enemyUnit => {
            let pos = enemyUnit.GetMapPos()
            if (HexagonData.distance(pos.q, pos.r, myPos.q, myPos.r) < minDistance) {
                nearestEnemy = enemyUnit;
            }
        })
        return nearestEnemy;
    }
    /**根据两个坐标的距离,在可移动的格子里获取最靠近目的地的坐标格子 */
    public GetNearestGridData(enemyUnit: BattleUnit, targetGrid: HexagonData): HexagonData {
        if (!enemyUnit || !targetGrid) {
            return null;
        }

        var pos = enemyUnit.GetMapPos();
        var hexData = BattleMapMgr.getInstance().getHexData(pos.q, pos.r);

        // 可移动格子
        var avaliblesGrids = PathFindingMgr.getInstance().getReachableRange(hexData, enemyUnit.GetData().unitCfg.move_distance);
        var minDistance = Number.POSITIVE_INFINITY;
        var nearestGrid: HexagonData = null;
        avaliblesGrids.forEach(gridData => {
            let dis = HexagonData.distance(gridData.q, gridData.r, targetGrid.q, targetGrid.r);
            if (dis < minDistance) {
                minDistance = dis;
                nearestGrid = gridData;
            }
        });

        return nearestGrid;
    }
    /**获取战斗结果 */
    public CheckIsFinishBattle(): BATTLE_RESULT {
        if (this._mapMyUnit.size < 1) {
            return BATTLE_RESULT.LOSE
        } else if (this._mapEnemyUnit.size < 1) {
            return BATTLE_RESULT.WIN
        } else {
            return BATTLE_RESULT.NONE;
        }
    }
    /**重置单位反击次数 */
    public ResetBattleUnitCounterAttack() {
        if (this._mapEnemyUnit.size > 0) {
            this._mapEnemyUnit.forEach(enemy => {
                enemy.GetData().counterAttackNum = 0;
            })
        }
        if (this._mapMyUnit.size > 0) {
            this._mapMyUnit.forEach(myUnit => {

                myUnit.GetData().counterAttackNum = 0;
            })
        }
    }
    public getHistoryByHistoryNode(historyNode: IHISTORY_NODE) {
        return this.battleHistory.get(historyNode.round)?.[historyNode.index];
    }
    /**记录当前各单位信息 */
    public addHistory(historyNode: IHISTORY_NODE) {
        if (!this.isSaveBattleHistory) {
            return;
        }
        var arrHistory = this.battleHistory.get(historyNode.round);
        if (!arrHistory) {
            arrHistory = [];
            this.battleHistory.set(historyNode.round, arrHistory);
        }
        // 如果有记录就跳过
        if (arrHistory.length - 1 >= historyNode.index) {
            return;
        }
        let history: IBATTLE_HISTORY_DATA = { battleUnits: new Map(), historyNode: historyNode }
        arrHistory[historyNode.index] = history;
        if (this._mapEnemyUnit.size > 0) {
            this._mapEnemyUnit.forEach(enemy => {
                let data = enemy.GetData();
                let pos = enemy.GetMapPos()
                history.battleUnits.set(data.uId, { battleUnitData: data.Clone(), pos: { q: pos.q, r: pos.r } });
            })
        }
        if (this._mapMyUnit.size > 0) {
            this._mapMyUnit.forEach(myUnit => {
                let data = myUnit.GetData();
                let pos = myUnit.GetMapPos()
                history.battleUnits.set(data.uId, { battleUnitData: data.Clone(), pos: { q: pos.q, r: pos.r } });
            })
        }
    }
    /**记录战斗行为 */
    public addHistoryAction(historyNode: IHISTORY_NODE, actionType: BATTLE_HISTORY_ACTION_TYPE, actionUnitUID: string[], targetPos?: HexagonPos, otherParams?: any[]) {
        if (!this.isSaveBattleHistory) {
            return
        }

        let history: IBATTLE_HISTORY_DATA = this.battleHistory.get(historyNode.round)[historyNode.index];
        if (history) {
            history.action = { actionType: actionType, actionUnitUID: actionUnitUID };
            if (targetPos) {
                history.action.targetPos = { q: targetPos.q, r: targetPos.r }
            }
            if (otherParams) {
                history.action.otherParam = otherParams;
            }
        }
    }
    /**更新所有单位播放速率 */
    public updateUnitSpeed() {
        if (this._mapEnemyUnit.size > 0) {
            this._mapEnemyUnit.forEach(enemy => {
                enemy.SetSpeedRate(this.playSpeedRate);
            })
        }
        if (this._mapMyUnit.size > 0) {
            this._mapMyUnit.forEach(myUnit => {
                myUnit.SetSpeedRate(this.playSpeedRate);
            })
        }
    }
    /**重置战斗卡牌 */
    public refreshSkillCards() {
        var arrHeros = PVEMgr.getInstance().getCurBattleHero();
        if (arrHeros) {
            let skillArr = [];
            arrHeros.forEach(hero => {
                var unitCfg = ConfigMgr.instance.UnitData.get(hero.unitId);
                if (unitCfg) {
                    unitCfg.anger_skill.forEach(skillId => {
                        const skillCfg = ConfigTools.instance.getSkillCfgByLevel(skillId);
                        if (skillCfg) {
                            skillArr.push(skillCfg);
                        }
                    })
                }
            })
            let MaxLen = ConfigMgr.instance.getParam(ParamDefined.BATTLE_CARD_NUM_MAX, ParamValueType.INT)[0];
            return skillArr.slice(0, MaxLen);
        }
        return null;
    }

}


