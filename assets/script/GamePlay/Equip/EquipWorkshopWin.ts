import { Vec3, tween } from 'cc';
import { Tools } from '../../Common/Tools';
import { GameEvent } from '../../Common/GameEnum';
import { UIMananger } from '../../Component/UIMananger';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { SCROLL_VERTICAL } from '../../Component/BaseComp/GridScrollList';
import { BagMgr, BagItem } from '../Bag/BagMgr';
import { lang } from '../../Common/LangMgr';
import { EquipMgr } from './EquipMgr';
import { EquipMaterialCell } from './EquipMaterialCell';
import { EquipConfirmWin } from './EquipConfirmWin';
import { EquipQuickSettingWin } from './EquipQuickSettingWin';
import { getEquipmentConfig } from './EquipConfig';
import { EquipLang, getEquipmentStrength } from './EquipLogic';
import { EquipConsume, EquipWindowContext } from './EquipTypes';
import type { EquipConfirmData, EquipQuickSettingData } from './EquipViewData';
import { formatEquipmentAttribute, formatEquipmentNumber, getEquipmentName, setEquipmentButtonText, showEquipmentTip } from './EquipView';
import { Color, Node, RichText, _decorator } from 'cc';
import { child, comp } from '../../Common/Decorator';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseWin } from '../../Component/BaseWin';
import { EquipItemCell } from './EquipItemCell';
import { GridScrollList } from '../../Component/BaseComp/GridScrollList';
import { ItemIconComp } from '../../Component/ItemIconComp';
import { ProgressBarComp } from '../../Component/ProgressBarComp';
const { ccclass } = _decorator;

const AFFIX_COLOR = '#4a3724';
const AFFIX_PENDING_COLOR = '#41833f';

@ccclass('EquipWorkshopWin')
export class EquipWorkshopWin extends BaseWin {
    /** 窗口里的蒙版只关选择框 */
    protected close_on_mask = false;

    @comp(BaseLabel, "page_title")
    private page_title: BaseLabel = null!;

    @comp(BaseBtn, "btn_help")
    private btn_help: BaseBtn = null!;

    @child({ name: "gold_bar" })
    private gold_bar: Node = null!;

    @child({ name: "diamond_bar" })
    private diamond_bar: Node = null!;

    @child({ name: "strength_page" })
    private strength_page: Node = null!;

    @comp(BaseLabel, "equipment_name")
    private equipment_name: BaseLabel = null!;

    @comp(EquipItemCell, "target_icon")
    private target_icon: EquipItemCell = null!;

    @comp(BaseBtn, "btn_previous")
    private btn_previous: BaseBtn = null!;

    @comp(BaseBtn, "btn_next")
    private btn_next: BaseBtn = null!;

    @comp(BaseBtn, "btn_target_lock")
    private btn_target_lock: BaseBtn = null!;

    @comp(BaseLabel, "strength_levels")
    private strength_levels: BaseLabel = null!;

    @comp(ProgressBarComp, "experience_bar")
    private experience_bar: ProgressBarComp = null!;

    @comp(BaseLabel, "experience_text")
    private experience_text: BaseLabel = null!;

    @comp(RichText, "main_0")
    private main_0: RichText = null!;

    @comp(RichText, "main_1")
    private main_1: RichText = null!;

    @comp(BaseLabel, "affix_0")
    private affix_0: BaseLabel = null!;

    @comp(BaseLabel, "affix_1")
    private affix_1: BaseLabel = null!;

    @comp(BaseLabel, "affix_2")
    private affix_2: BaseLabel = null!;

    @comp(BaseLabel, "affix_3")
    private affix_3: BaseLabel = null!;

    @comp(BaseLabel, "material_selected")
    private material_selected: BaseLabel = null!;

    @comp(BaseBtn, "btn_clear_materials")
    private btn_clear_materials: BaseBtn = null!;

    @comp(GridScrollList, "material_grid")
    private material_grid: GridScrollList = null!;

