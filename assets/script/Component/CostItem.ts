import { _decorator, Component, Node } from 'cc';
import { BaseRenderCell } from './BaseRenderCell';
import { ItemIconData } from './ItemIconComp';
import { BaseSprite } from './BaseComp/BaseSprite';
import { BaseLabel } from './BaseComp/BaseLabel';
import { comp } from '../Common/Decorator';
import { ConfigMgr } from '../Config/ConfigMgr';
const { ccclass, property } = _decorator;

@ccclass('CostItem')
export class CostItem extends BaseRenderCell<ItemIconData> {
    @comp(BaseSprite)
    img_icon: BaseSprite = null!;

    @comp(BaseLabel)
    lb_num: BaseLabel = null!;
    public OnRefreshUI(): void {
        const data = this.getData();
        if (!data) {
            return;
        }
        const cfg = ConfigMgr.instance.ItemData.get(data.item_id);
        if (!cfg) {
            throw new Error(`物品表没有这个 id：${data.item_id}`);
        }
        this.img_icon.setIconData(cfg.icon);
        this.lb_num.setText(data.count.toString())
    }
}


