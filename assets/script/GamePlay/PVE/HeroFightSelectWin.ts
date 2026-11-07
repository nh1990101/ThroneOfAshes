import { _decorator, Layout, NodeEventType } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { comp } from '../../Common/Decorator';
import { GridScrollList, SCROLL_VERTICAL } from '../../Component/BaseComp/GridScrollList';
import { HeroIcon, HeroIconData } from './component/HeroIcon';
import { BattleTeamData, PVEMgr } from './PVEMgr';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { HeroIconSelect, HeroIconSelectData } from './component/HeroIconSelect';
import { GameEvent, ParamDefined, ParamValueType } from '../../Common/GameEnum';
import { lang } from '../../Common/LangMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { bindTabList } from '../../Component/SelectList';
import { HeroFactionData } from '../Hero/HeroFactionCell';
import { EventManager } from '../../Common/EventManager';
import { BattleMgr } from '../Battle/BattleMgr';
import { BagPageCell, BagPageTab } from '../Bag/BagPageCell';
const { ccclass, property } = _decorator;
/** 阵营页签的全选。FactionData 的 id 从 1 开始 */
const FACTION_ALL = 0;
@ccclass('HeroFightSelectWin')
export class HeroFightSelectWin extends BaseWin {
    /** 点蒙版是取消选择，不关窗口 */
    protected close_on_mask = false;

    @comp(BaseBtn)
    btn_close: BaseBtn = null!;

    @comp(Layout)
    page_tab_list: Layout = null!;


    @comp(GridScrollList)
    listHero: GridScrollList = null!;

    @comp(BaseSprite)
    btn_mask: BaseSprite = null!;

    @comp(BaseLabel)
    lb_selectNum: BaseLabel = null!;

    @comp(BaseLabel)
    lb_commandMax: BaseLabel = null!;

    @comp(BaseBtn)
    btn_confirm: BaseBtn = null!;

    @comp(BaseBtn)
    btn_cancle: BaseBtn = null!;

    /**临时旧的上阵数据 */
    private _oldBattleArray: Map<number, BattleTeamData>;


    /** 0 是全选，其它是 FactionData.id */
    private selectedFactionId = FACTION_ALL;
    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.btn_mask.node, NodeEventType.TOUCH_END, this.onClickCancle);
        this.addNodeEvent(this.btn_cancle.node, NodeEventType.TOUCH_END, this.onClickCancle);
        this.addNodeEvent(this.btn_confirm.node, NodeEventType.TOUCH_END, this.onClickConfirm);
        this.addEvent(GameEvent.HERO_FIGHT_SELECT_UPDATE, this.onUpdateInfo, this);
        // this.listHero.setDataList(HeroIconSelect, []);
        this.initFactionTabs();
        // this.applyHeroList(true);
    }
    public OnRefreshUI(): void {
        super.OnRefreshUI();

        var ordinaryArr = this.Mgr.getCurBattleArray();
        this._oldBattleArray = new Map();
        ordinaryArr.forEach(item => {
            this._oldBattleArray.set(item.uId, item);
        })
        this.applyHeroList();
    }
    /** 全选在最前，后面按阵营表 id 排序。模板节点由 Layout 横向排开 */
    private initFactionTabs() {
        bindTabList(this.page_tab_list.node, 'bag_page_tab', this.getFactionTabs(), BagPageCell, tab => {
            this.selectedFactionId = tab.id;
            this.applyHeroList();
        });
    }


    private applyHeroList() {
        const heroes = this.getVisibleHeroes();
        // if (rebuild) {
        //     this.listHero.setDataList(HeroIconSelect, heroes, SCROLL_VERTICAL, [0, 0, 12]);
        // } else {
        // }
        heroes.sort((a, b) => {
            var sortA = this.getHeroRankValue(a);
            var sortB = this.getHeroRankValue(b);
            return sortA > sortB ? -1 : 1;
        })
        this.listHero.updateList(heroes, HeroIconSelect);
        this.onUpdateInfo();
    }
    /**士兵排名分值：稀有度高的在前，同稀有度按配置ID */
    private getHeroRankValue(heroData: HeroIconData) {
        return BattleMgr.getInstance().GetPropertyByHero(heroData.uId).command;
        // return ConfigMgr.instance.UnitData.get(heroData.unitId).rarity_id * 10000000 + heroData.unitId;
    }
    /** 全选显示全部。其它页签按单位表 faction_id 过滤 */
    private getVisibleHeroes(): HeroIconData[] {
        if (this.selectedFactionId === FACTION_ALL) {
            return this.Mgr.heroList;
        }
        const factionId = this.selectedFactionId;
        return this.Mgr.heroList.filter(hero => {
            const cfg = ConfigMgr.instance.HeroData.get(hero.heroId);
            const unit = cfg?.unit_id != null ? ConfigMgr.instance.UnitData.get(cfg.unit_id) : undefined;
            return unit?.faction_id === factionId;
        });
    }
    private getFactionTabs(): HeroFactionData[] {
        const tabs: HeroFactionData[] = [{ id: FACTION_ALL, name: '全选' }];
        const factions = Array.from(ConfigMgr.instance.FactionData.values()).sort((a, b) => a.id - b.id);
        for (const faction of factions) {
            tabs.push({ id: faction.id, name: faction.name != null ? lang(faction.name) : '' });
        }
        return tabs;
    }

    onUpdateInfo() {
        var arr = this.Mgr.getCurBattleHero();
        var curNum = arr.length;
        var max = ConfigMgr.instance.getParam(ParamDefined.HERO_BATTLE_MAX, ParamValueType.INT)[0];

        this.lb_selectNum.string = `${curNum}/${max}`//lang(155, { select: `${curNum}/${max}` });

        this.lb_commandMax.string = this.Mgr.getCommand(this.Mgr.getCurBattleHero()).toString()//lang(156, { num: this.Mgr.getCommand(this.Mgr.getCurBattleHero()) });
    }
    public get Mgr() {
        return PVEMgr.getInstance();
    }
    public onClickCancle() {
        this.closeWin();
        this.Mgr.saveBattleArray(this.Mgr.curBattleArrId, this._oldBattleArray);

    }
    private onClickConfirm() {
        EventManager.Instance.dispatch(GameEvent.FIGHT_SELECT_UNIT_UPDATE)
        this.closeWin();
    }

}