    @comp(BaseLabel, "empty_target")
    private empty_target: BaseLabel = null!;

    @comp(BaseBtn, "btn_strength_settings")
    private btn_strength_settings: BaseBtn = null!;

    @comp(BaseBtn, "btn_fill")
    private btn_fill: BaseBtn = null!;

    @comp(BaseBtn, "btn_strengthen")
    private btn_strengthen: BaseBtn = null!;

    @comp(BaseLabel, "gold_cost")
    private gold_cost: BaseLabel = null!;

    @child({ name: "decompose_page" })
    private decompose_page: Node = null!;

    @comp(ItemIconComp, "decompose_reward")
    private decompose_reward: ItemIconComp = null!;

    @comp(BaseLabel, "decompose_reward_name")
    private decompose_reward_name: BaseLabel = null!;

    @comp(BaseLabel, "decompose_count")
    private decompose_count: BaseLabel = null!;

    @comp(BaseBtn, "btn_clear_decompose")
    private btn_clear_decompose: BaseBtn = null!;

    @comp(GridScrollList, "decompose_grid")
    private decompose_grid: GridScrollList = null!;

    @comp(BaseLabel, "empty_decompose")
    private empty_decompose: BaseLabel = null!;

    @comp(BaseBtn, "btn_decompose_settings")
    private btn_decompose_settings: BaseBtn = null!;

    @comp(BaseBtn, "btn_add_decompose")
    private btn_add_decompose: BaseBtn = null!;

    @comp(BaseBtn, "btn_decompose")
    private btn_decompose: BaseBtn = null!;

    @comp(BaseBtn, "return_btn")
    private return_btn: BaseBtn = null!;

    @child({ name: "tab_decompose" })
    private tab_decompose: Node = null!;

    @child({ name: "tab_smelt" })
    private tab_smelt: Node = null!;

    @child({ name: "tab_strengthen" })
    private tab_strengthen: Node = null!;

    @child({ name: "target_picker" })
    private target_picker: Node = null!;

    private picker_mask: Node = null!;

    private picker_close: BaseBtn = null!;

    @comp(EquipItemCell, "target_0")
    private target_0: EquipItemCell = null!;

    @comp(EquipItemCell, "target_1")
    private target_1: EquipItemCell = null!;

    @comp(EquipItemCell, "target_2")
    private target_2: EquipItemCell = null!;

    @comp(EquipItemCell, "target_3")
    private target_3: EquipItemCell = null!;

    private view_ready = false;

    public init(): void {
        super.init();
        this.picker_mask = this.node.getChildByPath("target_picker/picker_frame/bg_mask/btn_mask");
        this.picker_close = this.node.getChildByPath("target_picker/picker_frame/safe_area/panel/title/btn_close").getComponent(BaseBtn);
        this.view_ready = true;
    }

    private context: EquipWindowContext;
    private current_page: 'strengthen' | 'decompose' = 'strengthen';
    private target_guid: number;
    private target_owner_uuid: string;
    private materials_selected = new Map<number, number>();
    private decompose_selected = new Set<number>();
    private material_items: BagItem[] = [];
    private decompose_items: BagItem[] = [];
    private lists_ready = false;

    public get Is_FullScene(): boolean { return true; }
    public get parentWinName(): string | null { return this.context ? this.context.parent_win_name || null : null; }

