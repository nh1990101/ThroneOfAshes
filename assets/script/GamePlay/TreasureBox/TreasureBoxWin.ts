import { _decorator, Layout, Node } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { ProgressBarComp } from '../../Component/ProgressBarComp';
import { child, comp } from '../../Common/Decorator';
import { refreshNodeList } from '../../Component/NodeList';
import { SelectCmp, SelectMode } from '../../Component/SelectCmp';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { UIMananger } from '../../Component/UIMananger';
import { lang } from '../../Common/LangMgr';
import { GameEvent } from '../../Common/GameEnum';
import { ITreasureData } from '../../Config/Typings/TreasureData';
import { RewardItem } from '../../Config/ConfigTools';
import { BagMgr } from '../Bag/BagMgr';
import { TreasureBoxMgr } from './TreasureBoxMgr';
import { TreasureBoxRewardWin } from './TreasureBoxRewardWin';
const { ccclass } = _decorator;

/**
 * 宝箱。顶部积分奖励，中间是选中的宝箱和开箱按钮，底部是宝箱页签。
 * 开箱后打开结算窗。
 */
@ccclass('TreasureBoxWin')
export class TreasureBoxWin extends BaseWin {
    @comp(BaseBtn)
    btn_close: BaseBtn = null!;

    @comp(BaseLabel, 'score_tips')
    private scoreTips: BaseLabel = null!;

    @comp(BaseLabel, 'score_text')
    private scoreText: BaseLabel = null!;

    @comp(ProgressBarComp, 'progress_bar_01_orange')
    private scoreBar: ProgressBarComp = null!;

    @comp(BaseBtn, 'pick_btn')
    private pickBtn: BaseBtn = null!;

    @comp(BaseSprite, 'treasure')
    private pickIcon: BaseSprite = null!;

    @child()
    private can_pick_effect: Node = null!;

    @child()
    private middle: Node = null!;

    @comp(BaseBtn, 'open_btn')
    private openBtn: BaseBtn = null!;

    @comp(BaseBtn, 'left_btn')
    private leftBtn: BaseBtn = null!;

    @comp(BaseBtn, 'right_btn')
    private rightBtn: BaseBtn = null!;

    @comp(Layout, 'treasure_box_tab_list')
    private tabList: Layout = null!;

    private boxSelect: SelectCmp<Node>;
    private boxList: ITreasureData[] = [];
    /** 宝箱 id -> 页签节点 */
    private tabNodes = new Map<number, Node>();
    private pickText: BaseLabel;
    private openText: BaseLabel;

    public get Is_FullScene() {
        return true;
    }

    public init(): void {
        super.init();
        this.pickText = this.pickBtn.node.getChildByPath('text_bg/text').getComponent(BaseLabel);
        this.openText = this.openBtn.node.getChildByPath('Label').getComponent(BaseLabel);
    }

    public initEvent(): void {
        this.buildTabs();
        super.initEvent();
        this.addNodeEvent(this.pickBtn.node, Node.EventType.TOUCH_END, this.onClickPick);
        this.addNodeEvent(this.openBtn.node, Node.EventType.TOUCH_END, this.onClickOpen);
        this.addNodeEvent(this.leftBtn.node, Node.EventType.TOUCH_END, this.onClickLeft);
        this.addNodeEvent(this.rightBtn.node, Node.EventType.TOUCH_END, this.onClickRight);
        this.addEvent(GameEvent.Update_Treasure_Box, this.refreshAll, this);
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        this.refreshAll();
    }

    /** 页签只建一次。重开窗口只刷数据 */
    private buildTabs(): void {
        this.boxList = Array.from(ConfigMgr.instance.TreasureData.values())
            .sort((a, b) => a.id - b.id);
        this.boxSelect = new SelectCmp<Node>(SelectMode.Single, (key, isSelect, node) => {
            if (node) {
                node.getChildByName('select_bg').active = isSelect;
            }
            if (isSelect && typeof key === 'number') {
                this.refreshMiddle(key);
            }
        });
        refreshNodeList(this.tabList.node, 'treasure_box', this.boxList, (node, box) => {
            const itemCfg = ConfigMgr.instance.ItemData.get(box.item_id);
            if (itemCfg?.icon != null) {
                node.getChildByName('icon').getComponent(BaseSprite).setIconData(itemCfg.icon);
            }
            this.addNodeEvent(node, Node.EventType.TOUCH_END, () => {
                this.boxSelect.setSelect(box.id, true);
            });
            this.tabNodes.set(box.id, node);
            this.boxSelect.addKey(box.id, node);
        });
    }

    private refreshAll(): void {
        this.refreshScore();
        this.refreshTabCounts();
        const selected = this.boxSelect?.getSelect();
        if (typeof selected === 'number') {
            this.refreshMiddle(selected);
        }
    }

