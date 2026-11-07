import { _decorator, Node } from 'cc';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { comp, child } from '../../Common/Decorator';
import { refreshNodeList } from '../../Component/NodeList';
import { ItemIconData } from '../../Component/ItemIconComp';
import { CostItem } from '../../Component/CostItem';
import { SoldierIcon } from '../PVE/component/SoldierIcon';
import { lang } from '../../Common/LangMgr';
import { BarracksLang, BarracksMgr, BarracksUnitView, formatTime } from './BarracksMgr';
const { ccclass } = _decorator;

/**
 * 兵营列表里的一行兵种。三种状态：未解锁（锁定行）、招募中（倒计时+加速）、
 * 空闲（消耗+招募按钮）。点击回调由窗口注入。
 */
@ccclass('BarracksUnitCell')
export class BarracksUnitCell extends BaseRenderCell<BarracksUnitView> {

    @comp(BaseLabel)
    text_name: BaseLabel = null!;

    private text_command: BaseLabel = null!;
    private text_atk: BaseLabel = null!;
    private text_def: BaseLabel = null!;
    private text_hp: BaseLabel = null!;
    private text_speed: BaseLabel = null!;

    @comp(BaseLabel)
    text_countdown: BaseLabel = null!;

    @comp(BaseLabel)
    text_lock: BaseLabel = null!;

    @comp(BaseBtn)
    btn_recruit: BaseBtn = null!;

    @comp(BaseBtn)
    btn_speedup: BaseBtn = null!;

    @comp(SoldierIcon)
    unit_icon: SoldierIcon = null!;

    @child()
    cost_list: Node = null!;

    @child()
    node_locked: Node = null!;

    @child()
    node_normal: Node = null!;

    @child()
    node_recruiting: Node = null!;

    /** 空闲态铺消耗格的模板，嵌 CostItem */
    @child()
    cost_cell: Node = null!;

    click_func: (unit_id: number) => void = null!;
    speedup_func: (unit_id: number) => void = null!;

    public init(): void {
        super.init();
        this.text_command = this.node.getChildByPath('attr_command/value').getComponent(BaseLabel);
        this.text_atk = this.node.getChildByPath('attr_atk/value').getComponent(BaseLabel);
        this.text_def = this.node.getChildByPath('attr_def/value').getComponent(BaseLabel);
        this.text_hp = this.node.getChildByPath('attr_hp/value').getComponent(BaseLabel);
        this.text_speed = this.node.getChildByPath('attr_speed/value').getComponent(BaseLabel);
    }

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.btn_recruit.node, Node.EventType.TOUCH_END, this.onClickRecruit);
        this.addNodeEvent(this.btn_speedup.node, Node.EventType.TOUCH_END, this.onClickSpeedup);
    }

    public OnRefreshUI(): void {
        const view = this.getData();
        if (!view) {
            return;
        }
        this.text_name.setText(view.name);
        this.text_command.setText(view.command.toString());
        this.text_atk.setText(view.atk.toString());
        this.text_def.setText(view.def.toString());
        this.text_hp.setText(view.hp.toString());
        this.text_speed.setText(view.speed.toString());

        this.unit_icon.setData({ unitId: view.unitId, lv: view.level, num: view.owned, uId: 0 }, false);

        this.node_locked.active = !view.unlocked;
        this.node_normal.active = view.unlocked && !view.taskQuantity;
        this.node_recruiting.active = view.unlocked && !!view.taskQuantity;

        if (!view.unlocked) {
            const lock_text = view.unlockLevel > 0
                ? `${lang(BarracksLang.locked)} · ${lang(BarracksLang.needBarracksLevel, { level: view.unlockLevel })}`
                : lang(BarracksLang.locked);
            this.text_lock.setText(lock_text);
            return;
        }
        if (view.taskQuantity) {
            this.setCountdown(BarracksMgr.getInstance().leftSeconds(view.unitId));
            return;
        }
        this.refreshCost(view);
    }

    public setCountdown(left_seconds: number): void {
        this.text_countdown.setText(formatTime(left_seconds));
    }

    private refreshCost(view: BarracksUnitView): void {
        const items: ItemIconData[] = view.costs.map(cost => ({ item_id: cost.item_id, count: cost.count }));
        refreshNodeList(this.cost_list, this.cost_cell.name, items, (node, item) => {
            const cell = node.getComponent(CostItem);
            cell.setData(item);
        });
    }

    private onClickRecruit(): void {
        this.click_func(this.getData().unitId);
    }

    private onClickSpeedup(): void {
        this.speedup_func(this.getData().unitId);
    }
}
