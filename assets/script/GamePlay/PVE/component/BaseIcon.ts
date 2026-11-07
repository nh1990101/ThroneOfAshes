import { _decorator, Component, Node } from 'cc';
import { BaseRenderCell } from '../../../Component/BaseRenderCell';
import { BaseSprite } from '../../../Component/BaseComp/BaseSprite';
import { comp } from '../../../Common/Decorator';
import { BaseLabel } from '../../../Component/BaseComp/BaseLabel';
import { ConfigMgr } from '../../../Config/ConfigMgr';
import { lang } from '../../../Common/LangMgr';
const { ccclass, property } = _decorator;
export interface BaseIconData {
    unitId: number;
    lv: number;

}
@ccclass('BaseIcon')
export class BaseIcon extends BaseRenderCell<BaseIconData> {
    @comp(BaseSprite)
    bg: BaseSprite = null!;

    @comp(BaseSprite)
    icon: BaseSprite = null!;

    @comp(BaseSprite)
    facicon: BaseSprite = null!;

    @comp(BaseLabel)
    level: BaseLabel = null!;

    @comp(BaseSprite)
    is_select_bg: BaseSprite = null!;


    OnRefreshUI(): void {
        var data: BaseIconData = this.getData();
        if (data) {
            var unitdata = ConfigMgr.instance.UnitData.get(data.unitId);
            if (unitdata) {
                var rareCfg = ConfigMgr.instance.UnitRareData.get(unitdata.rarity_id);
                if (rareCfg) {
                    this.bg.setIconData(rareCfg.rare_bg_small);
                }
                this.icon.setIconData(unitdata.icon);
                var facId = ConfigMgr.instance.FactionData.get(unitdata.faction_id)?.icon
                if (facId) {
                    this.facicon.setIconData(facId);
                }
                this.level.string = lang(71, { level: data.lv });
            }
        }
    }
}


