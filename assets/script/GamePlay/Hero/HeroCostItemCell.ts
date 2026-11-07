import { _decorator, UITransform } from 'cc';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { HeroCardData } from './HeroCardComp';
import { HeroIcon } from '../PVE/component/HeroIcon';
const { ccclass } = _decorator;

/** 升星材料选择列表的一格。选中框交给 HeroIcon */
@ccclass('HeroCostItemCell')
export class HeroCostItemCell extends BaseRenderCell<HeroCardData> {

    public OnRefreshUI(): void {
        const data = this.getData();
        if (!data) {
            return;
        }
        const unitId = ConfigMgr.instance.HeroData.get(data.id)?.unit_id;
        if (unitId == null || data.level == null) {
            throw new Error(`英雄图标缺少 unitId 或 lv：${data.id}`);
        }
        const icon = this.heroIcon();
        icon.setData({
            heroId: data.id,
            unitId: unitId,
            lv: data.level,
            star: data.star,
        });
        icon.setSelected(this.isSelected());
    }

    protected onSelectionChanged(): void {
        this.heroIcon().setSelected(this.isSelected());
    }

    private heroIcon(): HeroIcon {
        const iconNode = this.node.getChildByName('hero_icon');
        return iconNode.getComponent(HeroIcon) || iconNode.addComponent(HeroIcon);
    }
}
