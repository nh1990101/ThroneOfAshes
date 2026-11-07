import { _decorator, Component, Node } from 'cc';
import { BaseRenderCell } from '../../../Component/BaseRenderCell';
import { BaseSprite } from '../../../Component/BaseComp/BaseSprite';
import { comp } from '../../../Common/Decorator';
import { IUnitData } from '../../../Config/Typings/UnitData';
import { ConfigMgr } from '../../../Config/ConfigMgr';
const { ccclass, property } = _decorator;

@ccclass('MonsterHeadCell')
export class MonsterHeadCell extends BaseRenderCell<IUnitData> {
    @comp(BaseSprite)
    headIcon: BaseSprite = null!;
    @comp(BaseSprite)
    iconBg: BaseSprite = null!;

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        var unitData = this.getData();
        if (unitData) {
            this.headIcon.setIconData(unitData.icon);
            var unitrareCfg = ConfigMgr.instance.UnitRareData.get(unitData.rarity_id);
            if (unitrareCfg) {
                this.iconBg.setIconData(unitrareCfg.icon);
            }
        }
    }
}


