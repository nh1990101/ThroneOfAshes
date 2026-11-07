import { _decorator, Component, Node } from 'cc';
import { BaseMgr } from '../../Common/BaseMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { GlobalData } from '../../Common/GlobalData';
import { IStageData } from '../../Config/Typings/StageData';
import { BagItem } from '../Bag/BagMgr';
import { SoldierIconData } from './component/SoldierIcon';
import { HeroCardData } from '../Hero/HeroCardComp';
import { HeroMgr } from '../Hero/HeroMgr';
import { HexagonPos } from '../Battle/HexagonData';
import { HeroIcon, HeroIconData } from './component/HeroIcon';
import { ParamDefined, ParamValueType } from '../../Common/GameEnum';
import { SoldierMgr } from '../Soldier/SoldierMgr';
import { Tools } from '../../Common/Tools';
import { BattleUnit } from '../Battle/BattleUnit';
import { BattleMgr } from '../Battle/BattleMgr';
const { ccclass, property } = _decorator;

/**布阵单位数据 */
export interface BattleTeamData {
    pos?: HexagonPos;
    unitId: number;
    uId: number;
    // 士兵上阵数量
    num: number;
}
@ccclass('PVEMgr')
export class PVEMgr extends BaseMgr {
    public curStage: IStageData;

    /**拥有的士兵 */
    public soldierList: SoldierIconData[];

    /**拥有的英雄 */
    public heroList: HeroIconData[];

    /**阵容ID->布阵单位信息*/
    public battleArray: Map<number, Map<number, BattleTeamData>>;

    /**当前使用的阵容ID ID0是临时编队 */
    public curBattleArrId: number = 1;

    /**是否拖动上阵单位中 */
    public isDragingUnit: boolean;

    /**布阵界面已创建的实体：阵容单位uId -> 实体 */
    private _unitMap: Map<number, BattleUnit> = new Map();
    private _mapHeros: Map<number, HeroIconData>;

    public initEvent(): void {
        super.initEvent();
        this.battleArray = new Map();
        //设置默认阵容
        this.battleArray.set(1, new Map());
        var heroDatas = HeroMgr.getInstance().getTestHeroes();
        this.heroList = [];
        this._mapHeros = new Map();
        let uidCreator = 1;
        heroDatas.forEach(item => {
            let uId = uidCreator++;
            let heroData = { uId: uId, heroId: item.id, lv: item.level, star: item.star, unitId: ConfigMgr.instance.HeroData.get(item.id).unit_id };
            Tools.insertArr(this.heroList, heroData)
            this._mapHeros.set(uId, heroData)
        })


        this.soldierList = [];
        SoldierMgr.getInstance().getSoldiers().forEach(soldier => {
            let unitId = ConfigMgr.instance.SoldierData.get(soldier.id).unit_id;
            Tools.insertArr(this.soldierList, { uId: uidCreator++, unitId: unitId, lv: this.getSoldierLv(unitId), num: this.getSoldierNum(unitId) });
        });
    }
    public getStageCfgByChapter(chapter: number, order: number) {
        var stageId = ConfigMgr.instance.StageDataIndex.StageDataIndex[chapter]?.[order];
        return stageId ? ConfigMgr.instance.StageData.get(stageId) : null;
    }
    /**检测当前章节是否已完成 */
    public CheckHasFinish(chapter: number, order: number) {
        var curChapter = GlobalData.wildData.chapter;
        var curOrder = GlobalData.wildData.copyIndex;
        return curChapter > chapter || (curChapter == chapter && curOrder >= order);
    }
    /**检测当前章节是否能挑战 */
    public CheckIsCanFight(chapter: number, order: number) {
        var curChapter = GlobalData.wildData.chapter;
        var curOrder = GlobalData.wildData.copyIndex;
        var curChapterMaxOrder = this.GetMaxOrderByChapter(chapter);
        // 判断下一章
        if (chapter + 1 == curChapter && curChapterMaxOrder == curOrder) {
            return true;
        }
        return curChapter > chapter || (curChapter == chapter && curOrder + 1 >= order);
    }
    /**获取当前章最大关卡数 */
    public GetMaxOrderByChapter(chapter: number) {
        return Object.keys(ConfigMgr.instance.StageDataIndex.StageDataChapters[chapter] ?? {}).length;
    }
    /**获取下一关章节 */
    public getNextGate() {
        var curChapter = GlobalData.wildData.chapter;
        var curOrder = GlobalData.wildData.copyIndex;
        var curChapterMaxOrder = this.GetMaxOrderByChapter(curChapter);
        if (curChapterMaxOrder == curOrder) {
            if (ConfigMgr.instance.ChapterData.get(curChapter + 1)) {
                return [curChapter + 1, 1];
            }
            return [curChapter, curChapterMaxOrder];
        }
        return [curChapter, curOrder + 1]
    }
    /**保存阵容 */
    public saveBattleArray(id: number, battleArr: Map<number, BattleTeamData>) {
        this.battleArray.set(id, battleArr);
    }
    /**保存当前阵容 */
    public saveCurrBattleArray(battleArr: Map<number, BattleTeamData>) {
        this.saveBattleArray(this.curBattleArrId, battleArr);
    }
    /**添加上阵信息 */
    public addUnitInCurBattleArray(data: BattleTeamData) {
        // 英雄有上阵数量上限，士兵不限
        if (this.checkIsHero(data.uId)) {
            var max = ConfigMgr.instance.getParam(ParamDefined.HERO_BATTLE_MAX, ParamValueType.INT)[0];
            if (!this.checkIsInTeamByUnitId(data.uId) && this.getCurBattleHero().length >= max) {
                return false;
            }
        }
        this.getCurBattleArray().set(data.uId, data);
        return true;
    }
    /**下阵单位 */
    public deleteUnitInCurBattleArray(uId: number) {
        if (this.getCurBattleArray()?.get(uId)) {
            this.getCurBattleArray().delete(uId);
        }
    }
    /**是否是英雄单位 */
    public checkIsHero(uId: number) {
        return this.heroList.some(hero => hero.uId == uId);
    }
    /**更新阵容中某个单位的格子位置 */
    public setUnitPos(uId: number, pos: HexagonPos) {
        var data = this.getCurBattleArray()?.get(uId);
        if (data) {
            data.pos = { q: pos.q, r: pos.r };
        }
    }
    /**交换阵容中两个单位的格子位置 */
    public swapUnitPos(uIdA: number, uIdB: number) {
        var arr = this.getCurBattleArray();
        if (!arr) return false;
        var dataA = arr.get(uIdA);
        var dataB = arr.get(uIdB);
        if (!dataA || !dataB || !dataA.pos || !dataB.pos) return false;
        var posA = { q: dataA.pos.q, r: dataA.pos.r };
        dataA.pos = { q: dataB.pos.q, r: dataB.pos.r };
        dataB.pos = posA;
        return true;
    }

