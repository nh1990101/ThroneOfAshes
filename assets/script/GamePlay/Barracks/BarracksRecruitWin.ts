import { _decorator, Node } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { comp, child } from '../../Common/Decorator';
import { refreshNodeList } from '../../Component/NodeList';
import { UIMananger } from '../../Component/UIMananger';
import { SliderInputComp } from '../../Component/SliderInputComp';
import { CostItem } from '../../Component/CostItem';
import { SoldierIcon } from '../PVE/component/SoldierIcon';
import { lang } from '../../Common/LangMgr';
import { BarracksLang, BarracksMgr, BarracksUnitView, formatTime } from './BarracksMgr';
const { ccclass } = _decorator;

/**
 * 招募弹窗。打开时传兵种 unit_id。
 * 数量变化实时刷新消耗和总耗时，资源不够显示错误并拦点开始。
 */
@ccclass('BarracksRecruitWin')
export class BarracksRecruitWin extends BaseWin {

    @comp(BaseLabel)
    text_name: BaseLabel = null!;

    @comp(BaseLabel)
    text_time_total: BaseLabel = null!;

    @comp(BaseLabel)
    text_error: BaseLabel = null!;

    @comp(BaseBtn)
    btn_confirm: BaseBtn = null!;

    @comp(BaseBtn)
    btn_close: BaseBtn = null!;

    @comp(SliderInputComp)
    quantity_slider: SliderInputComp = null!;

    @comp(SoldierIcon)
    unit_icon: SoldierIcon = null!;

    @child()
    cost_list: Node = null!;

    @child()
    cost_cell: Node = null!;

    private mgr = BarracksMgr.getInstance();
    private quantity = 1;
    private view: BarracksUnitView = null!;
    private cost_cells: CostItem[] = [];
    private view_ready = false;
    private text_atk: BaseLabel = null!;
    private text_def: BaseLabel = null!;
    private text_hp: BaseLabel = null!;
    private text_speed: BaseLabel = null!;

    public init(): void {
        super.init();
        const unit_row = this.node.getChildByPath('safe_area/panel/content/unit_row');
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
        this.quantity = 1;
        const view = this.mgr.getUnit(unit_id);
        if (view) {
            this.cost_cells = [];
            refreshNodeList(this.cost_list, this.cost_cell.name, view.costs, (node, cost) => {
                const cell = node.getComponent(CostItem);
                cell.setData(cost);
                this.cost_cells.push(cell);
            });
        }
        super.showWin(unit_id);
    }

    public initEvent(): void {
        this.view_ready = true;
        super.initEvent();
        this.addNodeEvent(this.btn_confirm.node, Node.EventType.TOUCH_END, this.onClickConfirm);
    }

    public OnRefreshUI(): void {
        this.refreshAll();
    }

    private get unit_id(): number {
        return this.getData<number>();
    }

    private refreshAll(): void {
        if (!this.view_ready || this.getData<number>() == null) {
            return;
        }
        const view = this.mgr.getUnit(this.unit_id);
        if (!view) {
            return;
        }
        this.view = view;
        this.unit_icon.setData({ unitId: view.unitId, lv: view.level, num: view.owned, uId: 0 }, false);
        this.text_name.setText(view.name);
        this.text_atk.setText(view.atk.toString());
        this.text_def.setText(view.def.toString());
        this.text_hp.setText(view.hp.toString());
        this.text_speed.setText(view.speed.toString());

        const max = Math.max(1, this.mgr.getMaxAffordable(view.unitId));
        this.quantity = Math.min(this.quantity, max);
        this.quantity_slider.setSlider({
            min_value: 1,
            max_value: max,
            btn_step: 1,
            value_step: { step: 1, can_min: true, can_max: true },
            init_value: this.quantity,
            on_value_changed: (cur) => this.onQuantityChanged(cur),
        });
        this.refreshPreview();
    }

    private onQuantityChanged(quantity: number): void {
        this.quantity = quantity;
        this.refreshPreview();
    }

    /** 按当前数量刷新消耗、总耗时和错误提示 */
    private refreshPreview(): void {
        const view = this.view;
        if (!view) {
            return;
        }
        for (let index = 0; index < view.costs.length; index++) {
            const cost = view.costs[index];
            this.cost_cells[index].setData({ item_id: cost.item_id, count: cost.count * this.quantity });
        }
        this.text_time_total.setText(formatTime(view.timePerUnit * this.quantity));
        const lack = !this.mgr.canAfford(view.unitId, this.quantity);
        this.text_error.node.active = lack;
    }

    private onClickConfirm(): void {
        if (!this.mgr.canAfford(this.unit_id, this.quantity)) {
            this.text_error.node.active = true;
            UIMananger.instance.showFlyNotice(lang(BarracksLang.lackResource));
            return;
        }
        const tip = this.mgr.beginRecruit(this.unit_id, this.quantity);
        if (tip) {
            UIMananger.instance.showFlyNotice(tip);
            return;
        }
        this.closeWin();
    }
}
