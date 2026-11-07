import { _decorator, Layout, Node } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { TopItemBarComp } from '../../Component/TopItemBarComp';
import { comp } from '../../Common/Decorator';
import { GridScrollList, SCROLL_VERTICAL } from '../../Component/BaseComp/GridScrollList';
import { GameEvent } from '../../Common/GameEnum';
import { TimerMgr } from '../../Common/TimerMgr';
import { UIMananger } from '../../Component/UIMananger';
import { BagMgr } from '../Bag/BagMgr';
import { lang } from '../../Common/LangMgr';
import { BarracksLang, BarracksMgr, BarracksUnitView } from './BarracksMgr';
import { BarracksUnitCell } from './BarracksUnitCell';
import { BarracksRecruitWin } from './BarracksRecruitWin';
import { BarracksSpeedupWin } from './BarracksSpeedupWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
const { ccclass } = _decorator;

/**
 * 兵营主窗口。兵种列表一行一个 BarracksUnitCell。
 * 有任务在招时挂一段真实时间倒计时，回调里只改剩余时间。
 * 到点入库在 BarracksMgr，这里收到通知后重刷整行。
 */
@ccclass('BarracksWin')
export class BarracksWin extends BaseWin {

    @comp(BaseLabel)
    title: BaseLabel = null!;

    @comp(TopItemBarComp)
    top_item_bar: TopItemBarComp = null!;

    @comp(BaseLabel)
    list_hint: BaseLabel = null!;

    @comp(BaseLabel)
    text_recruiting: BaseLabel = null!;

    @comp(GridScrollList)
    list_view: GridScrollList = null!;
    
    @comp(BaseBtn)
    return_btn: BaseBtn = null!;

    private mgr = BarracksMgr.getInstance();
    private units: BarracksUnitView[] = [];
    private view_ready = false;
    /** 招募倒计时，挂 TimerMgr 的真实时间倒计时，对齐任务 finishAt */
    private tick_id = 0;
    /** 已显示的秒数，秒数没变不改界面 */
    private shown_second = -1;

    public get Is_FullScene(): boolean {
        return true;
    }

    public showWin(): void {
        if (!this.view_ready) {
            this.units = this.mgr.getUnits();
            const recruit_func = this.openRecruit.bind(this);
            const speedup_func = this.openSpeedup.bind(this);
            this.list_view.onItemRender = (node: Node, index: number) => {
                const cell = node.getComponent(BarracksUnitCell);
                cell.click_func = recruit_func;
                cell.speedup_func = speedup_func;
                cell.setData(this.units[index]);
            };
            const layout = this.list_view.content.getComponent(Layout);
            this.list_view.setDataList(BarracksUnitCell, this.units, SCROLL_VERTICAL,
                [layout.paddingTop, layout.paddingBottom, layout.spacingY]);
            this.view_ready = true;
        }
        super.showWin();
    }

    public initEvent(): void {
        super.initEvent();
        this.addEvent(GameEvent.Update_Barracks, this.onBarracksUpdated, this);
        this.addNodeEvent(this.return_btn.node, Node.EventType.TOUCH_END, this.onClickReturn);
    }

    public OnRefreshUI(): void {
        if (!this.view_ready) {
            return;
        }
        this.refreshAll();
    }

    private onClickReturn(): void {
        this.closeWin();
    }

    private onBarracksUpdated(): void {
        if (!this.view_ready) {
            return;
        }
        this.refreshAll();
    }

    protected onDisable(): void {
        this.stopTick();
        super.onDisable();
    }

    private refreshAll(): void {
        this.top_item_bar.OnCheckRefreshUI();
        this.refreshList();
        this.refreshHint();
        this.syncTick();
    }

    private refreshList(): void {
        this.units = this.mgr.getUnits();
        this.list_view.updateList(this.units);
    }

    private refreshHint(): void {
        const total = this.units.length;
        const unlocked = this.units.filter(view => view.unlocked).length;
        const recruiting = this.units.filter(view => !!view.taskQuantity).length;
        this.list_hint.setText(lang(BarracksLang.unlockedCount, { n: unlocked, total }));
        this.text_recruiting.setText(lang(BarracksLang.recruitingCount, { n: recruiting }));
    }

    private openRecruit(unit_id: number): void {
        if (this.mgr.hasTask(unit_id)) {
            return;
        }
        UIMananger.instance.showWin(BarracksRecruitWin, unit_id);
    }

    private openSpeedup(unit_id: number): void {
        UIMananger.instance.showWin(BarracksSpeedupWin, unit_id);
    }

    // ==================== 倒计时 ====================

    /** 还在招的任务里，最晚结束的真实剩余秒数 */
    private maxRealLeft(): number {
        let max_left = 0;
        for (const view of this.units) {
            if (!view.taskQuantity) {
                continue;
            }
            const left = this.mgr.leftRealSeconds(view.unitId);
            if (left > max_left) {
                max_left = left;
            }
        }
        return max_left;
    }

    /** 各招募中兵种的显示秒数之和。有一个变了就该刷界面 */
    private countdownMark(): number {
        let mark = 0;
        for (const view of this.units) {
            if (!view.taskQuantity) {
                continue;
            }
            mark += this.mgr.leftSeconds(view.unitId);
        }
        return mark;
    }

    /**
     * 按当前最晚结束的任务挂一段真实时间倒计时。
     * 打开、子窗口回来，以及上一段结束时调用。
     * 每秒刷新的回调里不要进这里。最晚结束时间变了才拆掉重挂。
     */
    private syncTick(): void {
        const max_left = this.maxRealLeft();
        if (max_left <= 0) {
            this.stopTick();
            return;
        }
        const timer_mgr = TimerMgr.getInstance();
        if (this.tick_id) {
            const remaining = timer_mgr.getRealCountdownRemaining(this.tick_id);
            if (Math.abs(remaining - max_left) < 0.05) {
                return;
            }
            this.stopTick();
        }
        this.shown_second = -1;
        this.tick_id = timer_mgr.addRealCountdown(max_left, this.onTickDone, this, this.onTickUpdate);
    }

    private stopTick(): void {
        if (!this.tick_id) {
            return;
        }
        TimerMgr.getInstance().removeRealCountdown(this.tick_id);
        this.tick_id = 0;
    }

    /** 秒数变了才改倒计时文字。不重刷列表，也不重挂计时器 */
    private onTickUpdate = (): void => {
        const mark = this.countdownMark();
        if (mark === this.shown_second) {
            return;
        }
        this.shown_second = mark;
        this.refreshCountdowns();
    };

    /** 这一段到点。TimerMgr 会自己删掉这条。先让管理器入库，再续上下一段显示 */
    private onTickDone(): void {
        this.tick_id = 0;
        this.shown_second = -1;
        this.mgr.syncRecruitFinish();
        this.syncTick();
    }

    private refreshCountdowns(): void {
        for (const node of this.list_view.content.children) {
            if (!node.active) {
                continue;
            }
            const cell = node.getComponent(BarracksUnitCell);
            const view = cell.getData();
            if (!view.taskQuantity) {
                continue;
            }
            cell.setCountdown(this.mgr.leftSeconds(view.unitId));
        }
    }
}