    // ==================== 布阵实体管理 ====================
    /**添加布阵实体 */
    public addUnitEntity(uId: number, unit: BattleUnit) {
        this._unitMap.set(uId, unit);
    }
    /**获取布阵实体 */
    public getUnitEntity(uId: number) {
        return this._unitMap.get(uId);
    }
    /**移除布阵实体（只移数据，节点由调用方回收） */
    public removeUnitEntity(uId: number) {
        var unit = this._unitMap.get(uId);
        if (unit) {
            this._unitMap.delete(uId);
        }
        return unit;
    }
    /**清空所有布阵实体 */
    public clearUnitEntity() {
        this._unitMap.clear();
    }
    /**获取所有布阵实体 */
    public getUnitEntityMap() {
        return this._unitMap;
    }
    /**根据阵容ID获取阵容信息 */
    public getBattleArr(id: number) {
        return this.battleArray.get(id);
    }
    /**获取当前布阵阵容信息 */
    public getCurBattleArray() {
        return this.getBattleArr(this.curBattleArrId);
    }
    /**获取当前上阵的英雄 */
    public getCurBattleHero() {
        return this.getBattleHero(this.curBattleArrId);
    }
    /**获取某队的上阵英雄 */
    public getBattleHero(teamId: number) {
        let result: HeroIconData[] = [];
        this.heroList.forEach(hero => {
            if (this.checkIsInTeamByUnitId(hero.uId, teamId)) {
                Tools.insertArr(result, hero);
            }
        });
        return result;
    }
    /**获取当前上阵士兵 */
    public getCurBattleSoldier(): SoldierIconData[] {
        return this.getBattleSoldier(this.curBattleArrId);
    }
    /**获取某队的上阵士兵 */
    public getBattleSoldier(teamId: number): SoldierIconData[] {
        let result = [];
        this.soldierList.forEach(soldier => {
            if (this.checkIsInTeamByUnitId(soldier.uId, teamId)) {
                Tools.insertArr(result, soldier);
            }
        });
        return result;
    }
    /**检测某个单位ID是否在当前上阵列表中 */
    public checkIsInTeamByUnitId(uId: number, teamId: number = this.curBattleArrId) {
        var teamMap = this.getBattleArr(teamId);
        return teamMap && teamMap.get(uId) != null && teamMap.get(uId) != undefined;
    }
    /**根据英雄列表获取统御值 */
    public getCommand(arr: HeroIconData[]) {
        var num = 0;
        arr.forEach(hero => {
            if (hero) {
                // var unitCfg = ConfigMgr.instance.UnitData.get(hero.unitId);
                // if (unitCfg) {
                //     var unitAttrCfg = ConfigMgr.instance.UnitAttrData.get(unitCfg.unit_attr);
                //     if (unitAttrCfg) {
                //         num += unitAttrCfg.command;
                //     }
                // }
                var property = BattleMgr.getInstance().GetPropertyByHero(hero.uId)
                num += property.command;
            }
        });
        return Math.floor(num);
    }
    /**统计当前阵容的士兵需要的统御值 */
    public getNeedCommand(arr: SoldierIconData[]) {

        var num = 0;
        arr.forEach(soldier => {
            var unitCfg = ConfigMgr.instance.UnitData.get(soldier.unitId);
            var teamData = this.getCurBattleArray().get(soldier.uId);
            if (unitCfg && teamData) {
                num += unitCfg.need_bonus * teamData.num;
            }
        })
        return Math.ceil(num);
    }
    /**获取士兵需要的统御值 */
    public getCommandByUnitId(unitId: number) {
        var unitCfg = ConfigMgr.instance.UnitData.get(unitId);
        // var teamData = this.getCurBattleArray().get(soldier.uId);
        return unitCfg?.need_bonus;
    }
    /**获取士兵数量 */
    public getSoldierNum(unitId: number) {
        return 100;
    }
    /**获取自己士兵等级 */
    public getSoldierLv(uId: number) {
        return 1;
    }
    /**获取队伍中的士兵单位数量 */
    public getTeamSoldierUnitNum(teamId: number) {
        var teamData = this.getBattleArr(teamId);
        if (teamData) {
            var num = 0;
            teamData.forEach(item => {
                if (item.pos) {
                    num++;
                }
            })
            return num;
        }
        return 0;
    }
    /**获取当前队伍中的士兵单位数量 */
    public getCurTeamSoldierUnitNum() {
        return this.getTeamSoldierUnitNum(this.curBattleArrId);
    }
    /**根据UID获取当前英雄数据 */
    public getHeroDataByUID(uId: number) {
        return this._mapHeros.get(uId);
    }
}


