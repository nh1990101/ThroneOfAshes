import { _decorator, Layout, macro, Node, Vec2 } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { ScrollList } from '../../Component/BaseComp/ScrollList';
import { comp } from '../../Common/Decorator';
import { AssetMgr } from '../../Common/AssetMgr';
import { lang } from '../../Common/LangMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { RewardItem } from '../../Config/ConfigTools';
import { ItemIconComp } from '../../Component/ItemIconComp';
import { TreasureBoxMgr, TreasureBoxOpenResult } from './TreasureBoxMgr';
const { ccclass } = _decorator;

/** 参数表没有 show_reward_interval_time 时，出现间隔和换行滚动时间 */
const SHOW_INTERVAL = 0.1;
const MOVE_DURATION = 0.2;
/** 一行几个。content 上的网格 Layout 固定列数优先 */
const COLUMN_COUNT = 5;
/** 不满三行时不跟着滚。一行、两行把内容往下留一点 */
const FOLLOW_ROW = 2;
const PADDING_ONE_ROW = 140;
const PADDING_TWO_ROWS = 40;

/**
 * 开箱结算。奖励按间隔一个个出现，播放中点跳过可以一次出完。
 * 播完才显示再开一次。
 */
@ccclass('TreasureBoxRewardWin')
export class TreasureBoxRewardWin extends BaseWin {
    @comp(BaseBtn)
    btn_close: BaseBtn = null!;

    @comp(BaseSprite, 'treasure_box')
    private boxIcon: BaseSprite = null!;

    /** 只用它的滚动和物品预制。不走虚拟列表 */
    @comp(ScrollList, 'reward_item_list_win')
    private rewardList: ScrollList = null!;

    @comp(BaseLabel, 'gain_score')
    private gainScore: BaseLabel = null!;

    @comp(BaseBtn, 'open_btn')
    private openBtn: BaseBtn = null!;

    /** 播放中盖住界面，点一下把剩下的奖励一次出完 */
    @comp(BaseBtn, 'btn_stop_ani')
    private stopBtn: BaseBtn = null!;

    public get Is_FullScene() {
        return true;
    }

    private openText: BaseLabel;
    private rewards: RewardItem[] = [];
    private shownCount = 0;
    private playing = false;
    private showInterval = SHOW_INTERVAL;
    private moveDuration = MOVE_DURATION;

    /** 关掉结算时，宝箱主界面还在就把它显示回来 */
    public get parentWinName(): string | null {
        return 'TreasureBoxWin';
    }