    public initEvent(): void {
        this.addNodeEvent(this.btn_help.node, Node.EventType.TOUCH_END, this.onClickHelp);
        this.addNodeEvent(this.btn_previous.node, Node.EventType.TOUCH_END, this.onClickPrevious);
        this.addNodeEvent(this.btn_next.node, Node.EventType.TOUCH_END, this.onClickNext);
        this.addNodeEvent(this.btn_target_lock.node, Node.EventType.TOUCH_END, this.onClickTargetLock);
        this.addNodeEvent(this.btn_clear_materials.node, Node.EventType.TOUCH_END, this.onClickClearMaterials);
        this.addNodeEvent(this.btn_strength_settings.node, Node.EventType.TOUCH_END, this.onClickStrengthSettings);
        this.addNodeEvent(this.btn_fill.node, Node.EventType.TOUCH_END, this.onClickFill);
        this.addNodeEvent(this.btn_strengthen.node, Node.EventType.TOUCH_END, this.onClickStrengthen);
        this.addNodeEvent(this.btn_clear_decompose.node, Node.EventType.TOUCH_END, this.onClickClearDecompose);
        this.addNodeEvent(this.btn_decompose_settings.node, Node.EventType.TOUCH_END, this.onClickDecomposeSettings);
        this.addNodeEvent(this.btn_add_decompose.node, Node.EventType.TOUCH_END, this.onClickAddDecompose);
        this.addNodeEvent(this.btn_decompose.node, Node.EventType.TOUCH_END, this.onClickDecompose);
        this.addNodeEvent(this.return_btn.node, Node.EventType.TOUCH_END, this.closeWin);
        this.addNodeEvent(this.tab_decompose, Node.EventType.TOUCH_END, this.onClickDecomposeTab);
        this.addNodeEvent(this.tab_smelt, Node.EventType.TOUCH_END, this.onClickSmeltTab);
        this.addNodeEvent(this.tab_strengthen, Node.EventType.TOUCH_END, this.onClickStrengthenTab);
        this.addNodeEvent(this.picker_mask, Node.EventType.TOUCH_END, this.onClickClosePicker);
        this.addNodeEvent(this.picker_close.node, Node.EventType.TOUCH_END, this.onClickClosePicker);
        this.addEvent(GameEvent.BAG_ITEMS_UPDATE, this.onEquipmentChanged, this);
        super.initEvent();
    }

    public showWin(data: EquipWindowContext): void {
        this.context = data;
        this.current_page = 'strengthen';
        this.target_guid = data.item_guid;
        const item = EquipMgr.getInstance().getEquipmentItem(this.target_guid);
        this.target_owner_uuid = item ? item.equip.hero_uuid : data.hero_uuid;
        this.materials_selected.clear();
        this.decompose_selected.clear();
        this.target_picker.active = false;
        this.ensureEquipmentLists();
        super.showWin(data);
        this.material_grid.scrollToTop(0);
        this.decompose_grid.scrollToTop(0);
    }

    private ensureEquipmentLists(): void {
        if (this.lists_ready) return;
        this.lists_ready = true;
        this.material_grid.autoSelectIndex = -1;
        this.decompose_grid.autoSelectIndex = -1;
        this.material_grid.onItemRender = (node: Node, index: number) => {
            const item = this.material_items[index];
            const count = this.materials_selected.get(item.guid) || 0;
            node.getComponent(EquipMaterialCell).setData({ item, selected_count: count, selected: !!item.equip && count > 0,
                click_func: () => this.changeMaterialCount(item.guid, item.equip && count > 0 ? -1 : 1),
                minus_func: () => this.changeMaterialCount(item.guid, -1) });
        };
        this.decompose_grid.onItemRender = (node: Node, index: number) => {
            const item = this.decompose_items[index];
            node.getComponent(EquipItemCell).setData({ item, selected: this.decompose_selected.has(item.guid),
                selection_mark: 'minus', click_func: () => this.toggleDecompose(item.guid) });
        };
        this.material_grid.setDataList(EquipMaterialCell, [], SCROLL_VERTICAL);
        this.decompose_grid.setDataList(EquipItemCell, [], SCROLL_VERTICAL);
    }

