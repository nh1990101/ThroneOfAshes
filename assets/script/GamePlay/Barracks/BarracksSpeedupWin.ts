import { _decorator, Layout, Node } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { ProgressBarComp } from '../../Component/ProgressBarComp';
import { comp } from '../../Common/Decorator';
import { UIMananger } from '../../Component/UIMananger';
import { GameEvent } from '../../Common/GameEnum';
import { TimerMgr } from '../../Common/TimerMgr';
import { BagMgr } from '../Bag/BagMgr';
import { CostItem } from '../../Component/CostItem';
import { SoldierIcon } from '../PVE/component/SoldierIcon';
import { GridScrollList, SCROLL_VERTICAL } from '../../Component/BaseComp/GridScrollList';
import { BarracksSpeedupItemCell } from './BarracksSpeedupItemCell';
import { lang } from '../../Common/LangMgr';
import { BarracksLang, BarracksMgr, BarracksUnitView, RecruitSpeedupItemView, formatTime } from './BarracksMgr';
const { ccclass } = _decorator;

const DIAMOND_ITEM_ID = 1001;

/**
 * 招募加速弹窗。打开时传兵种 unit_id，展示该兵种这一批的倒计时，
 * 钻石立即完成。任务自然到点时结算入库并关弹窗。
 */
@ccclass('BarracksSpeedupWin')
export class BarracksSpeedupWin extends BaseWin {

    @comp(BaseLabel)
    text_name: BaseLabel = null!;

    @comp(BaseLabel)
    text_countdown: BaseLabel = null!;

    @comp(BaseLabel)
    text_error: BaseLabel = null!;

    @comp(BaseLabel)
    text_note: BaseLabel = null!;

    @comp(BaseBtn)
    btn_confirm: BaseBtn = null!;

    @comp(BaseBtn)
    btn_close: BaseBtn = null!;

    @comp(ProgressBarComp)
    meter: ProgressBarComp = null!;

    @comp(SoldierIcon)
    unit_icon: SoldierIcon = null!;

    @comp(CostItem)
    cost_diamond: CostItem = null!;

    @comp(GridScrollList)
    speedup_scroll: GridScrollList = null!;

    @comp(BaseLabel)
    text_empty: BaseLabel = null!;

    private mgr = BarracksMgr.getInstance();
    private view_ready = false;
    /** 这一批招募的倒计时，挂 TimerMgr 的真实时间倒计时，对齐任务 finishAt */
    private tick_id = 0;
    /** 已显示的秒数和钻石价，没变不改界面 */
    private shown_second = -1;
    private shown_price = -1;
    private text_atk: BaseLabel = null!;
    private text_def: BaseLabel = null!;
    private text_hp: BaseLabel = null!;
    private text_speed: BaseLabel = null!;
    private speedup_items: RecruitSpeedupItemView[] = [];
    private speedup_list_ready = false;

    public init(): void {
        super.init();
        const unit_row = this.node.getChildByPath('frame/safe_area/panel/content/unit_row');
        this.text_atk = unit_row.getChildByPath('attr_atk/value').getComponent(BaseLabel);
        this.text_def = unit_row.getChildByPath('attr_def/value').getComponent(BaseLabel);
        this.text_hp = unit_row.getChildByPath('attr_hp/value').getComponent(BaseLabel);
        this.text_speed = unit_row.getChildByPath('attr_speed/value').getComponent(BaseLabel);
    }

    public get Is_FullScene(): boolean {
        return false;
    }

    public get parentWinName(): string | null {
        return 'BarracksWin';
    }

    public showWin(unit_id: number): void {
        if (!this.speedup_list_ready) {
            this.speedup_items = this.mgr.getRecruitSpeedupItems();
            const use_func = this.onClickSpeedupItem.bind(this);
            this.speedup_scroll.onItemRender = (node: Node, index: number) => {
                const cell = node.getComponent(BarracksSpeedupItemCell);
                cell.use_func = use_func;
                cell.setData(this.speedup_items[index]);
            };
            const layout = this.speedup_scroll.content.getComponent(Layout);
            this.speedup_scroll.setDataList(BarracksSpeedupItemCell, this.speedup_items,
                SCROLL_VERTICAL, [layout.paddingTop, layout.paddingBottom, layout.spacingY]);
            this.speedup_list_ready = true;
        }
        super.showWin(unit_id);
    }

    public initEvent(): void {
        this.view_ready = true;
        super.initEvent();
        this.addNodeEvent(this.btn_confirm.node, Node.EventType.TOUCH_END, this.onClickConfirm);
        this.addEvent(GameEvent.Update_Barracks, this.onBarracksUpdated, this);
        this.addEvent(GameEvent.BAG_ITEMS_UPDATE, this.onBagUpdated, this);
    }

