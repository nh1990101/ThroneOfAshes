import { _decorator, Color, Node } from 'cc';
import { child, comp } from '../../Common/Decorator';
import { GameColor } from '../../Common/GameColor';
import { lang } from '../../Common/LangMgr';
import { refreshNodeList } from '../../Component/NodeList';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { BaseWin } from '../../Component/BaseWin';
import { UIMananger } from '../../Component/UIMananger';
import { HallCostCell } from './HallCostCell';
import { HallGarrisonWin } from './HallGarrisonWin';
import { HALL_STATE_UPDATE, HallActionResult, HallLang, HallMgr, HallTab } from './HallMgr';
import { HallSlotCell, HallSlotCellData } from './HallSlotCell';
import { GameEvent } from '../../Common/GameEnum';
import { TechTreeMgr } from '../TechTree/TechTreeMgr';
const { ccclass } = _decorator;

const SLOT_COUNT = 3;

/** 单个建筑的驻守或升级详情。 */
@ccclass('HallBuildingWin')
export class HallBuildingWin extends BaseWin {
    @comp(BaseBtn, 'btn_remove')
    private btn_remove: BaseBtn = null!;

    @comp(BaseBtn, 'btn_assign')
    private btn_assign: BaseBtn = null!;

    @comp(BaseBtn, 'btn_upgrade')
    private btn_upgrade: BaseBtn = null!;

    @comp(BaseLabel, 'd_name')
    private d_name: BaseLabel = null!;

    @comp(BaseLabel, 'd_status')
    private d_status: BaseLabel = null!;

    @comp(BaseLabel, 'd_selected')
    private d_selected: BaseLabel = null!;

    @comp(BaseLabel, 'd_effect')
    private d_effect: BaseLabel = null!;

    @comp(BaseLabel, 'd_value')
    private d_value: BaseLabel = null!;

    @comp(BaseSprite, 'building_icon')
    private building_icon: BaseSprite = null!;

    @comp(BaseLabel, 'u_name')
    private u_name: BaseLabel = null!;

    @comp(BaseLabel, 'lv_cur_value')
    private lv_cur_value: BaseLabel = null!;

    @comp(BaseLabel, 'lv_next_value')
    private lv_next_value: BaseLabel = null!;

    @comp(BaseLabel, 'u_effect')
    private u_effect: BaseLabel = null!;

    @comp(BaseLabel, 'u_effect_value')
    private u_effect_value: BaseLabel = null!;

    @comp(BaseLabel, 'u_slots_value')
    private u_slots_value: BaseLabel = null!;

    @comp(BaseLabel, 'u_req')
    private u_req: BaseLabel = null!;

    @comp(BaseLabel, 'u_note')
    private u_note: BaseLabel = null!;

    @child()
    private detail_garrison: Node = null!;

    @child()
    private detail_upgrade: Node = null!;

    @child()
    private detail_slots: Node = null!;

    @child()
    private cost_list: Node = null!;

    @child({ name: 'title' })
    private win_title: Node = null!;

    private hall_mgr = HallMgr.getInstance();
    private building_id = 0;
    private tab: HallTab = 'garrison';
    private selected_slot = 0;
    private action_busy = false;
    private view_ready = false;
    private d_effect_color: Color;
    private u_note_color: Color;
    private opening = false;
    private slot_cells: HallSlotCell[] = [];
    private cost_cells: HallCostCell[] = [];

    public get parentWinName(): string | null {
        return 'HallWin';
    }

    public init(): void {
        super.init();
        this.d_effect_color = this.d_effect.color.clone();
        this.u_note_color = this.u_note.color.clone();
    }

    public showWin(building_id: number, tab: HallTab): void {
        this.opening = true;
        this.building_id = building_id;
        this.tab = tab;
        this.selected_slot = 0;
        UIMananger.instance.closeWin(HallGarrisonWin);
        super.showWin();
        this.detail_garrison.active = tab === 'garrison';
        this.detail_upgrade.active = tab === 'upgrade';
        this.ensureListCells();
        this.opening = false;
        this.OnCheckRefreshUI();
    }

    public initEvent(): void {
        this.addEvent(GameEvent.BAG_ITEMS_UPDATE, this.onBagItemsUpdate, this);
        this.addEvent(GameEvent.Update_Tech_Tree, this.OnRefreshUI, this);
        this.addEvent(HALL_STATE_UPDATE, this.onHallStateUpdate, this);
        super.initEvent();
        this.bindButtons();
        this.view_ready = true;
        this.OnRefreshUI();
    }

    public OnRefreshUI(): void {
        if (!this.view_ready || this.opening) {
            return;
        }
        this.refresh();
    }

    private onBagItemsUpdate(): void {
        if (!this.action_busy) {
            this.OnRefreshUI();
        }
    }

    private onHallStateUpdate(): void {
        this.ensureListCells();
        this.OnRefreshUI();
    }

