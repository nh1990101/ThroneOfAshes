import { _decorator, Component, Node } from 'cc';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { child, comp } from '../../Common/Decorator';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { BattleMgr } from './BattleMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { ConfigTools } from '../../Config/ConfigTools';
import { GameUrl } from '../../Common/GameUrl';
const { ccclass, property } = _decorator;
export interface IUnitStartSortData {
    uId: string;
    /**是否当前行动 */
    isCurAction: boolean;
    /**当前排序 */
    sort: number;
    /**当前轮次 */
    round: number;
}
@ccclass('UnitStartSortCell')
export class UnitStartSortCell extends BaseRenderCell<IUnitStartSortData> {
    @child()
    curRound: Node = null!;

    @comp(BaseSprite)
    campBg: BaseSprite = null!;

    @comp(BaseSprite)
    imgHead: BaseSprite = null!;

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        var data = this.getData();
        if (data) {
            this.curRound.active = data.isCurAction;
            var battleUnit = BattleMgr.getInstance().GetUnitByUID(data.uId);
            if (battleUnit) {
                var unitData = battleUnit.GetData();
                if (unitData) {
                    this.campBg.setSpriteFromAtlas(unitData.IsEnemy() ? "ui_battle_preview_head_enemy" : "ui_battle_preview_head_ally", GameUrl.Atlas_Battle);

                    this.imgHead.setIconData(unitData.unitCfg.icon);
                }
            }
        }
    }
}