    public OnRefreshUI(): void {
        this.refreshAll();
    }

    private onBagUpdated(): void {
        if (!this.view_ready || !this.speedup_list_ready) {
            return;
        }
        this.refreshSpeedupItems();
        const view = this.mgr.getUnit(this.unit_id);
        if (view) {
            this.refreshMeter(view);
        }
    }

    private refreshSpeedupItems(): void {
        this.speedup_items = this.mgr.getRecruitSpeedupItems();
        this.speedup_scroll.updateList(this.speedup_items);
        this.text_empty.node.active = this.speedup_items.length === 0;
    }

    private onClickSpeedupItem(item_id: number): void {
        const tip = this.mgr.useRecruitSpeedupItem(this.unit_id, item_id);
        if (tip) {
            UIMananger.instance.showFlyNotice(tip);
        }
    }

    private onBarracksUpdated(): void {
        if (!this.view_ready) {
            return;
        }
        this.shown_second = -1;
        this.shown_price = -1;
        this.refreshAll();
    }

    protected onDisable(): void {
        this.stopTick();
        super.onDisable();
    }

    private get unit_id(): number {
        return this.getData<number>();
    }

    private refreshAll(): void {
        if (!this.view_ready) {
            // showWin 先于 start 执行，组件此时还没初始化，留给 OnRefreshUI 再刷一次
            return;
        }
        if (this.getData<number>() != null && !this.mgr.hasTask(this.unit_id)) {
            this.closeWin();
            return;
        }
        const view = this.mgr.getUnit(this.unit_id);
        if (!view) {
            return;
        }
        this.unit_icon.setData({ unitId: view.unitId, lv: view.level, num: view.owned, uId: 0 }, false);
        this.text_name.setText(view.name);
        this.text_note.setText(lang(BarracksLang.batchNote, { count: view.taskQuantity }));
        this.text_atk.setText(view.atk.toString());
        this.text_def.setText(view.def.toString());
        this.text_hp.setText(view.hp.toString());
        this.text_speed.setText(view.speed.toString());
        if (this.speedup_list_ready) {
            this.refreshSpeedupItems();
        }
        this.refreshMeter(view);
        this.syncTick(view);
    }

    private refreshMeter(view: BarracksUnitView): void {
        const sec = this.mgr.leftSeconds(view.unitId);
        if (sec !== this.shown_second) {
            this.shown_second = sec;
            this.text_countdown.setText(formatTime(sec));
        }
        const duration = this.mgr.taskDuration(view.unitId);
        const passed = duration - this.mgr.leftRealSeconds(view.unitId);
        this.meter.setProgress(duration > 0 ? passed / duration : 0);
        const price = this.mgr.finishPrice(view.unitId);
        if (price !== this.shown_price) {
            this.shown_price = price;
            this.cost_diamond.setData({ item_id: DIAMOND_ITEM_ID, count: price });
        }
        const lack = price > 0 && !BagMgr.getInstance().isEnough(DIAMOND_ITEM_ID, price);
        this.text_error.node.active = lack;
        if (lack) {
            this.text_error.setText(lang(BarracksLang.lackDiamond));
        }
    }

    private onClickConfirm(): void {
        const tip = this.mgr.finishNow(this.unit_id);
        if (tip) {
            if (tip === lang(BarracksLang.lackDiamond)) {
                this.text_error.node.active = true;
                this.text_error.setText(tip);
            }
            UIMananger.instance.showFlyNotice(tip);
            return;
        }
        this.closeWin();
    }

    // ==================== 倒计时 ====================

    private syncTick(view: BarracksUnitView): void {
        const left = view.taskQuantity ? this.mgr.leftRealSeconds(view.unitId) : 0;
        if (left <= 0) {
            this.stopTick();
            return;
        }
        const timer_mgr = TimerMgr.getInstance();
        if (this.tick_id) {
            const remaining = timer_mgr.getRealCountdownRemaining(this.tick_id);
            if (remaining >= 0 && Math.abs(remaining - left) < 0.05) {
                return;
            }
            this.stopTick();
        }
        this.tick_id = timer_mgr.addRealCountdown(left, this.onTaskDone, this, this.onTickUpdate);
    }

    private stopTick(): void {
        if (!this.tick_id) {
            return;
        }
        TimerMgr.getInstance().removeRealCountdown(this.tick_id);
        this.tick_id = 0;
    }

    private onTickUpdate = (): void => {
        const view = this.mgr.getUnit(this.unit_id);
        if (view) {
            this.refreshMeter(view);
        }
    };

    /** 显示用倒计时到点。TimerMgr 会自己删掉这条。入库后通知里再关窗 */
    private onTaskDone(): void {
        this.tick_id = 0;
        this.mgr.syncRecruitFinish();
    }
}