    private bindButtons(): void {
        this.addNodeEvent(this.btn_remove.node, Node.EventType.TOUCH_END, () => {
            void this.onRemove();
        });
        this.addNodeEvent(this.btn_assign.node, Node.EventType.TOUCH_END, () => this.openGarrison());
        this.addNodeEvent(this.btn_upgrade.node, Node.EventType.TOUCH_END, () => {
            void this.onUpgrade();
        });
    }

    private refresh(): void {
        const building = this.hall_mgr.getBuilding(this.building_id);
        if (!building) {
            return;
        }
        const title = `${this.hall_mgr.getBuildingName(this.building_id)} ${lang(HallLang.level, { lv: building.level })}`;
        this.win_title.getChildByName('text').getComponent(BaseLabel).setText(title);
        this.detail_garrison.active = this.tab === 'garrison';
        this.detail_upgrade.active = this.tab === 'upgrade';
        if (this.tab === 'garrison') {
            this.refreshGarrisonDetail();
        } else {
            this.refreshUpgradeDetail();
        }
    }

    private refreshGarrisonDetail(): void {
        const build_id = this.building_id;
        const building = this.hall_mgr.getBuilding(build_id);
        if (!building) {
            return;
        }
        const effect = this.hall_mgr.getEffectInfo(build_id);
        const effect_sign = effect.code === 'recruit_cost' ? '-' : '+';
        const slot_count = building.slots.length;
        const occupied = building.slots.filter(hero_uuid => hero_uuid != null).length;
        const selected_hero_uuid = building.slots[this.selected_slot] ?? null;

        this.d_name.setText(`${this.hall_mgr.getBuildingName(build_id)} ${lang(HallLang.level, { lv: building.level })}`);
        this.d_status.setText(HallLang.occupiedSeats, { n: occupied, total: slot_count });

        if (this.selected_slot >= slot_count) {
            this.d_selected.setText(HallLang.seatSelectedLocked, { slot: this.selected_slot + 1 });
        } else if (selected_hero_uuid != null) {
            this.d_selected.setText(HallLang.seatSelectedHero, {
                slot: this.selected_slot + 1,
                hero: this.hall_mgr.getHeroName(selected_hero_uuid),
                value: `${effect_sign}${this.hall_mgr.formatPercent(this.hall_mgr.getHeroBonus(selected_hero_uuid, build_id))}`,
            });
        } else {
            this.d_selected.setText(HallLang.seatSelectedEmpty, { slot: this.selected_slot + 1 });
        }
        this.d_effect.setText(`${effect.name} ${effect.text}`);
        this.d_effect.color = effect.bonus > 0 ? new Color().fromHEX(GameColor.GAME_GREEN) : this.d_effect_color;
        const output_count = TechTreeMgr.getInstance().applyTechOutputCount(effect.product_item, effect.base_product);
        this.d_value.setText(`${lang(HallLang.baseOutput)} ${output_count}${effect.product_name ? ` ${effect.product_name}` : ''}`);

        const locked = this.selected_slot >= slot_count;
        this.btn_remove.interactable = !locked && selected_hero_uuid != null;
        this.setButtonText(this.btn_remove, HallLang.remove);
        this.btn_assign.interactable = !locked;
        this.setButtonText(this.btn_assign, locked ? HallLang.seatLockedBtn : selected_hero_uuid != null ? HallLang.changeGarrison : HallLang.assign);
        this.refreshSlotList();
    }

    private refreshUpgradeDetail(): void {
        const build_id = this.building_id;
        const building = this.hall_mgr.getBuilding(build_id);
        if (!building) {
            return;
        }
        const info = this.hall_mgr.getUpgradeInfo(build_id);
        const icon_id = this.hall_mgr.getBuildingIcon(build_id);
        this.building_icon.node.active = icon_id != null;
        if (icon_id != null) {
            this.building_icon.setIconData(icon_id);
        }
        this.u_name.setText(`${this.hall_mgr.getBuildingName(build_id)} ${lang(HallLang.level, { lv: building.level })}`);
        this.lv_cur_value.setText(HallLang.level, { lv: info.current_level });
        this.lv_next_value.setText(info.max_level ? HallLang.max_level : HallLang.level, info.max_level ? undefined : { lv: info.next_level });
        this.u_effect.setText(info.product_name || lang(HallLang.baseOutput));
        const tech = TechTreeMgr.getInstance();
        const output_before = tech.applyTechOutputCount(info.product_item, info.base_before);
        const output_after = tech.applyTechOutputCount(info.product_item, info.base_after);
        this.u_effect_value.setText(`${output_before} → ${output_after}`);
        this.u_slots_value.setText(`${info.slot_before} → ${info.slot_after}`);
        this.refreshCostList();
        if (info.max_level) {
            this.u_req.setText('');
            this.u_note.setText(HallLang.max_level, undefined);
            this.u_note.color = this.u_note_color;
            this.btn_upgrade.interactable = false;
            this.setButtonText(this.btn_upgrade, HallLang.max_level);
            return;
        }
        const pre_list = info.prereqs
            .map(item => lang(HallLang.prereqItem, { name: item.name, lv: item.need_level, current: item.current_level }))
            .join('，');
        this.u_req.setText(info.prereqs.length === 0 ? HallLang.noPrereq : HallLang.prereq, info.prereqs.length === 0 ? undefined : { list: pre_list });
        if (info.reason) {
            this.u_note.setText(info.reason);
            this.u_note.color = new Color().fromHEX(GameColor.GAME_RED);
        } else {
            this.u_note.setText(info.time_seconds > 0 ? HallLang.upgradeTime : HallLang.upgradeNote, info.time_seconds > 0 ? { time: this.formatDuration(info.time_seconds) } : undefined);
            this.u_note.color = this.u_note_color;
        }
        this.btn_upgrade.interactable = info.can_upgrade;
        this.setButtonText(this.btn_upgrade, info.reason ? info.reason : HallLang.upgradeButton);
    }

