import { _decorator, Color, Graphics, instantiate, Layout, Node, ScrollView, UITransform, Vec2 } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { child, comp } from '../../Common/Decorator';
import { GameEvent } from '../../Common/GameEnum';
import { lang } from '../../Common/LangMgr';
import { TimerMgr } from '../../Common/TimerMgr';
import { Tools } from '../../Common/Tools';
import { refreshNodeList } from '../../Component/NodeList';
import { SelectCmp, SelectMode } from '../../Component/SelectCmp';
import { UIMananger } from '../../Component/UIMananger';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { BagMgr } from '../Bag/BagMgr';
import { TechLang, TechTreeMgr, TechTreeNodeData } from './TechTreeMgr';
import { TechTreeNodeCell } from './TechTreeNodeCell';
import { TechTreeDetailWin } from './TechTreeDetailWin';
const { ccclass } = _decorator;

const ROW_GAP = 280;
const ROW_TOP = 70;
const CELL_HALF = 95;
const CELL_WIDTH = 150;
const CELL_GAP = 24;
const LINE_COLOR = new Color(166, 139, 83, 255);

/** 魔法塔里的科技树。页签、节点、消耗和效果读科技表。 */
@ccclass('TechTreeWin')
export class TechTreeWin extends BaseWin {
    @comp(BaseBtn, 'btn_back')
    private btn_back: BaseBtn = null!;

    @comp(BaseBtn, 'btn_help')
    private btn_help: BaseBtn = null!;

    @comp(ScrollView, 'tree_scroll')
    private tree_scroll: ScrollView = null!;

    @comp(Graphics, 'tree_lines')
    private tree_lines: Graphics = null!;

    @comp(BaseLabel, 'chapter')
    private chapter: BaseLabel = null!;

    @comp(Layout, 'tab_list')
    private tab_list: Layout = null!;

    @child()
    private scroll_cue: Node = null!;

    @child()
    private res_0: Node = null!;

    @child()
    private res_1: Node = null!;

    private view_ready = false;
    private refreshing = false;
    private type_id = 0;
    private selected_id = 0;
    /** 界面上的秒针。研究结束由管理器自己的倒计时结算 */
    private research_timer = 0;
    /** 界面上正在显示的剩余秒，没变就不改字 */
    private shown_second = -1;
    private tab_select: SelectCmp<number>;
    private tab_ids = new Map<Node, number>();
    private tab_bound = new Set<Node>();
    private cells = new Map<number, TechTreeNodeCell>();
    private scroll_map = new Map<number, Vec2>();

    public get Is_FullScene() {
        return true;
    }

