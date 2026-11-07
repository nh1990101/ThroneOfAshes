import { _decorator, Node } from 'cc';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { ConfigMgr } from '../../Config/ConfigMgr';
const { ccclass } = _decorator;

export interface HeroFactionData {
    /** 0 是全选，其它是 FactionData.id */
    id: number;
    name: string;
}

@ccclass('HeroFactionCell')
export class HeroFactionCell extends BaseRenderCell<HeroFactionData> {
    clickFunc: (() => void) | null = null;

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.node, Node.EventType.TOUCH_END, this.onClick);
    }

    public OnRefreshUI(): void {
        const data = this.getData();
        if (!data) {
            return;
        }
        this.node.getChildByPath('select/label').getComponent(BaseLabel).setText(data.name);
        this.node.getChildByPath('unselect/label').getComponent(BaseLabel).setText(data.name);
        this.refreshIcon(data.id);
    }

    private onClick() {
        if (this.clickFunc) {
            this.clickFunc();
        }
    }

    protected onSelectionChanged(): void {
        const selected = this.isSelected();
        this.node.getChildByName('select').active = selected;
        this.node.getChildByName('unselect').active = !selected;
    }

    /** 页签图在 select、unselect 上。全选不在阵营表里，图写死。其它读阵营表的 icon */
    private refreshIcon(factionId: number) {
        const select = this.node.getChildByName('select').getComponent(BaseSprite);
        const unselect = this.node.getChildByName('unselect').getComponent(BaseSprite);
        if (factionId === 0) {
            select.setSpriteFromAtlas('ui_hero_faction_tab_icon_all', 'Res/Atlas/HeroUI');
            unselect.setSpriteFromAtlas('ui_hero_faction_tab_icon_all', 'Res/Atlas/HeroUI');
            return;
        }
        const iconId = ConfigMgr.instance.FactionData.get(factionId).icon;
        select.setIconData(iconId);
        unselect.setIconData(iconId);
    }
}
