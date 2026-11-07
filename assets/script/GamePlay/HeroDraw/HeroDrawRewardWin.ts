import { _decorator, Node } from 'cc';
import { child } from '../../Common/Decorator';
import { BaseWin } from '../../Component/BaseWin';
import { CostItem } from '../../Component/CostItem';
import { UIMananger } from '../../Component/UIMananger';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { FlyNoticeMgr } from '../BaseSystem/FlyNoticeMgr';
import { DrawRewardItem } from './DrawRewardItem';
import { HeroDrawMgr } from './HeroDrawMgr';
import { HeroGainUI } from './HeroGainUI';
const { ccclass } = _decorator;

/** 相邻两张卡起飞的间隔 */
const FLY_GAP = 0.08;

export interface HeroDrawRewardParam {
    pool_id: number;
    hero_ids: number[];
    is_new: boolean[];
}

/** 抽卡结算。卡从下方依次飞入。点开一张，或按顺序一张一张翻开 */
@ccclass('HeroDrawRewardWin')
export class HeroDrawRewardWin extends BaseWin {
    @child()
    private one_draw_panel: Node = null!;

    @child()
    private ten_draw_panel: Node = null!;

    @child()
    private all_open_btn: Node = null!;

    @child()
    private reward_list: Node = null!;

    @child()
    private draw: Node = null!;

    @child({ name: 'btn_close' })
    private close_btn: Node = null!;

    private pool_id = 0;
    private hero_ids: number[] = [];
    private is_new: boolean[] = [];
    /** 翻开后还没弹的新英雄 */
    private gain_queue: number[] = [];
    private gain_showing = false;
    private pending_deal = false;
    private dealing = false;
    private arrived = false;
    /** 一键全开正在按顺序翻 */
    private opening_all = false;
    /** 重新发牌时加一，上一轮飞完不再改按钮 */
    private deal_id = 0;

    public get Is_FullScene() {
        return true;
    }

    public get parentWinName(): string | null {
        return 'HeroDrawWin';
    }

    public init(): void {
        super.init();
        this.one_draw_panel.active = false;
        this.ten_draw_panel.active = false;
        this.close_btn.active = false;
    }

    public showWin(param?: HeroDrawRewardParam): void {
        if (param) {
            this.pool_id = param.pool_id;
            this.hero_ids = param.hero_ids;
            this.is_new = param.is_new;
            this.gain_queue = [];
            this.gain_showing = false;
            this.opening_all = false;
            this.pending_deal = true;
        }
        super.showWin(param);
    }

    public initEvent(): void {
        this.addNodeEvent(this.close_btn, Node.EventType.TOUCH_END, this.closeWin);
        this.addNodeEvent(this.all_open_btn, Node.EventType.TOUCH_END, this.onClickOpenAll);
        this.addNodeEvent(this.draw.getChildByName('draw_btn'), Node.EventType.TOUCH_END, this.onClickDraw);
        super.initEvent();
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        if (this.pool_id === 0 || this.hero_ids.length === 0) {
            return;
        }
        const is_ten = this.hero_ids.length > 1;
        this.one_draw_panel.active = !is_ten;
        this.ten_draw_panel.active = is_ten;
        this.refreshDrawCost();
        if (!this.pending_deal) {
            this.refreshButtons();
            return;
        }
        this.pending_deal = false;
        this.playDeal();
    }

    private playDeal(): void {
        this.deal_id += 1;
        const deal_id = this.deal_id;
        this.dealing = true;
        this.arrived = false;
        this.refreshButtons();
        const nodes = this.cardNodes();
        let left = nodes.length;
        nodes.forEach((node, index) => {
            const item = this.itemOn(node);
            item.setOpenedListener(() => this.onCardOpened(index));
            item.prepare(this.hero_ids[index]);
            item.playFly(index * FLY_GAP, () => {
                if (deal_id !== this.deal_id) {
                    return;
                }
                left -= 1;
                if (left > 0) {
                    return;
                }
                this.dealing = false;
                this.arrived = true;
                this.refreshButtons();
            });
        });
    }

    private onClickOpenAll(): void {
        if (this.dealing || !this.arrived || this.allOpened() || this.opening_all) {
            return;
        }
        this.opening_all = true;
        this.all_open_btn.active = false;
        this.setCardsClickable(false);
        this.flipNext();
    }