    public OnRefreshUI(): void {
        if (!this.view_ready || !this.lists_ready || !this.context) return;
        const is_strengthen = this.current_page === 'strengthen';
        this.strength_page.active = is_strengthen;
        this.decompose_page.active = !is_strengthen;
        this.page_title.setText(is_strengthen ? lang(EquipLang.strengthenTitle) : lang(EquipLang.decomposeTitle));
        for (const [tab, selected] of [[this.tab_strengthen, is_strengthen], [this.tab_decompose, !is_strengthen], [this.tab_smelt, false]] as [Node, boolean][]) {
            tab.getChildByName('select').active = selected;
            tab.getChildByName('unselect').active = !selected;
        }
        const bag = BagMgr.getInstance();
        this.gold_bar.getChildByName('img_icon').getComponent(BaseSprite).setIconData(ConfigMgr.instance.ItemData.get(1002).icon);
        this.diamond_bar.getChildByName('img_icon').getComponent(BaseSprite).setIconData(ConfigMgr.instance.ItemData.get(1001).icon);
        this.gold_bar.getChildByName('lb_num').getComponent(BaseLabel).setText(Tools.getNumberShow(bag.getCount(1002)));
        this.diamond_bar.getChildByName('lb_num').getComponent(BaseLabel).setText(Tools.getNumberShow(bag.getCount(1001)));
        if (is_strengthen) this.refreshStrengthen();
        else this.refreshDecompose();
    }

    private selectionList(): EquipConsume[] {
        return Array.from(this.materials_selected, ([guid, count]) => ({ guid, count }));
    }

    private refreshStrengthen(): void {
        const mgr = EquipMgr.getInstance();
        const item = mgr.getEquipmentItem(this.target_guid);
        this.empty_target.node.active = !item;
        this.target_icon.node.parent.active = !!item;
        this.btn_fill.interactable = !!item;
        this.btn_strengthen.interactable = !!item;
        this.material_items = item ? mgr.getEquipmentStrengthMaterials(item.guid) : [];
        this.material_grid.updateList(this.material_items);
        this.material_selected.setText(lang(EquipLang.selectedCount, { count: Array.from(this.materials_selected.values()).reduce((sum, count) => sum + count, 0) }));
        this.gold_cost.setText(lang(EquipLang.goldCost, { count: 0 }));
        if (!item) return;
        this.target_icon.setData({ item, click_func: () => this.openTargetPicker() });
        const targets = this.getStrengthTargets();
        this.btn_previous.node.active = targets.length > 1;
        this.btn_next.node.active = targets.length > 1;
        this.equipment_name.setText(getEquipmentName(item));
        setEquipmentButtonText(this.btn_target_lock, item.equip.is_locked ? lang(EquipLang.unlock) : lang(EquipLang.lock));
        const preview_result = mgr.previewEquipmentStrengthen(item.guid, this.selectionList());
        const preview = preview_result.ok ? preview_result.data : mgr.previewEquipmentStrengthen(item.guid, []).data;
        const maxed = item.equip.strength_lv >= preview.max_level;
        this.strength_levels.setText(`+${preview.from_level}  →  +${preview.to_level}`);
        const strength = getEquipmentStrength(item, getEquipmentConfig());
        const start_exp = preview.from_level ? strength.need_exp[preview.from_level - 1] : 0;
        const need_exp = maxed ? 0 : strength.need_exp[preview.from_level] - start_exp;
        const shown_exp = maxed ? 0 : Math.min(need_exp, preview.current_exp - start_exp + preview.added_exp);
        this.experience_bar.setProgress(maxed ? 1 : shown_exp / need_exp);
        this.experience_text.setText(maxed ? lang(EquipLang.strengthCap) : `${formatEquipmentNumber(shown_exp)} / ${formatEquipmentNumber(need_exp)}`);
        this.gold_cost.setText(lang(EquipLang.goldCost, { count: formatEquipmentNumber(preview.gold_cost) }));
        this.btn_strengthen.interactable = !maxed;
        setEquipmentButtonText(this.btn_strengthen, maxed ? lang(EquipLang.reachedLimit) : lang(EquipLang.strengthen));
        const current_attrs = mgr.getEquipmentAttributes(item.guid);
        const projected_attrs = mgr.getEquipmentAttributes(item.guid, preview.to_level);
        [this.main_0, this.main_1].forEach((label, index) => {
            label.node.active = index < item.equip.base_attrs.length;
            if (index >= item.equip.base_attrs.length) return;
            const attr = current_attrs[index];
            const gain = projected_attrs[index].value - attr.value;
            const gain_text = gain > 0 ? `  <color=#41833f>↑ ${formatEquipmentAttribute({ ...attr, value: gain }).split(' ').slice(1).join(' ')}</color>` : '';
            label.string = `<b>${formatEquipmentAttribute(attr)}${gain_text}</b>`;
        });
        const rules = getEquipmentConfig().rules;
        const next_nodes = rules.affix_levels.filter(level => level > item.equip.strength_lv);
        [this.affix_0, this.affix_1, this.affix_2, this.affix_3].forEach((label, index) => {
            const attr = item.equip.sub_attrs[index];
            if (attr) {
                label.color = new Color().fromHEX(AFFIX_COLOR);
                label.setText(`${formatEquipmentAttribute(attr)}    ◇ ${attr.strength_times}`);
            } else if (index < item.equip.sub_attrs.length + preview.pending_affixes) {
                label.color = new Color().fromHEX(AFFIX_PENDING_COLOR);
                label.setText(lang(EquipLang.newAffixPending));
            } else {
                const level = next_nodes[index - item.equip.sub_attrs.length];
                label.color = new Color().fromHEX(AFFIX_COLOR);
                label.setText(level != null && level <= preview.max_level ? lang(EquipLang.affixUnlock, { level }) : lang(EquipLang.noMoreAffix));
            }
        });
        if (this.target_picker.active) this.refreshTargetPicker();
    }

