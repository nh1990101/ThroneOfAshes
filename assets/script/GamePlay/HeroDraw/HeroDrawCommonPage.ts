import { _decorator, Node } from 'cc';
import { child, comp } from '../../Common/Decorator';
import { GameEvent } from '../../Common/GameEnum';
import { BasePage } from '../../Component/BasePage';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { CostItem } from '../../Component/CostItem';
import { UIMananger } from '../../Component/UIMananger';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { IDrawPoolData } from '../../Config/Typings/DrawPoolData';
import { FlyNoticeMgr } from '../BaseSystem/FlyNoticeMgr';
import { HeroIcon, HeroIconData } from '../PVE/component/HeroIcon';
import { DrawLang, HeroDrawMgr } from './HeroDrawMgr';
import { HeroCommonDrawProbabilityWin } from './HeroCommonDrawProbabilityWin';
import { HeroCommonDrawWishWin } from './HeroCommonDrawWishWin';
import { HeroDrawRewardWin } from './HeroDrawRewardWin';
import type { HeroDrawWin } from './HeroDrawWin';
const { ccclass } = _decorator;

/** 酒馆里的公共抽卡页。切页签只换卡池，不换页面 */
@ccclass('HeroDrawCommonPage')
export class HeroDrawCommonPage extends BasePage {
    @comp(BaseLabel, 'name')
    private pool_name: BaseLabel = null!;

    @child()
    private wish_hero: Node = null!;

    @child()
    private next_wish_time: Node = null!;

    @child()
    private cheat_text: Node = null!;

    @comp(BaseLabel, 'next_cheat_text')
    private next_cheat_text: BaseLabel = null!;

    @comp(BaseLabel, 'SSS_text')
    private sss_text: BaseLabel = null!;

    @child()
    private free_draw: Node = null!;

    @child()
    private one_draw: Node = null!;

    @child()
    private ten_draw: Node = null!;

    @child()
    private probability_btn: Node = null!;

    private pool_id: number | null = null;
    private free_btn: BaseBtn = null!;
    private one_btn: BaseBtn = null!;
    private ten_btn: BaseBtn = null!;
    private one_cost: CostItem = null!;
    private ten_cost: CostItem = null!;

    public init(): void {
        super.init();
        this.bindDrawNodes();
    }

    private bindDrawNodes(): void {
        this.free_btn = this.free_draw.getChildByName('btn').getComponent(BaseBtn);
        this.one_btn = this.one_draw.getChildByName('btn').getComponent(BaseBtn);
        this.ten_btn = this.ten_draw.getChildByName('btn').getComponent(BaseBtn);
        this.one_cost = this.costOn(this.one_draw);
        this.ten_cost = this.costOn(this.ten_draw);
    }

    /** 消耗预制体上还没挂脚本，没有就补上 */
    private costOn(draw_node: Node): CostItem {
        const node = draw_node.getChildByName('cost_item');
        return node.getComponent(CostItem) || node.addComponent(CostItem);
    }

    public initEvent(): void {
        this.addNodeEvent(this.free_btn.node, Node.EventType.TOUCH_END, this.onClickFree);
        this.addNodeEvent(this.one_btn.node, Node.EventType.TOUCH_END, this.onClickOne);
        this.addNodeEvent(this.ten_btn.node, Node.EventType.TOUCH_END, this.onClickTen);
        this.addNodeEvent(this.wish_hero, Node.EventType.TOUCH_END, this.onClickWish);
        this.addNodeEvent(this.probability_btn, Node.EventType.TOUCH_END, this.onClickProbability);
        this.addEvent(GameEvent.Update_Hero_Draw_Wish, this.refreshWishHero, this);
        super.initEvent();
    }

    public showPage(pool_id?: number): void {
        if (typeof pool_id === 'number') {
            this.pool_id = pool_id;
        } else if (this.pool_id == null) {
            this.pool_id = this.poolFromWin();
        }
        const win = UIMananger.instance.getWinByName('HeroDrawWin') as HeroDrawWin;
        if (this.pool_id == null || !win.canShowPool(this.pool_id)) {
            this.node.active = false;
            return;
        }
        super.showPage(this.pool_id);
    }