    private onClickDraw(): void {
        if (this.dealing || !this.allOpened()) {
            return;
        }
        const outcome = HeroDrawMgr.getInstance().tryDraw(this.pool_id, this.hero_ids.length, false);
        if (outcome.tip) {
            void FlyNoticeMgr.getInstance().showTexts(outcome.tip);
            return;
        }
        this.hero_ids = outcome.hero_ids;
        this.is_new = outcome.is_new;
        this.gain_queue = [];
        this.gain_showing = false;
        this.opening_all = false;
        this.pending_deal = true;
        this.OnRefreshUI();
    }

    private onCardOpened(index: number): void {
        if (this.is_new[index]) {
            this.is_new[index] = false;
            this.gain_queue.push(this.hero_ids[index]);
        }
        if (this.allOpened()) {
            this.refreshButtons();
        }
        if (this.cardNodes().some(node => node.getComponent(DrawRewardItem).isFlipping())) {
            return;
        }
        this.showNextGain();
        this.continueOpenAll();
    }

    /** 还没翻开的第一张。顺序翻的时候一张完成再翻下一张 */
    private flipNext(): void {
        for (const node of this.cardNodes()) {
            const item = node.getComponent(DrawRewardItem);
            if (!item.isOpened() && !item.isFlipping()) {
                item.flip();
                return;
            }
        }
        this.finishOpenAll();
    }

    /** 新英雄界面开着就先别翻下一张，关掉再继续 */
    private continueOpenAll(): void {
        if (!this.opening_all || this.gain_showing) {
            return;
        }
        if (this.cardNodes().some(node => node.getComponent(DrawRewardItem).isFlipping())) {
            return;
        }
        this.flipNext();
    }

    private finishOpenAll(): void {
        this.opening_all = false;
        this.setCardsClickable(true);
    }

    private setCardsClickable(clickable: boolean): void {
        for (const node of this.cardNodes()) {
            node.getComponent(DrawRewardItem).setClickable(clickable);
        }
    }

    /** 获得界面没开着才弹下一只。结算已经关掉就不再续 */
    private showNextGain(): void {
        if (!UIMananger.instance.checkWinIsOpenByClass(HeroDrawRewardWin)) {
            this.gain_queue = [];
            return;
        }
        if (this.gain_showing || this.gain_queue.length === 0) {
            return;
        }
        const hero_id = this.gain_queue.shift();
        if (hero_id == null) {
            return;
        }
        this.gain_showing = true;
        UIMananger.instance.showWin(HeroGainUI, {
            hero_id,
            on_close: () => {
                this.gain_showing = false;
                this.showNextGain();
                this.continueOpenAll();
            },
        });
    }

    private refreshButtons(): void {
        const is_ten = this.hero_ids.length > 1;
        const opened = !this.dealing && this.allOpened();
        const can_open = is_ten && this.arrived && !this.dealing && !opened;
        this.all_open_btn.active = can_open;
        this.draw.active = is_ten && this.arrived && opened;
        this.close_btn.active = opened;
    }

    private refreshDrawCost(): void {
        if (this.hero_ids.length <= 1) {
            return;
        }
        const pool = ConfigMgr.instance.DrawPoolData.get(this.pool_id);
        if (!pool) {
            return;
        }
        const cost = HeroDrawMgr.getInstance().resolveCost(pool, true);
        if (!cost) {
            return;
        }
        const node = this.draw.getChildByName('cost_item');
        const cost_item = node.getComponent(CostItem) || node.addComponent(CostItem);
        cost_item.setData({ item_id: cost.item_id, count: cost.count });
    }

    private allOpened(): boolean {
        return this.cardNodes().every(node => node.getComponent(DrawRewardItem).isOpened());
    }

    private cardNodes(): Node[] {
        if (this.hero_ids.length <= 1) {
            return [this.one_draw_panel.getChildByName('draw_reward_item')];
        }
        return this.reward_list.children.slice().sort((a, b) => Number(a.name) - Number(b.name));
    }

    private itemOn(node: Node): DrawRewardItem {
        return node.getComponent(DrawRewardItem) || node.addComponent(DrawRewardItem);
    }
}