    public init(): void {
        super.init();
        this.openText = this.openBtn.node.getChildByName('Label').getComponent(BaseLabel);
        this.stopBtn.node.active = false;
        this.scheduleOnce(this.unbindVirtualScroll, 0);
    }

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.openBtn.node, Node.EventType.TOUCH_END, this.onClickOpen);
        this.addNodeEvent(this.stopBtn.node, Node.EventType.TOUCH_END, this.onClickSkip);
    }

    public showWin(result: TreasureBoxOpenResult): void {
        super.showWin(result);
    }

    protected onDisable(): void {
        this.stopRewardAnim();
        super.onDisable();
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        const result = this.getData<TreasureBoxOpenResult>();
        if (!result) {
            return;
        }
        this.refreshBox(result.boxId);
        this.refreshScore(result);
        this.playRewards(result.rewards);
    }

    private refreshBox(boxId: number): void {
        const box = ConfigMgr.instance.TreasureData.get(boxId);
        const itemCfg = box?.item_id != null ? ConfigMgr.instance.ItemData.get(box.item_id) : undefined;
        if (itemCfg?.icon != null) {
            this.boxIcon.setIconData(itemCfg.icon);
        }
    }

    private refreshScore(result: TreasureBoxOpenResult): void {
        const box = ConfigMgr.instance.TreasureData.get(result.boxId);
        const score = (box?.score ?? 0) * result.openCount;
        this.gainScore.node.active = score > 0;
        if (score <= 0) {
            return;
        }
        this.gainScore.setText(lang(42, { score }));
    }

    private refreshOpenBtn(boxId: number): void {
        const box = ConfigMgr.instance.TreasureData.get(boxId);
        const count = box?.item_id != null ? TreasureBoxMgr.getInstance().getOpenCount(box.item_id) : 0;
        this.openBtn.node.active = count > 0;
        if (count <= 0) {
            return;
        }
        this.openText.setText(lang(38, { count }));
    }

    /** ScrollList 会在滚动时按虚拟列表重绑，这里只滚动，不回收格子 */
    private unbindVirtualScroll(): void {
        this.rewardList.node.off('scrolling');
    }

    private playRewards(rewards: RewardItem[]): void {
        this.stopRewardAnim();
        this.clearRewardIcons();
        this.rewards = rewards;
        this.shownCount = 0;
        this.readIntervals();
        this.applyPadding(rewards.length);
        this.rewardList.horizontal = false;
        this.rewardList.vertical = true;
        this.rewardList.stopAutoScroll();
        this.rewardList.scrollToOffset(Vec2.ZERO, 0);
        this.openBtn.node.active = false;
        this.stopBtn.node.active = rewards.length > 0;
        if (rewards.length === 0) {
            this.finishRewardAnim();
            return;
        }
        this.playing = true;
        this.showNextReward();
        if (!this.playing) {
            return;
        }
        // 不要在回调里再次 scheduleOnce 同一个函数。这一轮定时结束时会把刚预约的下一次一起清掉
        this.schedule(this.showNextReward, this.showInterval, macro.REPEAT_FOREVER, this.showInterval);
    }

    private showNextReward(): void {
        if (!this.playing) {
            return;
        }
        this.spawnReward(this.rewards[this.shownCount]);
        this.shownCount += 1;
        this.rewardLayout().updateLayout();
        if (this.shouldFollow(this.shownCount)) {
            this.rewardList.scrollToBottom(this.moveDuration);
        }
        if (this.shownCount >= this.rewards.length) {
            this.finishRewardAnim();
        }
    }

    private onClickSkip(): void {
        if (!this.playing) {
            return;
        }
        this.unschedule(this.showNextReward);
        this.rewardList.stopAutoScroll();
        while (this.shownCount < this.rewards.length) {
            this.spawnReward(this.rewards[this.shownCount]);
            this.shownCount += 1;
        }
        this.rewardLayout().updateLayout();
        if (this.rewards.length > this.columnCount() * FOLLOW_ROW) {
            this.rewardList.scrollToBottom(0);
        }
        this.finishRewardAnim();
    }

    private finishRewardAnim(): void {
        this.playing = false;
        this.stopBtn.node.active = false;
        this.unschedule(this.showNextReward);
        const result = this.getData<TreasureBoxOpenResult>();
        if (!result) {
            return;
        }
        this.refreshOpenBtn(result.boxId);
    }

    private stopRewardAnim(): void {
        this.playing = false;
        this.stopBtn.node.active = false;
        this.unschedule(this.showNextReward);
        this.rewardList.stopAutoScroll();
    }

    private spawnReward(reward: RewardItem): void {
        const node = AssetMgr.createPrefabFromPoolByPrefab(this.rewardList.itemPrefab, ItemIconComp);
        node.parent = this.rewardList.content;
        node.active = true;
        const cell = node.getComponent(ItemIconComp);
        cell.setItem({ item_id: reward.item_id, count: reward.count });
    }

    private clearRewardIcons(): void {
        const content = this.rewardList.content;
        const children = content.children.slice();
        for (const child of children) {
            child.removeFromParent();
            AssetMgr.removeNode(child);
        }
    }

    private shouldFollow(shownCount: number): boolean {
        const columns = this.columnCount();
        return shownCount % columns === 1 && shownCount > columns * FOLLOW_ROW;
    }

    private applyPadding(total: number): void {
        const layout = this.rewardLayout();
        const rows = Math.ceil(total / this.columnCount());
        if (rows <= 1) {
            layout.paddingTop = PADDING_ONE_ROW;
            return;
        }
        if (rows <= 2) {
            layout.paddingTop = PADDING_TWO_ROWS;
            return;
        }
        layout.paddingTop = 0;
    }

    private columnCount(): number {
        const layout = this.rewardLayout();
        if (layout.type === Layout.Type.GRID
            && layout.constraint === Layout.Constraint.FIXED_COL
            && layout.constraintNum > 0) {
            return layout.constraintNum;
        }
        return COLUMN_COUNT;
    }

    private rewardLayout(): Layout {
        return this.rewardList.content.getComponent(Layout);
    }

    private readIntervals(): void {
        const row = ConfigMgr.instance.ParamData.get('show_reward_interval_time');
        const show = row?.parm_f?.[0];
        const move = row?.parm_f?.[1];
        this.showInterval = show != null && show > 0 ? show : SHOW_INTERVAL;
        this.moveDuration = move != null && move > 0 ? move : MOVE_DURATION;
    }

    private onClickOpen(): void {
        const current = this.getData<TreasureBoxOpenResult>();
        if (!current || this.playing) {
            return;
        }
        const opened = TreasureBoxMgr.getInstance().openBox(current.boxId);
        if (!opened) {
            this.refreshOpenBtn(current.boxId);
            return;
        }
        this.showWin(opened);
    }
}