    /** 页面是后加载的，没带卡池 id 时用窗口当前选中的 */
    private poolFromWin(): number | null {
        const win = UIMananger.instance.getWinByName('HeroDrawWin') as HeroDrawWin;
        if (!win) {
            return null;
        }
        return win.getSelectedPool();
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        // 卡池表没有许愿重置时间，倒计时先不显示
        this.wish_hero.active = true;
        this.next_wish_time.active = false;
        if (this.pool_id == null) {
            this.pool_id = this.poolFromWin();
        }
        this.refreshWishHero();
        if (this.pool_id == null) {
            return;
        }
        const pool = ConfigMgr.instance.DrawPoolData.get(this.pool_id);
        if (!pool) {
            return;
        }
        this.pool_name.setText(pool.name ?? '');
        this.refreshPity(pool);
        this.refreshButtons(pool);
    }

    private refreshPity(pool: IDrawPoolData): void {
        if (!pool.pity_count) {
            this.cheat_text.active = false;
            return;
        }
        this.cheat_text.active = true;
        const left = HeroDrawMgr.getInstance().getPityLeft(pool.id);
        this.next_cheat_text.setText(DrawLang.pityLeft, { count: left });
        const rare_name = pool.pity_quality != null
            ? ConfigMgr.instance.UnitRareData.get(pool.pity_quality)?.name
            : undefined;
        this.sss_text.setText(rare_name ?? '');
    }

    private refreshButtons(pool: IDrawPoolData): void {
        const mgr = HeroDrawMgr.getInstance();
        const free_left = mgr.getFreeLeft(pool.id);
        this.free_draw.active = free_left > 0;
        this.one_draw.active = free_left <= 0;
        this.ten_draw.active = true;
        const one = mgr.resolveCost(pool, false);
        if (one) {
            this.one_cost.setData({ item_id: one.item_id, count: one.count });
        }
        const ten = mgr.resolveCost(pool, true);
        if (ten) {
            this.ten_cost.setData({ item_id: ten.item_id, count: ten.count });
        }
    }

    private onClickFree(): void {
        this.draw(1, true);
    }

    /** 没选显示加号，选了把英雄头像画到许愿槽 */
    private refreshWishHero(): void {
        const hero_id = this.pool_id == null ? null : HeroDrawMgr.getInstance().getWishHero(this.pool_id);
        const icon_node = this.wish_hero.getChildByName('hero_icon');
        const has_hero = hero_id != null;
        icon_node.active = has_hero;
        this.wish_hero.getChildByName('add').active = !has_hero;
        if (hero_id == null) {
            return;
        }
        const icon = icon_node.getComponent(HeroIcon) || icon_node.addComponent(HeroIcon);
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

    private onClickWish(): void {
        if (this.pool_id == null) {
            return;
        }
        UIMananger.instance.showWin(HeroCommonDrawWishWin, this.pool_id);
    }

    private onClickProbability(): void {
        UIMananger.instance.showWin(HeroCommonDrawProbabilityWin);
    }

    private onClickOne(): void {
        this.draw(1, false);
    }

    private onClickTen(): void {
        this.draw(10, false);
    }

    private draw(count: number, is_free: boolean): void {
        if (this.pool_id == null) {
            return;
        }
        const outcome = HeroDrawMgr.getInstance().tryDraw(this.pool_id, count, is_free);
        if (outcome.tip) {
            void FlyNoticeMgr.getInstance().showTexts(outcome.tip);
            return;
        }
        UIMananger.instance.showWin(HeroDrawRewardWin, {
            pool_id: this.pool_id,
            hero_ids: outcome.hero_ids,
            is_new: outcome.is_new,
        });
        this.OnRefreshUI();
    }
}
