import { EventTouch, Vec3, tween } from 'cc';
import { UIMananger } from '../../Component/UIMananger';
import { SCROLL_VERTICAL } from '../../Component/BaseComp/GridScrollList';
import type { BagItem } from '../Bag/BagMgr';
import { EquipMgr } from './EquipMgr';
import { EquipItemCell } from './EquipItemCell';
import { EquipWorkshopWin } from './EquipWorkshopWin';
import { EquipFilterWin } from './EquipFilterWin';
import { EquipConfirmWin } from './EquipConfirmWin';
import { EQUIPMENT_CHANGED, EquipFilter, EquipSort, EquipWindowContext } from './EquipTypes';
import type { EquipFilterData, EquipConfirmData } from './EquipViewData';
import { lang } from '../../Common/LangMgr';
import { EquipLang } from './EquipLogic';
import { setEquipmentButtonText, showEquipmentTip, getEquipmentName, getEquipmentOwnerName } from './EquipView';
import { Node, _decorator } from 'cc';
import { child, comp } from '../../Common/Decorator';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseWin } from '../../Component/BaseWin';
import { EquipDetailCell } from './EquipDetailCell';
import { GridScrollList } from '../../Component/BaseComp/GridScrollList';
const { ccclass } = _decorator;

@ccclass('EquipChangeWin')
export class EquipChangeWin extends BaseWin {
    /** 点蒙版先关排序菜单，没有菜单才关窗口 */
    protected close_on_mask = false;

    private backdrop_button: Node = null!;

    @child({ name: "drawer" })
    private drawer: Node = null!;

    @comp(EquipDetailCell, "current_detail")
    private current_detail: EquipDetailCell = null!;

    @comp(EquipDetailCell, "candidate_detail")
    private candidate_detail: EquipDetailCell = null!;

    @child({ name: "grip" })
    private grip: Node = null!;

    @comp(BaseBtn, "btn_sort")
    private btn_sort: BaseBtn = null!;

    @comp(BaseBtn, "btn_filter")
    private btn_filter: BaseBtn = null!;

    public btn_close: BaseBtn = null!;

    @comp(GridScrollList, "equipment_grid")
    private equipment_grid: GridScrollList = null!;

    @comp(BaseLabel, "empty_list")
    private empty_list: BaseLabel = null!;

    @child({ name: "sort_menu" })
    private sort_menu: Node = null!;

    private view_ready = false;

    public init(): void {
        super.init();
        this.backdrop_button = this.node.getChildByPath("mask_frame/bg_mask/btn_mask");
        this.btn_close = this.node.getChildByPath("drawer/btn_close").getComponent(BaseBtn);
        this.view_ready = true;
    }

    private context: EquipWindowContext;
    private equipment_filter: EquipFilter = { lock: 'all', worn: 'all', qualities: [] };
    private equipment_sort: EquipSort = { field: 'level', direction: 'desc' };
    private candidate_guid: number;
    private equipment_items: BagItem[] = [];
    private list_ready = false;
    private drag_start_y = 0;
    private drag_position: Vec3;
    private drag_distance = 0;

    public get parentWinName(): string | null { return 'HeroGrowWin'; }

    public initEvent(): void {
        this.addNodeEvent(this.backdrop_button, Node.EventType.TOUCH_END, this.onClickBackdrop);
        this.addNodeEvent(this.btn_sort.node, Node.EventType.TOUCH_END, this.onClickSort);
        this.addNodeEvent(this.btn_filter.node, Node.EventType.TOUCH_END, this.onClickFilter);
        this.addEvent(EQUIPMENT_CHANGED, this.OnRefreshUI, this);
        this.addNodeEvent(this.grip, Node.EventType.TOUCH_START, this.onDragStart);
        this.addNodeEvent(this.grip, Node.EventType.TOUCH_MOVE, this.onDragMove);
        this.addNodeEvent(this.grip, Node.EventType.TOUCH_END, this.onDragEnd);
        this.addNodeEvent(this.grip, Node.EventType.TOUCH_CANCEL, this.onDragEnd);
        for (let index = 0; index < 4; index++) {
            this.addNodeEvent(this.sort_menu.getChildByName(`sort_${index}`), Node.EventType.TOUCH_END, () => {
                this.equipment_sort = { field: index < 2 ? 'quality' : 'level', direction: index % 2 ? 'asc' : 'desc' };
                this.sort_menu.active = false;
                this.OnRefreshUI();
                this.equipment_grid.scrollToTop(0.1);
            });
        }
        super.initEvent();
    }

    public showWin(data: EquipWindowContext): void {
        this.context = data;
        this.candidate_guid = undefined;
        this.sort_menu.active = false;
        this.ensureEquipmentList();
        super.showWin(data);
        this.equipment_grid.scrollToTop(0);
    }

    public resetEquipmentFilters(): void {
        this.equipment_filter = { lock: 'all', worn: 'all', qualities: [] };
        this.equipment_sort = { field: 'level', direction: 'desc' };
    }