    private getStrengthTargets(): BagItem[] {
        const mgr = EquipMgr.getInstance();
        const item = mgr.getEquipmentItem(this.target_guid);
        const owner_uuid = item && item.equip.hero_uuid || this.target_owner_uuid;
        return (owner_uuid ? mgr.getHeroEquipments(owner_uuid) : item ? [item] : [])
            .filter(entry => getEquipmentStrength(entry, getEquipmentConfig()).max_level > 0);
    }

    private selectStrengthTarget(guid: number): void {
        this.target_guid = guid;
        this.materials_selected.clear();
        this.target_picker.active = false;
        this.OnRefreshUI();
        this.material_grid.scrollToTop(0);
    }

    private openTargetPicker(): void {
        if (this.getStrengthTargets().length < 2) return;
        this.target_picker.active = true;
        this.refreshTargetPicker();
    }

    private refreshTargetPicker(): void {
        const targets = this.getStrengthTargets();
        [this.target_0, this.target_1, this.target_2, this.target_3].forEach((cell, index) => {
            const item = targets[index];
            cell.node.active = !!item;
            if (item) cell.setData({ item, selected: item.guid === this.target_guid, click_func: () => this.selectStrengthTarget(item.guid) });
        });
    }

    private stepTarget(step: number): void {
        const targets = this.getStrengthTargets();
        if (targets.length === 0) return;
        const index = targets.findIndex(item => item.guid === this.target_guid);
        this.selectStrengthTarget(targets[(index + step + targets.length) % targets.length].guid);
    }

    private changeMaterialCount(guid: number, delta: number): void {
        const item = BagMgr.getInstance().getItem(guid);
        if (!item) { showEquipmentTip(lang(EquipLang.materialMissing)); return; }
        const count = Math.max(0, Math.min(item.count, (this.materials_selected.get(guid) || 0) + delta));
        const next = new Map(this.materials_selected);
        if (count > 0) next.set(guid, count); else next.delete(guid);
        const selection = Array.from(next, ([item_guid, selected_count]) => ({ guid: item_guid, count: selected_count }));
        const result = EquipMgr.getInstance().previewEquipmentStrengthen(this.target_guid, selection);
        if (!result.ok) { showEquipmentTip(result.message); return; }
        if (delta > 0) {
            const before = EquipMgr.getInstance().previewEquipmentStrengthen(this.target_guid, this.selectionList());
            if (before.ok && before.data.to_level >= before.data.max_level) { showEquipmentTip(lang(EquipLang.levelCapFill)); return; }
        }
        this.materials_selected = next;
        this.OnRefreshUI();
    }

