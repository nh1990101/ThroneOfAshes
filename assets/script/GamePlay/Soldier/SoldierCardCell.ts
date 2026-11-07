import { _decorator, Node } from 'cc';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { child, comp } from '../../Common/Decorator';
import { lang } from '../../Common/LangMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { SoldierIcon } from '../PVE/component/SoldierIcon';
import { SoldierCardData, SoldierMgr } from './SoldierMgr';
const { ccclass } = _decorator;

@ccclass('SoldierCardCell')
export class SoldierCardCell extends BaseRenderCell<SoldierCardData> {
    @comp(SoldierIcon)
    soldier_icon: SoldierIcon = null!;

    @comp(BaseLabel, 'name')
    soldier_name: BaseLabel = null!;

    @comp(BaseLabel, 'level')
    soldier_level: BaseLabel = null!;

    @comp(BaseLabel, 'score')
    soldier_score: BaseLabel = null!;

    @child()
    is_select: Node = null!;

    public OnRefreshUI(): void {
        const data = this.getData();
        if (!data) {
            return;
        }
        const cfg = ConfigMgr.instance.SoldierData.get(data.id);
        const unit = cfg?.unit_id != null ? ConfigMgr.instance.UnitData.get(cfg.unit_id) : undefined;
        this.soldier_name.setText(unit?.name ?? '');
        this.soldier_level.setText(lang(20, { level: data.level }));
        this.soldier_score.setText(`${SoldierMgr.getInstance().getAttrs(data.id, data.level).score}`);
        this.soldier_icon.node.active = unit != null;
        if (unit) {
            this.soldier_icon.setData({
                unitId: unit.id,
                lv: data.level,
                uId: data.id,
                num: 0,
                isInTeam: false,
            }, false);
        }
    }

    protected onSelectionChanged(): void {
        this.is_select.active = this.isSelected();
    }
}
