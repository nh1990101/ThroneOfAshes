import { _decorator, Layout, Node } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { GridScrollList, SCROLL_VERTICAL } from '../../Component/BaseComp/GridScrollList';
import { SliderInputComp } from '../../Component/SliderInputComp';
import { comp, child } from '../../Common/Decorator';
import { lang } from '../../Common/LangMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { ConfigTools, RewardItem, RewardList } from '../../Config/ConfigTools';
import { IItemData } from '../../Config/Typings/ItemData';
import { UIMananger } from '../../Component/UIMananger';
import { ItemIconComp, ItemIconData } from '../../Component/ItemIconComp';
import { BagMgr } from './BagMgr';
import { ItemInfoRewardCell } from './ItemInfoRewardCell';
import { ItemInfoSelectRewardCell, ItemInfoSelectReward } from './ItemInfoSelectRewardCell';
import { EquipInfoWin } from '../Equip/EquipInfoWin';
import { ItemType } from '../../Common/GameEnum';
const { ccclass } = _decorator;

/** 物品信息。传入物品数据即可查看，第二个参数为 true 时才能使用 */
@ccclass('ItemInfoWin')
export class ItemInfoWin extends BaseWin {
    @comp(BaseBtn)
    btn_close: BaseBtn = null!;

    @comp(ItemIconComp)
    item_icon: ItemIconComp = null!;

    @comp(BaseLabel)
    item_desc: BaseLabel = null!;

    @child()
    item_info: Node = null!;

    @child()
    item_detail: Node = null!;

    @child()
    use_content: Node = null!;

    @child()
    reward_content: Node = null!;

    @child()
    select_reward_content: Node = null!;

    @child()
    random_reward_content: Node = null!;

    @comp(SliderInputComp)
    slider_input: SliderInputComp = null!;

    @comp(GridScrollList)
    reward_scroll: GridScrollList = null!;

    @comp(GridScrollList)
    select_reward_scroll: GridScrollList = null!;

    @comp(GridScrollList)
    random_reward_scroll: GridScrollList = null!;

    @child()
    btns: Node = null!;

    @comp(BaseBtn)
    goto_btn: BaseBtn = null!;

    @comp(BaseBtn)
    use_btn: BaseBtn = null!;

    private winTitle: BaseLabel = null!;
    private infoTitle: BaseLabel = null!;
    /** 三个奖励列表只建一次 */
    private listsReady = false;
    /** 换一件物品时清掉自选数量 */
    private boundKey = '';
    /** item_id -> 已选数量 */
    private selectCount = new Map<number, number>();
    /** 这件自选礼包一共能选几次 */
    private selectLimit = 0;

    public get Is_FullScene() {
        return false;
    }