    private ensureEquipmentList(): void {
        if (this.list_ready) return;
        this.list_ready = true;
        this.equipment_grid.autoSelectIndex = -1;
        this.equipment_grid.onItemRender = (node: Node, index: number) => {
            const item = this.equipment_items[index];
            node.getComponent(EquipItemCell).setData({ item, selected: item.guid === this.candidate_guid, click_func: () => {
                this.candidate_guid = this.candidate_guid === item.guid ? undefined : item.guid;
                this.OnRefreshUI();
            } });
        };
        this.equipment_grid.setDataList(EquipItemCell, [], SCROLL_VERTICAL);
    }

    public OnRefreshUI(): void {
        if (!this.view_ready || !this.list_ready || !this.context) return;
        const mgr = EquipMgr.getInstance();
        const hero_uuid = this.context.hero_uuid;
        const pos_id = this.context.pos_id;
        this.equipment_items = mgr.getEquipmentCandidates(hero_uuid, pos_id, this.equipment_filter, this.equipment_sort);
        if (!this.equipment_items.some(item => item.guid === this.candidate_guid)) this.candidate_guid = undefined;
        const current = mgr.getHeroEquipment(hero_uuid, pos_id);
        const candidate = this.candidate_guid != null ? mgr.getEquipmentItem(this.candidate_guid) : undefined;
        this.current_detail.setData({ item_guid: current && current.guid, hero_uuid, pos_id, role: 'current',
            on_strengthen: current ? () => this.openEquipmentWorkshop(current.guid) : undefined,
            on_action: () => showEquipmentTip(mgr.removeHeroEquipment(hero_uuid, pos_id).message) });
        this.candidate_detail.setData({ item_guid: candidate && candidate.guid, compare_guid: current && current.guid,
            hero_uuid, pos_id, role: 'candidate',
            on_strengthen: candidate ? () => this.openEquipmentWorkshop(candidate.guid) : undefined,
            on_action: candidate ? () => this.wearEquipment(candidate.guid) : undefined });
        this.empty_list.node.active = this.equipment_items.length === 0;
        this.equipment_grid.updateList(this.equipment_items);
        const filter_count = Number(this.equipment_filter.lock !== 'all') + Number(this.equipment_filter.worn !== 'all')
            + Number(this.equipment_filter.qualities.length > 0);
        setEquipmentButtonText(this.btn_filter, filter_count ? lang(EquipLang.filterCount, { count: filter_count }) : lang(EquipLang.filter));
        setEquipmentButtonText(this.btn_sort, `${this.equipment_sort.field === 'level' ? lang(EquipLang.level) : lang(EquipLang.quality)} ${this.equipment_sort.direction === 'desc' ? '↓' : '↑'}`);
    }

    private wearEquipment(guid: number, confirmed = false): void {
        const result = EquipMgr.getInstance().wearHeroEquipment(this.context.hero_uuid, guid, confirmed);
        if (result.needs_transfer_confirm) {
            const item = EquipMgr.getInstance().getEquipmentItem(guid);
            UIMananger.instance.showWin(EquipConfirmWin, { title: lang(EquipLang.transferTitle),
                message: lang(EquipLang.transferMessage, { name: getEquipmentName(item), owner: getEquipmentOwnerName(item.equip.hero_uuid) }),
                confirm_text: lang(EquipLang.transferConfirm), on_confirm: () => this.wearEquipment(guid, true) } as EquipConfirmData);
            return;
        }
        if (result.ok) this.candidate_guid = undefined;
        showEquipmentTip(result.message);
        this.OnRefreshUI();
    }

    private openEquipmentWorkshop(guid: number): void {
        this.sort_menu.active = false;
        UIMananger.instance.showWin(EquipWorkshopWin, { item_guid: guid, hero_uuid: this.context.hero_uuid,
            parent_win_name: 'EquipChangeWin' } as EquipWindowContext);
    }

    private onClickBackdrop(): void {
        if (this.sort_menu.active) this.sort_menu.active = false;
        else this.closeWin();
    }

    private onClickSort(): void { this.sort_menu.active = !this.sort_menu.active; }

    private onClickFilter(): void {
        this.sort_menu.active = false;
        UIMananger.instance.showWin(EquipFilterWin, { filter: this.equipment_filter, on_apply: (filter: EquipFilter) => {
            this.equipment_filter = filter;
            this.OnRefreshUI();
            this.equipment_grid.scrollToTop(0.1);
        } } as EquipFilterData);
    }

    private onDragStart(event: EventTouch): void {
        this.drag_position = this.drawer.position.clone();
        this.drag_start_y = event.getUILocation().y;
        this.drag_distance = 0;
    }

    private onDragMove(event: EventTouch): void {
        if (!this.drag_position) return;
        this.drag_distance = Math.max(0, this.drag_start_y - event.getUILocation().y);
        this.drawer.setPosition(this.drag_position.x, this.drag_position.y - this.drag_distance, this.drag_position.z);
    }

    private onDragEnd(): void {
        if (!this.drag_position) return;
        const position = this.drag_position;
        this.drag_position = undefined;
        if (this.drag_distance > 110) {
            this.drawer.setPosition(position);
            this.closeWin();
        } else tween(this.drawer).to(0.18, { position }).start();
    }

    public closeWin(): void {
        if (this.drag_position) { this.drawer.setPosition(this.drag_position); this.drag_position = undefined; }
        super.closeWin();
    }
}