    private refreshDecompose(): void {
        const mgr = EquipMgr.getInstance();
        this.decompose_items = mgr.getEquipmentDecomposeItems();
        this.decompose_grid.updateList(this.decompose_items);
        this.empty_decompose.node.active = this.decompose_items.length === 0;
        const preview = mgr.previewEquipmentDecompose(Array.from(this.decompose_selected));
        const reward = preview.ok ? preview.data.rewards[0] : { item_id: getEquipmentConfig().rules.reward_item_id, count: 0 };
        this.decompose_reward.setItem({ item_id: reward.item_id, count: reward.count }, { can_not_click: true, count_text: String(reward.count) });
        this.decompose_reward_name.setText(lang(ConfigMgr.instance.ItemData.get(reward.item_id).name));
        this.decompose_count.setText(lang(EquipLang.selectedOfMax, { count: this.decompose_selected.size, max: getEquipmentConfig().rules.decompose_max }));
    }

    private toggleDecompose(guid: number): void {
        if (this.decompose_selected.has(guid)) this.decompose_selected.delete(guid);
        else {
            if (this.decompose_selected.size >= getEquipmentConfig().rules.decompose_max) { showEquipmentTip(lang(EquipLang.selectMax)); return; }
            this.decompose_selected.add(guid);
        }
        this.OnRefreshUI();
    }

    private onEquipmentChanged(): void {
        for (const [guid, count] of this.materials_selected) {
            const item = BagMgr.getInstance().getItem(guid);
            if (!item || item.count < count || item.equip && item.equip.is_locked) this.materials_selected.delete(guid);
        }
        const available = new Set(EquipMgr.getInstance().getEquipmentDecomposeItems().map(item => item.guid));
        for (const guid of this.decompose_selected) if (!available.has(guid)) this.decompose_selected.delete(guid);
        this.OnRefreshUI();
    }

    private changeEquipmentPage(page: 'strengthen' | 'decompose'): void {
        if (page === this.current_page) return;
        this.current_page = page;
        this.materials_selected.clear();
        this.decompose_selected.clear();
        this.target_picker.active = false;
        if (page === 'strengthen' && !EquipMgr.getInstance().getEquipmentItem(this.target_guid)) {
            const items = this.context.hero_uuid ? EquipMgr.getInstance().getHeroEquipments(this.context.hero_uuid) : EquipMgr.getInstance().getEquipmentItems();
            const target = items.find(item => getEquipmentStrength(item, getEquipmentConfig()).max_level > 0);
            this.target_guid = target && target.guid;
        }
        this.OnRefreshUI();
        if (page === 'strengthen') this.material_grid.scrollToTop(0);
        else this.decompose_grid.scrollToTop(0);
    }

    private submitStrengthen(guid: number, selection: EquipConsume[], confirmed = false): void {
        const mgr = EquipMgr.getInstance();
        const result = mgr.strengthenEquipment(guid, selection, confirmed, confirmed);
        if (result.needs_worn_confirm || result.needs_overflow_confirm) {
            const preview = mgr.previewEquipmentStrengthen(guid, selection).data;
            const lines: string[] = [];
            if (result.needs_worn_confirm) lines.push(lang(EquipLang.wornMaterial));
            if (result.needs_overflow_confirm) lines.push(lang(EquipLang.wasteExp, { exp: formatEquipmentNumber(preview.waste_exp) }));
            UIMananger.instance.showWin(EquipConfirmWin, { title: lang(EquipLang.strengthConfirm), message: `${lines.join('\n')}\n${lang(EquipLang.continueAsk)}`,
                confirm_text: lang(EquipLang.continueStrength), on_confirm: () => this.submitStrengthen(guid, selection, true) } as EquipConfirmData);
            return;
        }
        if (!result.ok) { showEquipmentTip(result.message); return; }
        this.materials_selected.clear();
        this.OnRefreshUI();
        const details = result.data.affix_changes.map(change => `${change.is_new ? lang(EquipLang.newAffix) : lang(EquipLang.affixUp)}：${formatEquipmentAttribute({ attr_id: change.attr_id, value: change.delta, strength_times: change.strength_times })}`);
        showEquipmentTip(`${result.message}${result.data.preview.to_level > result.data.preview.from_level ? ` · +${result.data.preview.to_level}` : ''}${details.length ? `\n${details.join('；')}` : ''}`);
        const scale = this.target_icon.node.scale.clone();
        tween(this.target_icon.node).to(0.12, { scale: new Vec3(scale.x * 1.08, scale.y * 1.08, 1) }).to(0.16, { scale }).start();
    }

