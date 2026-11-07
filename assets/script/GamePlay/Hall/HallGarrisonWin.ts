import { _decorator, Node, Prefab } from 'cc';
import { child, comp } from '../../Common/Decorator';
import { lang } from '../../Common/LangMgr';
import { GridScrollList, SCROLL_VERTICAL } from '../../Component/BaseComp/GridScrollList';
import { SelectCmp, SelectMode } from '../../Component/SelectCmp';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseWin } from '../../Component/BaseWin';
import { UIMananger } from '../../Component/UIMananger';
import { HallHeroCell, HallHeroCellData } from './HallHeroCell';
import { HALL_STATE_UPDATE, HallActionResult, HallLang, HallMgr, HeroChoiceView, HeroFilter } from './HallMgr';
const { ccclass } = _decorator;

/** 选择驻守英雄 */
@ccclass('HallGarrisonWin')
export class HallGarrisonWin extends BaseWin {

    @comp(BaseBtn, 'btn_confirm')
    private btn_confirm: BaseBtn = null!;

    @comp(BaseBtn, 'filter_recommend')
    private filter_recommend: BaseBtn = null!;

    @comp(BaseBtn, 'filter_all')
    private filter_all: BaseBtn = null!;

    @comp(BaseBtn, 'filter_free')
    private filter_free: BaseBtn = null!;

    @comp(BaseLabel, 'modal_title')
    private modal_title: BaseLabel = null!;

    @comp(BaseLabel, 'modal_sub')
    private modal_sub: BaseLabel = null!;

    @comp(BaseLabel, 'modal_empty')
    private modal_empty: BaseLabel = null!;

    @comp(BaseLabel, 'modal_preview')
    private modal_preview: BaseLabel = null!;

    @comp(BaseLabel, 'modal_note')
    private modal_note: BaseLabel = null!;

    @child()
    private modal_panel: Node = null!;

    @comp(GridScrollList, 'modal_heroes')
    private modal_heroes: GridScrollList = null!;

    @child()
    private hero_template: Node = null!;

    private hall_mgr = HallMgr.getInstance();
    private building_id = 0;
    private slot = 0;
    private filter: HeroFilter = 'recommend';
    private chosen_hero_uuid: string | null = null;
    private action_busy = false;
    private view_ready = false;
    private filter_select: SelectCmp<Node> = null!;
    private opening = false;
    private list_ready = false;

    public get parentWinName(): string | null {
        return 'HallBuildingWin';
    }

    public showWin(building_id: number, slot: number): void {
        this.opening = true;
        this.building_id = building_id;
        this.slot = slot;
        this.filter = 'recommend';
        const building = this.hall_mgr.getBuilding(building_id);
        this.chosen_hero_uuid = building ? (building.slots[slot] ?? null) : null;
        super.showWin();
        this.ensureHeroList();
        if (this.view_ready) {
            this.filter_select.setSelect('recommend', true);
        }
        this.opening = false;
        this.OnCheckRefreshUI();
    }

    public initEvent(): void {
        this.addEvent(HALL_STATE_UPDATE, this.OnRefreshUI, this);
        super.initEvent();
        this.bindButtons();
        this.initFilters();
        this.modal_title.setText(HallLang.modalTitle);
        this.view_ready = true;
        this.filter_select.setSelect('recommend', true);
        this.OnRefreshUI();
    }

    public OnRefreshUI(): void {
        if (!this.view_ready || this.opening || !this.list_ready) {
            return;
        }
        this.refresh();
    }

    private bindButtons(): void {
        this.addNodeEvent(this.modal_panel, Node.EventType.TOUCH_END, () => { });
        this.addNodeEvent(this.btn_confirm.node, Node.EventType.TOUCH_END, () => {
            void this.onConfirm();
        });
    }

