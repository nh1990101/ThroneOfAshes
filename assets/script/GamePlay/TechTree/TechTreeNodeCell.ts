import { _decorator, Node } from 'cc';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { lang } from '../../Common/LangMgr';
import { TechLang, TechTreeNodeData } from './TechTreeMgr';
const { ccclass } = _decorator;

/** 科技树上的一个节点 */
@ccclass('TechTreeNodeCell')
export class TechTreeNodeCell extends BaseRenderCell<TechTreeNodeData> {
    click_func: () => void;

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.node, Node.EventType.TOUCH_END, this.onClick);
    }

    public OnRefreshUI(): void {
        const data = this.getData();
        if (!data) {
            return;
        }
        const icon_node = this.node.getChildByName('node_icon');
        icon_node.active = data.icon != null;
        if (data.icon != null) {
            icon_node.getComponent(BaseSprite).setIconData(data.icon);
        }
        this.node.getChildByName('node_level').getComponent(BaseLabel).setText(lang(TechLang.level, { level: data.level }));
        this.node.getChildByName('node_name').getComponent(BaseLabel).setText(data.name);
        this.node.getChildByName('node_lock').active = data.status === 'locked';
        this.node.getChildByName('node_select').active = data.selected;

        const badge = this.node.getChildByName('node_badge').getComponent(BaseLabel);
        let badge_text = '';
        if (data.status === 'max') {
            badge_text = lang(TechLang.badgeMax);
        } else if (data.status === 'research') {
            badge_text = lang(TechLang.badgeResearch);
        } else if (data.show_up) {
            badge_text = '↑';
        }
        badge.node.active = badge_text !== '';
        badge.setText(badge_text);

        const status = this.node.getChildByName('node_status').getComponent(BaseLabel);
        if (data.status === 'research') {
            status.setText(data.countdown);
        } else if (data.status === 'max') {
            status.setText(lang(TechLang.maxLevel));
        } else if (data.status === 'locked') {
            status.setText(lang(TechLang.locked));
        } else {
            status.setText('');
        }
    }

    /** 研究过程中只改剩余时间 */
    public setResearchCountdown(text: string): void {
        this.node.getChildByName('node_status').getComponent(BaseLabel).setText(text);
    }

    private onClick(): void {
        this.click_func();
    }
}