    private onClickHelp(): void {
        const rules = getEquipmentConfig().rules;
        const message = this.current_page === 'strengthen'
            ? lang(EquipLang.strengthHelp, { levels: rules.affix_levels.join('、+'), count: rules.max_sub_attrs })
            : lang(EquipLang.decomposeHelp, { count: rules.decompose_max, percent: rules.return_exp_rate * 100 });
        UIMananger.instance.showWin(EquipConfirmWin, { title: this.current_page === 'strengthen' ? lang(EquipLang.strengthHelpTitle) : lang(EquipLang.decomposeHelpTitle), message } as EquipConfirmData);
    }

    private onClickPrevious(): void { this.stepTarget(-1); }
    private onClickNext(): void { this.stepTarget(1); }
    private onClickTargetLock(): void {
        const item = EquipMgr.getInstance().getEquipmentItem(this.target_guid);
        if (item) showEquipmentTip(EquipMgr.getInstance().setEquipmentLocked(item.guid, !item.equip.is_locked).message);
    }
    private onClickClosePicker(): void { this.target_picker.active = false; }
    private onClickClearMaterials(): void { this.materials_selected.clear(); this.OnRefreshUI(); }
    private onClickClearDecompose(): void { this.decompose_selected.clear(); this.OnRefreshUI(); }
    private onClickStrengthSettings(): void { UIMananger.instance.showWin(EquipQuickSettingWin, { mode: 'strengthen' } as EquipQuickSettingData); }
    private onClickDecomposeSettings(): void { UIMananger.instance.showWin(EquipQuickSettingWin, { mode: 'decompose' } as EquipQuickSettingData); }
    private onClickFill(): void {
        const result = EquipMgr.getInstance().autoFillEquipmentMaterials(this.target_guid, this.selectionList());
        if (result.ok) this.materials_selected = new Map(result.data.map(entry => [entry.guid, entry.count]));
        showEquipmentTip(result.message); this.OnRefreshUI();
    }
    private onClickAddDecompose(): void {
        const result = EquipMgr.getInstance().autoAddEquipmentDecompose(Array.from(this.decompose_selected));
        if (result.ok) this.decompose_selected = new Set(result.data);
        showEquipmentTip(result.message); this.OnRefreshUI();
    }
    private onClickStrengthen(): void { this.submitStrengthen(this.target_guid, this.selectionList()); }
    private onClickDecompose(): void {
        const guids = Array.from(this.decompose_selected);
        const result = EquipMgr.getInstance().decomposeEquipment(guids);
        if (!result.ok) { showEquipmentTip(result.message); return; }
        this.decompose_selected.clear(); this.OnRefreshUI();
        UIMananger.instance.showWin(EquipConfirmWin, { title: lang(EquipLang.gainTitle), message: lang(EquipLang.decomposed, { count: guids.length }), rewards: result.data } as EquipConfirmData);
    }
    private onClickDecomposeTab(): void { this.changeEquipmentPage('decompose'); }
    private onClickStrengthenTab(): void { this.changeEquipmentPage('strengthen'); }
    private onClickSmeltTab(): void { showEquipmentTip(lang(EquipLang.smeltClosed)); }
}

