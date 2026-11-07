import { _decorator, Color, Layout, Node } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { ProgressBarComp } from '../../Component/ProgressBarComp';
import { child, comp } from '../../Common/Decorator';
import { GameEvent } from '../../Common/GameEnum';
import { lang } from '../../Common/LangMgr';
import { refreshNodeList } from '../../Component/NodeList';
import { UIMananger } from '../../Component/UIMananger';
import { TechLang, TechTreeMgr } from './TechTreeMgr';
const { ccclass } = _decorator;

interface TechTreeHost {
    clearSelect(): void;
    refreshAfterDetail(): void;
    focusTech(tech_id: number): void;
}

const SHORT_COLOR = '#d47868';
const OWNED_COLOR = '#ebdfc9';

/** 科技研究弹窗。0 是说明，其它是科技 id */
@ccclass('TechTreeDetailWin')
export class TechTreeDetailWin extends BaseWin {
    @comp(BaseBtn)
    btn_close: BaseBtn = null!;

    @comp(BaseBtn, 'btn_primary')
    private btn_primary: BaseBtn = null!;

    @comp(BaseBtn, 'btn_queue')
    private btn_queue: BaseBtn = null!;

    @comp(Layout, 'dialog')
    private dialog_layout: Layout = null!;

    @comp(BaseLabel, 'dialog_title_label')
    private dialog_title: BaseLabel = null!;

    @comp(BaseLabel, 'dialog_type')
    private dialog_type: BaseLabel = null!;

    @comp(BaseSprite, 'info_icon')
    private info_icon: BaseSprite = null!;

    @comp(BaseLabel, 'level_from')
    private level_from: BaseLabel = null!;

    @comp(BaseLabel, 'level_to')
    private level_to: BaseLabel = null!;

    @comp(BaseLabel, 'status_pill')
    private status_pill: BaseLabel = null!;

    @comp(BaseLabel, 'info_desc')
    private info_desc: BaseLabel = null!;

    @comp(BaseLabel, 'effect_title')
    private effect_title: BaseLabel = null!;

    @comp(BaseLabel, 'time_caption')
    private time_caption: BaseLabel = null!;

    @comp(BaseLabel, 'time_text')
    private time_text: BaseLabel = null!;

    @comp(BaseLabel, 'note')
    private note_label: BaseLabel = null!;

    @comp(BaseLabel, 'max_text')
    private max_text: BaseLabel = null!;

    @comp(BaseLabel, 'help_text')
    private help_text: BaseLabel = null!;

    @comp(ProgressBarComp, 'meter')
    private meter: ProgressBarComp = null!;

    @child()
    private identity: Node = null!;

    @child()
    private dialog_body: Node = null!;

    @child()
    private level_arrow: Node = null!;

    @child()
    private effect_cur_title: Node = null!;

    @child()
    private effect_next_title: Node = null!;

    @child()
    private effect_list: Node = null!;

    @child()
    private req_head: Node = null!;

    @child()
    private req_list: Node = null!;

    @child()
    private cost_head: Node = null!;

    @child()
    private cost_list: Node = null!;

    @child()
    private footer: Node = null!;

    @child()
    private footer_max: Node = null!;

    @child()
    private simple_body: Node = null!;

    private text_ready = false;

    public get Is_FullScene() {
        return false;
    }

    public get parentWinName(): string | null {
        return 'TechTreeWin';
    }

    public showWin(tech_id: number): void {
        super.showWin(tech_id);
    }