    public init(): void {
        super.init();
        const winTitleNode = this.btn_close.node.parent.getChildByName('title_text');
        this.winTitle = winTitleNode.getComponent(BaseLabel);
        const infoTitleNode = this.item_info.getChildByName('title').getChildByName('title_text');
        this.infoTitle = infoTitleNode.getComponent(BaseLabel);
    }

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.goto_btn.node, Node.EventType.TOUCH_END, this.onClickGoto);
        this.addNodeEvent(this.use_btn.node, Node.EventType.TOUCH_END, this.onClickUse);
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        const opened = this.openedItem();
        if (!opened) {
            return;
        }
        const { item, cfg, can_use } = opened;
        const count = item.count ?? 0;
        const key = item.guid != null ? `g${item.guid}` : `i${item.item_id}`;
        if (this.boundKey !== key) {
            this.boundKey = key;
            this.selectCount.clear();
        }
        this.winTitle.setText(cfg.name ?? '');
        this.item_icon.setItem(item, { can_not_click: true });
        this.bindDesc(cfg);
        this.bindUse(count, cfg, can_use);
        this.bindButtons(count, cfg, can_use);
        this.bindLists(count, cfg, can_use);
        this.item_info.active = !this.detailHasExtra();
        this.item_detail.getComponent(Layout).updateLayout();
        this.item_detail.parent.getComponent(Layout).updateLayout();
    }

    /** 数量条或奖励在显示时，道具信息不再占一块 */
    private detailHasExtra(): boolean {
        return this.use_content.active
            || this.reward_content.active
            || this.select_reward_content.active
            || this.random_reward_content.active;
    }

    /** 普通物品描述在正文。礼包三类把描述放到小标题上 */
    private bindDesc(cfg: IItemData): void {
        const descInTitle = cfg.type === ItemType.GIFT
            || cfg.type === ItemType.RAND_GIFT
            || cfg.type === ItemType.SELECT_GIFT;
        this.item_desc.node.active = !descInTitle;
        if (descInTitle) {
            this.infoTitle.setText(cfg.desc ?? '');
            return;
        }
        this.infoTitle.setText(lang['$Lang$道具信息']);
        this.item_desc.setText(cfg.desc ?? '');
    }

    /** 背包里打开，并且碎片够合成或可以批量使用时，显示数量滑条 */
    private bindUse(count: number, cfg: IItemData, can_use: boolean): void {
        const show = can_use && this.showBatch(count, cfg);
        this.use_content.active = show;
        if (!show) {
            return;
        }
        const max = this.batchCount(count, cfg);
        const min = max > 0 ? 1 : 0;
        this.slider_input.setSlider({
            min_value: min,
            max_value: max,
            init_value: max,
            btn_step: 1,
            value_step: { step: 1 },
        });
    }

    private bindButtons(count: number, cfg: IItemData, can_use: boolean): void {
        const showGoto = this.hasGoto(cfg);
        const showUse = can_use && this.showUse(count, cfg);
        this.goto_btn.node.active = showGoto;
        this.use_btn.node.active = showUse;
        this.btns.active = showGoto || showUse;
    }

    private bindLists(count: number, cfg: IItemData, can_use: boolean): void {
        const showFixed = cfg.type === ItemType.GIFT;
        const showRandom = cfg.type === ItemType.RAND_GIFT;
        const showSelect = cfg.type === ItemType.SELECT_GIFT;
        this.reward_content.active = showFixed;
        this.random_reward_content.active = showRandom;
        this.select_reward_content.active = showSelect;
        const reward = this.itemRewardList(cfg, showFixed || showRandom || showSelect);
        const fixed = showFixed && reward ? reward.fixed : [];
        const drops = (showRandom || showSelect) && reward ? reward.drops : [];
        const random = showRandom ? drops : [];
        const select = showSelect ? this.selectRewardList(drops, count, cfg, can_use) : [];
        if (!this.listsReady) {
            this.reward_scroll.setDataList(ItemInfoRewardCell, fixed, SCROLL_VERTICAL);
            this.random_reward_scroll.setDataList(ItemInfoRewardCell, random, SCROLL_VERTICAL);
            this.select_reward_scroll.setDataList(ItemInfoSelectRewardCell, select, SCROLL_VERTICAL);
            this.listsReady = true;
            return;
        }
        this.reward_scroll.updateList(fixed);
        this.random_reward_scroll.updateList(random);
        this.select_reward_scroll.updateList(select);
    }

    /** drop_reward 是掉落组，走随机接口。reward 是产出表 id，走固定接口。 */
    private itemRewardList(cfg: IItemData, show: boolean): RewardList | undefined {
        if (!show) {
            return undefined;
        }
        if (cfg.drop_reward != null) {
            return ConfigTools.instance.getDropRewardList(cfg.drop_reward);
        }
        if (cfg.reward != null) {
            return ConfigTools.instance.getRewardList(cfg.reward);
        }
        return undefined;
    }

    private selectRewardList(drops: RewardItem[], count: number, cfg: IItemData, can_use: boolean): ItemInfoSelectReward[] {
        this.selectLimit = this.selectLimitOf(count, cfg);
        return drops.map((reward) => ({
            item_id: reward.item_id,
            count: reward.count,
            can_use,
            getSelected: () => this.selectCount.get(reward.item_id) ?? 0,
            getMaxCount: () => this.remainSelect(reward.item_id),
            onCountChanged: (itemId, value) => this.onSelectCount(itemId, value),
        }));
    }

    private onSelectCount(itemId: number, count: number): void {
        if (count <= 0) {
            this.selectCount.delete(itemId);
        } else {
            this.selectCount.set(itemId, count);
        }
        const content = this.select_reward_scroll.content;
        for (const node of content.children) {
            if (!node.active) {
                continue;
            }
            const cell = node.getComponent(ItemInfoSelectRewardCell);
            if (!cell || cell.getItemId() === itemId) {
                continue;
            }
            cell.applyMax();
        }
    }

    /** 这一格还能加到多少：总次数减去其他格已选 */
    private remainSelect(itemId: number): number {
        let others = 0;
        for (const [id, selected] of this.selectCount) {
            if (id !== itemId) {
                others += selected;
            }
        }
        const remain = this.selectLimit - others;
        return remain > 0 ? remain : 0;
    }

    private totalSelected(): number {
        let total = 0;
        for (const selected of this.selectCount.values()) {
            total += selected;
        }
        return total;
    }

    private onClickGoto(): void {
        const opened = this.openedItem();
        if (!opened || !this.hasGoto(opened.cfg)) {
            return;
        }
        this.requestGoto(opened.cfg.go_to);
    }

    private onClickUse(): void {
        const opened = this.openedItem();
        if (!opened || !opened.can_use) {
            return;
        }
        const guid = opened.item.guid;
        if (guid == null) {
            return;
        }
        const { item, cfg } = opened;
        const count = item.count ?? 0;
        let useCount = count;
        let selected: Record<number, number> | undefined;
        if (cfg.type === ItemType.SELECT_GIFT) {
            const total = this.totalSelected();
            if (total <= 0) {
                UIMananger.instance.showFlyNotice(lang(224));
                return;
            }
            if (total > this.selectLimitOf(count, cfg)) {
                UIMananger.instance.showFlyNotice(lang(225));
                return;
            }
            selected = {};
            for (const [id, selectedCount] of this.selectCount) {
                if (selectedCount > 0) {
                    selected[id] = selectedCount;
                }
            }
        } else if (cfg.can_batch_use) {
            const picked = this.slider_input.getValue();
            useCount = cfg.self_count ? picked * cfg.self_count : picked;
        }
        this.requestUse(guid, useCount, selected);
    }

    /** TODO 前往跳转还没有 */
    private requestGoto(_target: string): void {
    }

    /** TODO 使用道具协议还没有 */
    private requestUse(_guid: number, _count: number, _selected?: Record<number, number>): void {
    }

    private showBatch(count: number, cfg: IItemData): boolean {
        if (cfg.self_count && cfg.self_count > 0) {
            return count / cfg.self_count >= 1;
        }
        return !!cfg.can_batch_use;
    }

    private showUse(count: number, cfg: IItemData): boolean {
        if (!cfg.is_can_use) {
            return false;
        }
        if (cfg.self_count && cfg.self_count > 0) {
            return count / cfg.self_count >= 1;
        }
        return true;
    }

    private batchCount(count: number, cfg: IItemData): number {
        if (cfg.self_count && cfg.self_count > 0) {
            return Math.floor(count / cfg.self_count);
        }
        return count;
    }

    private selectLimitOf(count: number, cfg: IItemData): number {
        const cost = cfg.self_count && cfg.self_count > 0 ? cfg.self_count : 1;
        return Math.floor(count / cost);
    }

    private hasGoto(cfg: IItemData): boolean {
        return cfg.go_to != null && cfg.go_to !== '';
    }

    /** 还没传入物品时先不刷。配置没有，或背包打开却找不到实例，直接报错 */
    private openedItem(): { item: ItemIconData; cfg: IItemData; can_use: boolean } | undefined {
        const param = this.getData<[ItemIconData, boolean]>();
        if (!param) {
            return undefined;
        }
        let item = param[0];
        const can_use = param[1];
        if (can_use) {
            if (item.guid == null) {
                throw new Error('使用物品需要背包实例');
            }
            const bagItem = BagMgr.getInstance().getItem(item.guid);
            if (!bagItem) {
                throw new Error(`背包里没有这个物品：${item.guid}`);
            }
            item = bagItem;
        }
        const cfg = ConfigMgr.instance.ItemData.get(item.item_id);
        if (!cfg) {
            throw new Error(`物品表没有这个 id：${item.item_id}`);
        }
        return { item, cfg, can_use };
    }
}

ItemIconComp.setOpenItemInfo((item) => {
    if (item.guid != null && ConfigMgr.instance.ItemData.get(item.item_id).equip_id != null) {
        UIMananger.instance.showWin(EquipInfoWin, { item_guid: item.guid });
        return;
    }
    UIMananger.instance.showWin(ItemInfoWin, item, false);
});