    private refreshSlotList(): void {
        const building = this.hall_mgr.getBuilding(this.building_id);
        if (!building) {
            return;
        }
        for (let i = 0; i < this.slot_cells.length; i++) {
            const cell = this.slot_cells[i];
            cell.setData({
                index: i,
                hero_uuid: building.slots[i] ?? null,
                locked: i >= building.slots.length,
            });
            cell.setSelected(i === this.selected_slot);
        }
    }

    private refreshCostList(): void {
        const info = this.hall_mgr.getUpgradeInfo(this.building_id);
        for (let index = 0; index < this.cost_cells.length; index++) {
            const cell = this.cost_cells[index];
            cell.node.active = index < info.costs.length;
            if (cell.node.active) {
                cell.setData(info.costs[index]);
            }
        }
    }

    private ensureListCells(): void {
        const building = this.hall_mgr.getBuilding(this.building_id);
        if (!building) {
            return;
        }
        if (this.tab === 'garrison') {
            if (this.slot_cells.length > 0) {
                return;
            }
            const cells: HallSlotCellData[] = Array.from({ length: SLOT_COUNT }, (_, index) => ({
                index,
                hero_uuid: building.slots[index] ?? null,
                locked: index >= building.slots.length,
            }));
            refreshNodeList(this.detail_slots, 'slot_template', cells, (node, data) => {
                const cell = node.getComponent(HallSlotCell) || node.addComponent(HallSlotCell);
                cell.setData(data);
                cell.click_func = () => this.selectSlot(cell.getData().index);
                this.slot_cells.push(cell);
            });
            return;
        }
        const info = this.hall_mgr.getUpgradeInfo(this.building_id);
        if (info.costs.length <= this.cost_cells.length) {
            return;
        }
        this.cost_cells = [];
        refreshNodeList(this.cost_list, 'cost_template', info.costs, (node, data) => {
            const cell = node.getComponent(HallCostCell) || node.addComponent(HallCostCell);
            cell.setData(data);
            this.cost_cells.push(cell);
        });
    }

    private setButtonText(btn: BaseBtn, content: string | number, args?: Record<string, string | number>): void {
        const label_node = btn.node.getChildByName('label') || btn.node.getChildByName('Label');
        label_node.getComponent(BaseLabel).setText(content, args);
    }

    private selectSlot(slot: number): void {
        const building = this.hall_mgr.getBuilding(this.building_id);
        if (!building || slot >= building.slots.length) {
            return;
        }
        this.selected_slot = slot;
        this.refreshGarrisonDetail();
    }

    private openGarrison(): void {
        const building = this.hall_mgr.getBuilding(this.building_id);
        if (!building || this.selected_slot >= building.slots.length) {
            return;
        }
        UIMananger.instance.showWin(HallGarrisonWin, this.building_id, this.selected_slot);
    }

    private async onRemove(): Promise<void> {
        const building = this.hall_mgr.getBuilding(this.building_id);
        if (!building || this.selected_slot >= building.slots.length) {
            return;
        }
        if (building.slots[this.selected_slot] == null) {
            return;
        }
        await this.runAction(() => this.hall_mgr.setGarrison(this.building_id, this.selected_slot, null));
    }

    private async onUpgrade(): Promise<void> {
        if (!this.hall_mgr.getUpgradeInfo(this.building_id).can_upgrade) {
            return;
        }
        await this.runAction(() => this.hall_mgr.upgrade(this.building_id));
    }

    private async runAction(action: () => Promise<HallActionResult>): Promise<void> {
        if (this.action_busy) {
            return;
        }
        this.action_busy = true;
        try {
            const result = await action();
            UIMananger.instance.showFlyNotice(result.message);
            if (!result.ok) {
                this.OnRefreshUI();
            }
        } catch (error) {
            UIMananger.instance.showFlyNotice(error instanceof Error ? error.message : lang(HallLang.garrisonFailed));
        } finally {
            this.action_busy = false;
        }
    }

    private formatDuration(seconds: number): string {
        if (seconds >= 3600) {
            return lang(HallLang.timeHour, { n: (seconds / 3600).toFixed(seconds % 3600 === 0 ? 0 : 1) });
        }
        if (seconds >= 60) {
            return lang(HallLang.timeMinute, { n: (seconds / 60).toFixed(seconds % 60 === 0 ? 0 : 1) });
        }
        return lang(HallLang.timeSecond, { n: seconds });
    }
}
