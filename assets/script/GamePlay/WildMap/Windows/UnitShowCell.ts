import { _decorator, Component, Node } from 'cc';
import { BaseRenderCell } from '../../../Component/BaseRenderCell';
import { BattleUnitData } from '../../Battle/BattleUnitData';
import { BaseSprite } from '../../../Component/BaseComp/BaseSprite';
import { comp } from '../../../Common/Decorator';
import { BaseLabel } from '../../../Component/BaseComp/BaseLabel';
import { ConfigMgr } from '../../../Config/ConfigMgr';
import { GameUrl } from '../../../Common/GameUrl';
import { lang, LangMgr } from '../../../Common/LangMgr';
const { ccclass, property } = _decorator;
export interface IUnitShowData {
    lv: number;
    unitId: number;
}
@ccclass('UnitShowCell')
export class UnitShowCell extends BaseRenderCell<IUnitShowData> {
    @comp(BaseSprite)
    img_bg: BaseSprite = null!;

    @comp(BaseSprite)
    img_Unit: BaseSprite = null!;

    @comp(BaseSprite)
    img_race: BaseSprite = null!;

    @comp(BaseLabel)
    lb_name: BaseLabel = null!;

    @comp(BaseLabel)
    lb_lv: BaseLabel = null!;


    public OnRefreshUI(): void {
        super.OnRefreshUI();
        const data = this.getData();
        if (!data) {
            return;
        }
        var cfg = ConfigMgr.instance.UnitData.get(data.unitId);
        if (cfg) {
            this.img_Unit.setIconData(cfg.portrait);
            const factionId = cfg.faction_id;
            const iconId = factionId != null ? ConfigMgr.instance.FactionData.get(factionId)?.icon : undefined;
            if (iconId == null) {
                this.img_race.node.active = false;

            } else {
                this.img_race.node.active = true;
                this.img_race.setIconData(iconId);
            }
            this.lb_name.string = lang(cfg.name);
            // this.lb_num.string = `x${data.soidierNum}`;
            var rareCfg = ConfigMgr.instance.UnitRareData.get(cfg.rarity_id);
            if (rareCfg) {
                this.img_bg.setIconData(rareCfg.rare_bg_big)
            }
        }
        this.lb_lv.node.active = data.lv > 0;
        this.lb_lv.string = lang(71, { level: data.lv });
    }
}