    /** 顶部积分区：提示、进度条、领取按钮 */
    private refreshScore(): void {
        const mgr = TreasureBoxMgr.getInstance();
        const score = mgr.getScore();
        const cur = mgr.getCurrentScoreReward();
        const progressText = this.scoreBar.node.getChildByName('text').getComponent(BaseLabel);
        if (!cur) {
            this.scoreTips.setText(lang(30));
            this.scoreBar.setProgress(1);
            this.scoreText.setText(lang(31, { score }));
            progressText.setText(`${score}`);
            this.pickBtn.interactable = false;
            this.can_pick_effect.active = false;
            this.pickText.setText(lang(32));
            return;
        }
        const need = cur.need_score ?? 0;
        const itemCfg = cur.reward != null ? ConfigMgr.instance.ItemData.get(cur.reward) : undefined;
        const rewardName = itemCfg?.name != null ? lang(itemCfg.name) : '';
        const diff = Math.max(0, need - score);
        this.scoreTips.setText(lang(33, { score: diff, name: rewardName }));
        this.scoreBar.setProgress(need > 0 ? score / need : 0);
        this.scoreText.setText(lang(34, { score, need }));
        progressText.setText(lang(35, { score, need }));
        const canPick = mgr.canPickScoreReward();
        this.pickBtn.interactable = canPick;
        this.can_pick_effect.active = canPick;
        this.pickText.setText(canPick ? lang(36) : lang(37));
        if (itemCfg?.icon != null) {
            this.pickIcon.setIconData(itemCfg.icon);
        }
    }

    /** 页签上的持有数量。没有宝箱时图标置灰 */
    private refreshTabCounts(): void {
        const bag = BagMgr.getInstance();
        for (const box of this.boxList) {
            const node = this.tabNodes.get(box.id);
            if (!node) {
                continue;
            }
            const count = bag.getCount(box.item_id);
            node.getChildByName('count').getComponent(BaseLabel).setText(`${count}`);
            node.getChildByName('icon').getComponent(BaseSprite).grayscale = count <= 0;
        }
    }

    /** 中间选中宝箱：名称、说明、大图标、开箱按钮、左右切换 */
    private refreshMiddle(boxId: number): void {
        const box = ConfigMgr.instance.TreasureData.get(boxId);
        if (!box) {
            return;
        }
        const itemCfg = ConfigMgr.instance.ItemData.get(box.item_id);
        const nameLabel = this.middle.getChildByPath('name/text').getComponent(BaseLabel);
        if (itemCfg?.name != null) {
            nameLabel.setText(itemCfg.name);
        }
        const descLabel = this.middle.getChildByName('desc').getComponent(BaseLabel);
        descLabel.setText(box.box_explain != null ? box.box_explain : '');
        const icon = this.middle.getChildByPath('treasure_box/icon').getComponent(BaseSprite);
        if (itemCfg?.icon != null) {
            icon.setIconData(itemCfg.icon);
        }
        const count = box.item_id != null ? TreasureBoxMgr.getInstance().getOpenCount(box.item_id) : 0;
        const canOpen = count > 0;
        this.openBtn.interactable = canOpen;
        this.openText.setText(canOpen ? lang(38, { count }) : lang(39));
        const firstId = this.boxList[0]?.id;
        const lastId = this.boxList[this.boxList.length - 1]?.id;
        this.leftBtn.node.active = boxId > firstId;
        this.rightBtn.node.active = boxId < lastId;
    }

    private selectedBoxId(): number | null {
        const selected = this.boxSelect?.getSelect();
        return typeof selected === 'number' ? selected : null;
    }

    private onClickOpen(): void {
        const boxId = this.selectedBoxId();
        if (boxId == null) {
            return;
        }
        const opened = TreasureBoxMgr.getInstance().openBox(boxId);
        if (!opened) {
            return;
        }
        UIMananger.instance.showWin(TreasureBoxRewardWin, opened);
    }

    private onClickPick(): void {
        const reward = TreasureBoxMgr.getInstance().receiveScoreReward();
        if (!reward) {
            return;
        }
        UIMananger.instance.showFlyNotice(lang(40, { reward: this.rewardText([reward]) }));
    }

    private onClickLeft(): void {
        this.switchBox(-1);
    }

    private onClickRight(): void {
        this.switchBox(1);
    }

    private switchBox(step: number): void {
        const boxId = this.selectedBoxId();
        if (boxId == null) {
            return;
        }
        const index = this.boxList.findIndex(box => box.id === boxId);
        const next = this.boxList[index + step];
        if (next) {
            this.boxSelect.setSelect(next.id, true);
        }
    }

    private rewardText(rewards: RewardItem[]): string {
        return rewards.map(reward => {
            const cfg = ConfigMgr.instance.ItemData.get(reward.item_id);
            const name = cfg?.name != null ? lang(cfg.name) : `${reward.item_id}`;
            return lang(41, { name, count: reward.count });
        }).join(' ');
    }
}