    public closeWin(): void {
        const tree = this.treeWin();
        if (tree) {
            tree.clearSelect();
        }
        super.closeWin();
    }

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.btn_primary.node, Node.EventType.TOUCH_END, this.onClickResearch);
        this.addNodeEvent(this.btn_queue.node, Node.EventType.TOUCH_END, this.onClickQueue);
        this.addEvent(GameEvent.Update_Tech_Tree, this.OnRefreshUI, this);
        this.addEvent(GameEvent.BAG_ITEMS_UPDATE, this.OnRefreshUI, this);
    }

    public OnRefreshUI(): void {
        this.bindStaticText();
        this.refreshView();
    }

    /** 科技树每秒回调时，只改剩余时间和进度 */
    public refreshResearchClock(): void {
        const mgr = TechTreeMgr.getInstance();
        if (this.techId() === 0 || this.techId() !== mgr.getResearchTechId()) {
            return;
        }
        const clock = mgr.getResearchClock();
        this.time_text.setText(clock.time_text);
        this.meter.setProgress(clock.progress);
    }

    private techId(): number {
        return this.getData<number>() ?? 0;
    }

    private bindStaticText(): void {
        if (this.text_ready) {
            return;
        }
        this.text_ready = true;
        this.req_head.getComponent(BaseLabel).setText(lang(TechLang.reqHead));
        this.cost_head.getComponent(BaseLabel).setText(lang(TechLang.costHead));
        this.effect_cur_title.getComponent(BaseLabel).setText(lang(TechLang.current));
        this.effect_next_title.getComponent(BaseLabel).setText(lang(TechLang.next));
        this.btn_queue.node.getChildByName('Label').getComponent(BaseLabel).setText(lang(TechLang.view));
    }

    private onClickResearch(): void {
        const tech_id = this.techId();
        if (!TechTreeMgr.getInstance().beginTechResearch(tech_id)) {
            return;
        }
        this.refreshView();
        const tree = this.treeWin();
        if (tree) {
            tree.refreshAfterDetail();
        }
    }

    private onClickQueue(): void {
        const tech_id = TechTreeMgr.getInstance().getResearchTechId();
        const tree = this.treeWin();
        if (tree) {
            tree.focusTech(tech_id);
        }
        this.showWin(tech_id);
    }

    private treeWin(): TechTreeHost | null {
        const tree = UIMananger.instance.getWinByName('TechTreeWin');
        if (!tree) {
            return null;
        }
        return tree as unknown as TechTreeHost;
    }

    private refreshView(): void {
        const tech_id = this.techId();
        const help = tech_id === 0;
        this.simple_body.active = help;
        this.identity.active = !help;
        this.dialog_body.active = !help;
        this.footer.active = false;
        this.footer_max.active = false;
        if (help) {
            this.dialog_title.setText(lang(TechLang.title));
            this.dialog_type.setText('');
            this.help_text.setText(lang(TechLang.help));
            this.dialog_layout.updateLayout();
            return;
        }
        const detail = TechTreeMgr.getInstance().getTechDetail(tech_id);
        this.dialog_title.setText(detail.name);
        this.dialog_type.setText(detail.type_name);
        this.info_icon.node.active = detail.icon != null;
        if (detail.icon != null) {
            this.info_icon.setIconData(detail.icon);
        }
        this.level_from.setText(lang(TechLang.level, { level: detail.level }));
        this.level_arrow.active = detail.show_next;
        this.level_to.node.active = detail.show_next;
        if (detail.show_next) {
            this.level_to.setText(lang(TechLang.level, { level: detail.level + 1 }));
        }
        this.status_pill.setText(detail.status_text);
        this.info_desc.setText(detail.desc);
        this.effect_title.setText(lang(detail.show_next ? TechLang.researchEffect : TechLang.currentEffect));
        this.effect_cur_title.active = detail.show_next;
        this.effect_next_title.active = detail.show_next;
        refreshNodeList(this.effect_list, 'effect_row', detail.effects, (node, effect) => {
            node.getChildByName('effect_label').getComponent(BaseLabel).setText(effect.label);
            node.getChildByName('effect_current').getComponent(BaseLabel).setText(effect.current);
            const next = node.getChildByName('effect_next');
            next.active = detail.show_next;
            if (detail.show_next) {
                next.getComponent(BaseLabel).setText(effect.next);
            }
        });
        this.req_head.active = detail.show_reqs;
        this.req_list.active = detail.show_reqs;
        if (detail.show_reqs) {
            refreshNodeList(this.req_list, 'req_row', detail.reqs, (node, req) => {
                node.getChildByName('req_mark').getComponent(BaseLabel).setText(req.met ? '✓' : lang(TechLang.lock));
                node.getChildByName('req_name').getComponent(BaseLabel).setText(req.name);
                node.getChildByName('req_value').getComponent(BaseLabel).setText(req.value);
            });
        }
        this.cost_head.active = detail.show_costs;
        this.cost_list.active = detail.show_costs;
        if (detail.show_costs) {
            refreshNodeList(this.cost_list, 'cost_row', detail.costs, (node, cost) => {
                const icon_node = node.getChildByName('cost_icon');
                icon_node.active = cost.icon != null;
                if (cost.icon != null) {
                    icon_node.getComponent(BaseSprite).setIconData(cost.icon);
                }
                node.getChildByName('cost_name').getComponent(BaseLabel).setText(cost.name);
                const amount = node.getChildByName('cost_amount').getComponent(BaseLabel);
                const color = cost.short ? SHORT_COLOR : OWNED_COLOR;
                amount.setText(`${cost.need}`);
                amount.color = new Color().fromHEX(color);
                node.getChildByName('cost_owned').getComponent(BaseLabel).setText(`/ ${cost.owned_text}`);
            });
        }
        const show_footer = detail.status !== 'max';
        this.footer.active = show_footer;
        this.footer_max.active = detail.status === 'max';
        if (detail.status === 'max') {
            this.max_text.setText(lang(TechLang.maxReached));
        }
        if (show_footer) {
            this.time_caption.setText(detail.time_caption);
            this.time_text.setText(detail.time_text);
            this.note_label.setText(detail.note);
            this.meter.node.active = detail.show_meter;
            if (detail.show_meter) {
                this.meter.setProgress(detail.progress);
            }
            this.btn_primary.node.active = detail.show_button;
            this.btn_primary.interactable = detail.button_enabled;
            this.btn_primary.node.getChildByName('Label').getComponent(BaseLabel).setText(detail.button_text);
            this.btn_queue.node.active = detail.show_queue;
        }
        this.dialog_body.getComponent(Layout).updateLayout();
        this.dialog_layout.updateLayout();
    }
}
