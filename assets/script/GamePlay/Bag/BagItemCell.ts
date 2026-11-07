import { _decorator, Node } from 'cc';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { UIMananger } from '../../Component/UIMananger';
import { BagItem } from './BagMgr';
import { ItemInfoWin } from './ItemInfoWin';
const { ccclass } = _decorator;

/** 挂在 item_icon 上。显示图标、品质框、数量 */
@ccclass('BagItemCell')
export class BagItemCell extends BaseRenderCell<BagItem> {
    public init(): void {
        super.init();
        this.node.getChildByName('top_left_icon').active = false;
    }

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.node, Node.EventType.TOUCH_END, this.onClick);
    }

    public OnRefreshUI(): void {
        const data = this.getData();
        if (!data) {
            return;
        }
        const cfg = ConfigMgr.instance.ItemData.get(data.item_id);
        if (!cfg) {
            throw new Error(`物品表没有这个 id：${data.item_id}`);
        }
        this.node.getChildByName('count').getComponent(BaseLabel).setText(`${data.count}`);
        this.requireSprite('icon').setIconData(cfg.icon);
        const quality = cfg.quality != null ? ConfigMgr.instance.QualityData.get(cfg.quality) : undefined;
        this.requireSprite('rare_icon').setIconData(quality?.quality_frame);
        this.node.getChildByName('is_select_bg').active = this.isSelected();
    }

    protected onSelectionChanged(): void {
        this.node.getChildByName('is_select_bg').active = this.isSelected();
    }

    private onClick(): void {
        const data = this.getData();
        if (!data) {
            return;
        }
        UIMananger.instance.showWin(ItemInfoWin, data, true);
    }

    private requireSprite(name: string): BaseSprite {
        const sprite = this.node.getChildByName(name).getComponent(BaseSprite);
        if (!sprite) {
            throw new Error(`item_icon 的 ${name} 上没有 BaseSprite`);
        }
        return sprite;
    }
}