    public showWin(...param): void {
        this.ensureView();
        super.showWin(...param);
    }

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.btn_back.node, Node.EventType.TOUCH_END, this.closeWin);
        this.addNodeEvent(this.btn_help.node, Node.EventType.TOUCH_END, this.onClickHelp);
        this.addNodeEvent(this.tree_scroll.node, ScrollView.EventType.SCROLLING, this.refreshCue);
        this.addEvent(GameEvent.Update_Tech_Tree, this.onTechChanged, this);
        this.addEvent(GameEvent.BAG_ITEMS_UPDATE, this.onTechChanged, this);
    }

    public OnRefreshUI(): void {
        if (!this.view_ready || this.refreshing) {
            return;
        }
        this.refreshing = true;
        const mgr = TechTreeMgr.getInstance();
        mgr.settleTechResearch();
        if (!mgr.getResearchTechId()) {
            this.stopResearchTimer();
        } else {
            this.ensureResearchTimer();
        }
        this.refreshHeader();
        this.refreshNodes();
        this.refreshCue();
        this.refreshOpenDetail();
        const notice = mgr.takeTechNotice();
        if (notice) {
            UIMananger.instance.showFlyNotice(notice);
        }
        this.refreshing = false;
    }

    protected onDisable(): void {
        this.stopResearchTimer();
        super.onDisable();
    }

    private onTechChanged(): void {
        if (!this.view_ready || this.refreshing) {
            return;
        }
        this.OnRefreshUI();
    }

    /** 有研究才挂界面秒针。重复调用不会再开一个 */
    private ensureResearchTimer(): void {
        const mgr = TechTreeMgr.getInstance();
        if (this.research_timer || !mgr.getResearchTechId()) {
            return;
        }
        const left = mgr.getResearchLeftRealSeconds();
        if (left <= 0) {
            return;
        }
        this.shown_second = Math.ceil(left);
        this.research_timer = TimerMgr.getInstance().addRealCountdown(left, this.onResearchDone, this, this.onResearchUpdate);
    }

    private stopResearchTimer(): void {
        if (!this.research_timer) {
            return;
        }
        TimerMgr.getInstance().removeRealCountdown(this.research_timer);
        this.research_timer = 0;
        this.shown_second = -1;
    }

    /** 现实时间走秒，秒数没变不改界面 */
    private onResearchUpdate(remaining: number): void {
        const second = Math.ceil(remaining);
        if (second <= 0 || second === this.shown_second) {
            return;
        }
        this.shown_second = second;
        this.refreshCountdown();
        const detail = UIMananger.instance.getWinByName('TechTreeDetailWin') as TechTreeDetailWin;
        if (detail && detail.node.active) {
            detail.refreshResearchClock();
        }
    }

    /** 倒计时结束时 TimerMgr 会自己删掉这条，这里不要再 remove */
    private onResearchDone(): void {
        this.research_timer = 0;
        this.shown_second = -1;
        this.OnRefreshUI();
    }

    private refreshOpenDetail(): void {
        const detail = UIMananger.instance.getWinByName('TechTreeDetailWin') as TechTreeDetailWin;
        if (detail && detail.node.active) {
            detail.OnCheckRefreshUI();
        }
    }

    /** 研究过程中只改倒计时，不重设图标 */
    private refreshCountdown(): void {
        const mgr = TechTreeMgr.getInstance();
        const tech_id = mgr.getResearchTechId();
        const cell = this.cells.get(tech_id);
        if (!cell || !cell.node.active) {
            return;
        }
        cell.setResearchCountdown(mgr.getResearchCountdownText());
    }

    private ensureView(): void {
        if (this.view_ready) {
            return;
        }
        const mgr = TechTreeMgr.getInstance();
        if (mgr.getAllTechIds().length === 0 || mgr.getTechTypes().length === 0) {
            return;
        }
        this.view_ready = true;
        this.bindStaticText();
        this.buildCells();
        this.buildTabs();
    }

    /** 预制体上的固定句子改走程序多语言 */
    private bindStaticText(): void {
        this.node.getChildByPath('header/win_title').getComponent(BaseLabel).setText(lang(TechLang.title));
        this.node.getChildByPath('scene/scene_copy').getComponent(BaseLabel).setText(lang(TechLang.scene));
        this.scroll_cue.getComponent(BaseLabel).setText(lang(TechLang.scrollCue));
        this.btn_back.node.getChildByName('Label').getComponent(BaseLabel).setText(lang(TechLang.back));
    }

    private buildCells(): void {
        const content = this.tree_scroll.content;
        const template = content.getChildByName('node_cell');
        template.active = false;
        const ids = TechTreeMgr.getInstance().getAllTechIds();
        for (const tech_id of ids) {
            const node = instantiate(template);
            node.parent = content;
            const cell = node.getComponent(TechTreeNodeCell) || node.addComponent(TechTreeNodeCell);
            cell.click_func = () => this.openResearch(tech_id);
            this.cells.set(tech_id, cell);
        }
    }

    private buildTabs(): void {
        const types = TechTreeMgr.getInstance().getTechTypes();
        this.tab_select = new SelectCmp<number>(SelectMode.Single, (_key, is_select, type_id) => {
            const node = this.findTab(type_id);
            node.getChildByName('tab_select').active = is_select;
            if (is_select) {
                this.showType(type_id);
            }
        });
        refreshNodeList(this.tab_list.node, 'tab_btn', types, (node, type) => {
            node.getChildByName('tab_label').getComponent(BaseLabel).setText(type.name);
            this.tab_ids.set(node, type.id);
            if (!this.tab_bound.has(node)) {
                this.tab_bound.add(node);
                this.addNodeEvent(node, Node.EventType.TOUCH_END, () => this.onTabClick(node));
            }
            this.tab_select.addKey(type.id, type.id);
        });
    }

    private findTab(type_id: number): Node {
        for (const [node, id] of this.tab_ids) {
            if (id === type_id) {
                return node;
            }
        }
        throw new Error(`科技页签不存在：${type_id}`);
    }

    private onTabClick(node: Node): void {
        const type_id = this.tab_ids.get(node);
        if (type_id !== this.type_id) {
            UIMananger.instance.closeWin(TechTreeDetailWin);
        }
        this.tab_select.setSelect(type_id, true);
    }

    private showType(type_id: number): void {
        if (this.type_id && this.type_id !== type_id) {
            const offset = this.tree_scroll.getScrollOffset();
            this.scroll_map.set(this.type_id, new Vec2(-offset.x, offset.y));
        }
        this.type_id = type_id;
        const type = TechTreeMgr.getInstance().getTechTypes().find(item => item.id === type_id);
        this.chapter.setText(type ? type.name : '');
        this.layoutTree();
        const saved = this.scroll_map.get(type_id);
        this.tree_scroll.scrollToOffset(saved ?? new Vec2(0, 0), 0);
        this.refreshCue();
    }

    private layoutTree(): void {
        const mgr = TechTreeMgr.getInstance();
        const nodes = mgr.getTechNodes(this.type_id);
        const by_row = new Map<number, TechTreeNodeData[]>();
        for (const data of nodes) {
            const row = by_row.get(data.row);
            if (row) {
                row.push(data);
            } else {
                by_row.set(data.row, [data]);
            }
        }
        const row_keys = Array.from(by_row.keys()).sort((a, b) => a - b);
        const row_index = new Map<number, number>();
        for (let i = 0; i < row_keys.length; i++) {
            row_index.set(row_keys[i], i);
        }
        const view_height = this.tree_scroll.view.height;
        const view_width = this.tree_scroll.view.width;
        const height = Math.max(view_height, ROW_TOP + row_keys.length * ROW_GAP + 40);
        let width = view_width;
        const step = CELL_WIDTH + CELL_GAP;
        for (const row of row_keys) {
            const count = by_row.get(row).length;
            const row_width = count * CELL_WIDTH + Math.max(0, count - 1) * CELL_GAP + 40;
            if (row_width > width) {
                width = row_width;
            }
        }
        const content = this.tree_scroll.content;
        const content_ui = content.getComponent(UITransform);
        content_ui.height = height;
        content_ui.width = width;
        const line_ui = this.tree_lines.node.getComponent(UITransform);
        line_ui.height = height;
        line_ui.width = width;
        this.tree_scroll.horizontal = width > view_width + 1;
        const pos = new Map<number, { x: number; y: number }>();
        for (const row of row_keys) {
            const list = by_row.get(row);
            const y = -ROW_TOP - row_index.get(row) * ROW_GAP - CELL_HALF;
            const span = list.length <= 1 ? 0 : (list.length - 1) * step;
            for (let i = 0; i < list.length; i++) {
                const x = list.length === 1 ? 0 : -span / 2 + i * step;
                pos.set(list[i].id, { x, y });
            }
        }
        for (const [tech_id, cell] of this.cells) {
            const place = pos.get(tech_id);
            cell.node.active = place != null;
            if (!place) {
                continue;
            }
            cell.node.setPosition(place.x, place.y, 0);
            const data = mgr.getTechNode(tech_id, tech_id === this.selected_id);
            cell.setData(data);
        }
        this.drawLines(nodes, pos);
    }

    /** 每条前置单独连到对应节点，隔行的前置也连 */
    private drawLines(nodes: TechTreeNodeData[], pos: Map<number, { x: number; y: number }>): void {
        const g = this.tree_lines;
        g.clear();
        g.lineWidth = 4;
        g.strokeColor = LINE_COLOR;
        for (const child of nodes) {
            const child_pos = pos.get(child.id);
            if (!child_pos) {
                continue;
            }
            const reqs = ConfigMgr.instance.MagicTechData.get(child.id).need_tech_id ?? [];
            for (const req_id of reqs) {
                const parent_pos = pos.get(req_id);
                if (!parent_pos) {
                    continue;
                }
                const y1 = parent_pos.y - CELL_HALF;
                const y2 = child_pos.y + CELL_HALF;
                const mid_y = (y1 + y2) / 2;
                g.moveTo(parent_pos.x, y1);
                g.lineTo(parent_pos.x, mid_y);
                g.lineTo(child_pos.x, mid_y);
                g.lineTo(child_pos.x, y2);
            }
        }
        g.stroke();
    }

    private refreshNodes(): void {
        const mgr = TechTreeMgr.getInstance();
        for (const [tech_id, cell] of this.cells) {
            if (!cell.node.active) {
                continue;
            }
            cell.setData(mgr.getTechNode(tech_id, tech_id === this.selected_id));
        }
    }

    private refreshHeader(): void {
        const ids = TechTreeMgr.getInstance().getTechCostItemIds();
        this.bindRes(this.res_0, ids[0]);
        this.bindRes(this.res_1, ids[1]);
    }

    private bindRes(node: Node, item_id: number | undefined): void {
        node.active = item_id != null;
        if (item_id == null) {
            return;
        }
        const item = ConfigMgr.instance.ItemData.get(item_id);
        const name_node = node.getChildByName('res_name');
        const count_node = node.getChildByName('res_count');
        name_node.getComponent(BaseLabel).setText(item?.name != null ? lang(item.name) : '');
        count_node.getComponent(BaseLabel).setText(Tools.getNumberShow(BagMgr.getInstance().getCount(item_id)));
    }

    private refreshCue(): void {
        const max = this.tree_scroll.getMaxScrollOffset().y;
        const y = this.tree_scroll.getScrollOffset().y;
        this.scroll_cue.active = max > 20 && max - y > 20;
    }

    private openResearch(tech_id: number): void {
        this.selected_id = tech_id;
        this.refreshNodes();
        UIMananger.instance.showWin(TechTreeDetailWin, tech_id);
    }

    private onClickHelp(): void {
        this.clearSelect();
        UIMananger.instance.showWin(TechTreeDetailWin, 0);
    }

    /** 关掉研究弹窗时清掉节点高亮 */
    public clearSelect(): void {
        if (this.selected_id === 0) {
            return;
        }
        this.selected_id = 0;
        if (this.view_ready) {
            this.refreshNodes();
        }
    }

    /** 研究开始或完成时，刷新树上的状态 */
    public refreshAfterDetail(): void {
        if (!this.view_ready) {
            return;
        }
        this.OnRefreshUI();
    }

    /** 从弹窗跳到正在研究的科技，并滚到该节点 */
    public focusTech(tech_id: number): void {
        this.selected_id = tech_id;
        const type_id = TechTreeMgr.getInstance().getTechTypeId(tech_id);
        if (type_id !== this.type_id) {
            this.tab_select.setSelect(type_id, true);
        } else {
            this.refreshNodes();
        }
        this.scrollToTech(tech_id);
    }

    private scrollToTech(tech_id: number): void {
        const cell = this.cells.get(tech_id);
        if (!cell || !cell.node.active) {
            return;
        }
        const view = this.tree_scroll.view;
        const max_offset = this.tree_scroll.getMaxScrollOffset();
        const pos = cell.node.position;
        const content_width = this.tree_scroll.content.getComponent(UITransform).width;
        const offset_y = Math.min(max_offset.y, Math.max(0, -pos.y - view.height * 0.5));
        const offset_x = Math.min(max_offset.x, Math.max(0, pos.x + content_width * 0.5 - view.width * 0.5));
        const offset = new Vec2(offset_x, offset_y);
        this.tree_scroll.scrollToOffset(offset, 0);
        this.scroll_map.set(this.type_id, offset);
    }
}