    private initFilters(): void {
        this.filter_select = new SelectCmp<Node>(SelectMode.Single, (key, is_select, node) => {
            node!.getChildByName('selected_bg').active = is_select;
            if (is_select) {
                this.setFilter(key as HeroFilter);
            }
        });
        const filters: { key: HeroFilter; btn: BaseBtn; text: number }[] = [
            { key: 'recommend', btn: this.filter_recommend, text: HallLang.filterRecommend },
            { key: 'all', btn: this.filter_all, text: HallLang.filterAll },
            { key: 'free', btn: this.filter_free, text: HallLang.filterFree },
        ];
        for (const item of filters) {
            item.btn.node.getChildByName('label').getComponent(BaseLabel).setText(item.text);
            this.filter_select.addKey(item.key, item.btn.node);
            this.addNodeEvent(item.btn.node, Node.EventType.TOUCH_END, () => this.filter_select.setSelect(item.key, true));
        }
    }

    private refresh(): void {
        const build_id = this.building_id;
        const building = this.hall_mgr.getBuilding(build_id);
        if (!building) {
            return;
        }
        const slot_count = building.slots.length;
        this.modal_sub.setText(HallLang.modalSub, {
            building: this.hall_mgr.getBuildingName(build_id),
            level: building.level,
            slot: this.slot + 1,
            count: slot_count,
        });
        this.refreshHeroList();
        this.refreshPreview();
    }

    private refreshPreview(): void {
        const build_id = this.building_id;
        const building = this.hall_mgr.getBuilding(build_id);
        const effect = this.hall_mgr.getEffectInfo(build_id);
        const effect_sign = effect.code === 'recruit_cost' ? '-' : '+';
        const current_hero_uuid = building.slots[this.slot] ?? null;
        const chosen = this.chosen_hero_uuid;

        const preview = this.hall_mgr.getGarrisonPreviewBonus(build_id, this.slot, chosen);
        const before_text = preview.before === 0 ? '0%' : `${effect_sign}${this.hall_mgr.formatPercent(preview.before)}%`;
        const after_text = preview.after === 0 ? '0%' : `${effect_sign}${this.hall_mgr.formatPercent(preview.after)}%`;
        this.modal_preview.setText(HallLang.preview, { effect: effect.name, before: before_text, after: after_text });

        let note = lang(HallLang.chooseHero);
        if (chosen != null) {
            if (chosen === current_hero_uuid) {
                note = lang(HallLang.sameHero);
            } else {
                const assignment = this.hall_mgr.getHeroAssignment(chosen);
                if (assignment && assignment.building_id !== build_id) {
                    note = lang(HallLang.moveFrom, {
                        building: assignment.building_name,
                        slot: assignment.slot + 1,
                        building2: this.hall_mgr.getBuildingName(build_id),
                        slot2: this.slot + 1,
                    });
                } else if (assignment && assignment.building_id === build_id && assignment.slot !== this.slot) {
                    note = lang(HallLang.moveInBuilding, { from: assignment.slot + 1, to: this.slot + 1 });
                } else if (current_hero_uuid != null) {
                    note = lang(HallLang.replaceHero, { hero: this.hall_mgr.getHeroName(current_hero_uuid) });
                } else {
                    note = lang(HallLang.garrisonNote);
                }
            }
        }
        this.modal_note.setText(note);

        const can_confirm = this.slot < building.slots.length && chosen != null && chosen !== current_hero_uuid
            && this.hall_mgr.getHeroBonus(chosen, build_id) > 0;
        this.btn_confirm.interactable = can_confirm;
        this.setButtonText(
            this.btn_confirm,
            chosen == null ? HallLang.chooseHeroBtn : chosen === current_hero_uuid ? HallLang.currentGarrison : HallLang.confirmGarrison,
        );
    }

