import { _decorator, Node } from 'cc';
import { child, comp } from '../../Common/Decorator';
import { lang } from '../../Common/LangMgr';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { GridScrollList, SCROLL_VERTICAL } from '../../Component/BaseComp/GridScrollList';
import { bindTabList } from '../../Component/SelectList';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { FlyNoticeMgr } from '../BaseSystem/FlyNoticeMgr';
import { HeroFactionCell, HeroFactionData } from '../Hero/HeroFactionCell';
import { HeroIcon, HeroIconData } from '../PVE/component/HeroIcon';
import { DrawLang, HeroDrawMgr } from './HeroDrawMgr';
const { ccclass } = _decorator;

/** 阵营页签的全选。FactionData 的 id 从 1 开始 */
const FACTION_ALL = 0;

/** 英雄许愿。选一个当前卡池里的高稀有度英雄 */
@ccclass('HeroCommonDrawWishWin')
export class HeroCommonDrawWishWin extends BaseWin {
    @comp(BaseBtn)
    btn_close: BaseBtn = null!;

    @comp(BaseBtn, 'btn_confirm')
    private btn_confirm: BaseBtn = null!;

    @comp(GridScrollList, 'hero_scroll')
    private hero_scroll: GridScrollList = null!;

    @child()
    private faction_tab_list: Node = null!;

    @child()
    private hero_icon: Node = null!;

    private pool_id = 0;
    private faction_id = FACTION_ALL;
    private tabs_ready = false;
    private list_ready = false;

    public showWin(pool_id?: number): void {
        if (typeof pool_id === 'number') {
            this.pool_id = pool_id;
        }
        super.showWin(pool_id);
    }

    public init(): void {
        super.init();
        const content = this.hero_scroll.node.getChildByPath('view/content');
        this.hero_scroll.content = content;
    }

    public initEvent(): void {
        this.hero_scroll.setSelectFunc((data: HeroIconData) => {
            this.onSelectHero(data);
        });
        this.addNodeEvent(this.btn_confirm.node, Node.EventType.TOUCH_END, this.onClickConfirm);
        // 卡池表没有玩法说明 id，btn_tips 先不打开说明
        this.buildFactionTabs();
        super.initEvent();
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        if (!this.tabs_ready || this.pool_id === 0) {
            return;
        }
        this.refreshHeroList();
    }

    private buildFactionTabs(): void {
        bindTabList(this.faction_tab_list, 'hero_faction_tab', this.factionTabs(), HeroFactionCell, tab => {
            this.faction_id = tab.id;
            this.refreshHeroList();
        });
        this.tabs_ready = true;
    }

    private factionTabs(): HeroFactionData[] {
        const tabs: HeroFactionData[] = [{ id: FACTION_ALL, name: lang(DrawLang.all) }];
        const factions = Array.from(ConfigMgr.instance.FactionData.values()).sort((a, b) => a.id - b.id);
        for (const faction of factions) {
            tabs.push({ id: faction.id, name: faction.name != null ? lang(faction.name) : '' });
        }
        return tabs;
    }

    private refreshHeroList(): void {
        const list = HeroDrawMgr.getInstance().wishHeroes(this.pool_id).filter(item => {
            return this.faction_id === FACTION_ALL || item.faction_id === this.faction_id;
        });
        const icons = list.map(item => this.iconData(item.hero_id));
        if (!this.list_ready) {
            this.list_ready = true;
            this.hero_scroll.setDataList(HeroIcon, icons, SCROLL_VERTICAL, [15, 15, 20]);
        } else {
            this.hero_scroll.updateList(icons);
        }
        const saved = HeroDrawMgr.getInstance().getWishHero(this.pool_id);
        const index = saved == null ? -1 : icons.findIndex(item => item.heroId === saved);
        if (index >= 0) {
            this.hero_scroll.setSelectedIndex(index, false);
            return;
        }
        this.refreshTopIcon(saved);
    }

    /** 酒馆当前等级还没有，SP 是否锁定先不拦。等级接上后用 HeroDrawMgr.isSpWishLocked */
    private onSelectHero(data: HeroIconData): void {
        this.refreshTopIcon(data.heroId);
    }

    private onClickConfirm(): void {
        // 本期已经抽到许愿英雄后不能再改，这个状态还没有
        const data = this.hero_scroll.selectedData as HeroIconData;
        if (!data) {
            void FlyNoticeMgr.getInstance().showTexts(lang(DrawLang.chooseWish));
            return;
        }
        HeroDrawMgr.getInstance().updateWishData({ pool_id: this.pool_id, hero_id: data.heroId });
        this.closeWin();
    }

    private refreshTopIcon(hero_id: number | null): void {
        this.hero_icon.active = hero_id != null;
        if (hero_id == null) {
            return;
        }
        const icon = this.hero_icon.getComponent(HeroIcon) || this.hero_icon.addComponent(HeroIcon);
        icon.setData(this.iconData(hero_id));
        icon.setSelected(false);
    }

    private iconData(hero_id: number): HeroIconData {
        const unit_id = ConfigMgr.instance.HeroData.get(hero_id)?.unit_id ?? 0;
        const unit = ConfigMgr.instance.UnitData.get(unit_id);
        const star = unit?.rarity_id != null
            ? ConfigMgr.instance.UnitRareData.get(unit.rarity_id)?.default_star
            : undefined;
        return { heroId: hero_id, uId: 0, unitId: unit_id, lv: 0, star };
    }
}