    private refreshHeroList(): void {
        const build_id = this.building_id;
        const effect = this.hall_mgr.getEffectInfo(build_id);
        const effect_sign = effect.code === 'recruit_cost' ? '-' : '+';
        const choices = this.hall_mgr.getHeroChoices(build_id, this.filter);
        if (this.chosen_hero_uuid != null && !choices.some(choice => choice.hero.uuid === this.chosen_hero_uuid)) {
            this.chosen_hero_uuid = null;
        }
        const cells: HallHeroCellData[] = choices.map(choice => ({
            choice,
            effect_sign,
            status_text: this.getHeroStatusText(choice),
        }));
        this.modal_heroes.updateList(cells);
        this.modal_empty.node.active = cells.length === 0;
        this.modal_empty.setText(HallLang.noHeroResult);
    }

    /** 窗口内保留一份格子模板，由虚拟列表只创建可见区域的格子。 */
    private ensureHeroList(): void {
        if (this.list_ready) {
            return;
        }
        const cell_prefab = new Prefab();
        cell_prefab.name = 'HallHeroCell';
        cell_prefab.data = this.hero_template;
        this.modal_heroes.itemPrefab = cell_prefab;
        this.modal_heroes.onItemRender = (node: Node, index: number) => {
            const data = this.modal_heroes.getDatas()[index] as HallHeroCellData;
            const cell = node.getComponent(HallHeroCell);
            cell.setData(data);
            cell.setSelected(data.choice.hero.uuid === this.chosen_hero_uuid);
            cell.click_func = () => this.chooseHero(cell.getData().choice.hero.uuid);
        };
        this.modal_heroes.setDataList(HallHeroCell, [], SCROLL_VERTICAL);
        this.list_ready = true;
    }

    private getHeroStatusText(choice: HeroChoiceView): string {
        const assignment = choice.assigned;
        if (!assignment) {
            return choice.faction_name ? `${lang(HallLang.idle)} · ${choice.faction_name}` : lang(HallLang.idle);
        }
        if (assignment.building_id === this.building_id && assignment.slot === this.slot) {
            return lang(HallLang.currentSeat);
        }
        return lang(HallLang.garrisonAt, { building: assignment.building_name, slot: assignment.slot + 1 });
    }

    private setButtonText(btn: BaseBtn, content: string | number, args?: Record<string, string | number>): void {
        btn.node.getChildByName('label').getComponent(BaseLabel).setText(content, args);
    }

    private setFilter(filter: HeroFilter): void {
        if (this.filter === filter) {
            return;
        }
        this.filter = filter;
        this.OnRefreshUI();
    }

    private chooseHero(hero_uuid: string): void {
        if (this.hall_mgr.getHeroBonus(hero_uuid, this.building_id) <= 0) {
            return;
        }
        this.chosen_hero_uuid = hero_uuid;
        for (const node of this.modal_heroes.content.children) {
            const cell = node.getComponent(HallHeroCell);
            cell.setSelected(cell.getData().choice.hero.uuid === hero_uuid);
        }
        this.refreshPreview();
    }

    private async onConfirm(): Promise<void> {
        const hero_uuid = this.chosen_hero_uuid;
        if (hero_uuid == null || this.hall_mgr.getHeroBonus(hero_uuid, this.building_id) <= 0) {
            return;
        }
        const building = this.hall_mgr.getBuilding(this.building_id);
        if (!building || building.slots[this.slot] === hero_uuid) {
            return;
        }
        await this.runAction(() => this.hall_mgr.setGarrison(this.building_id, this.slot, hero_uuid));
    }

    private async runAction(action: () => Promise<HallActionResult>): Promise<void> {
        if (this.action_busy) {
            return;
        }
        this.action_busy = true;
        try {
            const result = await action();
            UIMananger.instance.showFlyNotice(result.message);
            if (result.ok) {
                this.closeWin();
                return;
            }
            this.refresh();
        } catch (error) {
            UIMananger.instance.showFlyNotice(error instanceof Error ? error.message : lang(HallLang.garrisonFailed));
        } finally {
            this.action_busy = false;
        }
    }
}
