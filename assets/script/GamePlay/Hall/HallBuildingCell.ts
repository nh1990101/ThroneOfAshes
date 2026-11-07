import { _decorator, Color, Node } from 'cc';
import { child, comp } from '../../Common/Decorator';
import { GameColor } from '../../Common/GameColor';
import { lang } from '../../Common/LangMgr';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { HallLang, HallMgr, HallTab } from './HallMgr';
import { TechTreeMgr } from '../TechTree/TechTreeMgr';
const { ccclass } = _decorator;

export interface HallBuildingCellData {
    id: number;
    tab: HallTab;
}

/** 建筑列表一行。驻守页显示驻守摘要，升级页显示升级摘要。 */
@ccclass('HallBuildingCell')
export class HallBuildingCell extends BaseRenderCell<HallBuildingCellData> {
    @comp(BaseLabel, 'row_name')
    row_name: BaseLabel = null!;

    @comp(BaseLabel, 'row_lv')
    row_lv: BaseLabel = null!;

    @comp(BaseLabel, 'row_sub')
    row_sub: BaseLabel = null!;

    @comp(BaseLabel, 'row_extra')
    row_extra: BaseLabel = null!;

    @comp(BaseSprite, 'row_icon')
    row_icon: BaseSprite = null!;

    @child()
    selected_bg: Node = null!;

    click_func: () => void = null!;

    private hall_mgr = HallMgr.getInstance();
    private sub_color: Color;
    private extra_color: Color;

    public init(): void {
        super.init();
        this.sub_color = this.row_sub.color.clone();
        this.extra_color = this.row_extra.color.clone();
    }

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.node, Node.EventType.TOUCH_END, () => this.click_func());
    }

    public OnRefreshUI(): void {
        const data = this.getData();
        if (!data) {
            return;
        }
        const building = this.hall_mgr.getBuilding(data.id);
        if (!building) {
            return;
        }
        this.row_name.setText(this.hall_mgr.getBuildingName(data.id));
        this.row_lv.setText(HallLang.level, { lv: building.level });
        const icon_id = this.hall_mgr.getBuildingIcon(data.id);
        this.row_icon.node.active = icon_id != null;
        if (icon_id != null) {
            this.row_icon.setIconData(icon_id);
        }
        this.selected_bg.active = this.isSelected();

        if (data.tab === 'garrison') {
            const effect = this.hall_mgr.getEffectInfo(data.id);
            const occupied = building.slots.filter(hero_uuid => hero_uuid != null).length;
            this.row_sub.setText(`${effect.name} ${effect.text}`);
            this.row_sub.color = effect.bonus > 0 ? new Color().fromHEX(GameColor.GAME_GREEN) : this.sub_color;
            this.row_extra.setText(HallLang.garrisonCount, { n: occupied, total: building.slots.length });
            this.row_extra.color = occupied > 0 ? new Color().fromHEX(GameColor.GAME_GREEN) : this.extra_color;
            return;
        }

        const info = this.hall_mgr.getUpgradeInfo(data.id);
        const product_name = info.product_name ? ` ${info.product_name}` : '';
        const output_count = TechTreeMgr.getInstance().applyTechOutputCount(info.product_item, info.base_before);
        this.row_sub.setText(`${lang(HallLang.baseOutput)} ${output_count}${product_name}`);
        this.row_sub.color = this.sub_color;
        const text = info.max_level ? lang(HallLang.max_level) : info.reason ? info.reason : lang(HallLang.can_upgrade);
        this.row_extra.setText(text);
        this.row_extra.color = info.can_upgrade
            ? new Color().fromHEX(GameColor.GAME_GREEN)
            : info.max_level
                ? this.extra_color
                : new Color().fromHEX(GameColor.GAME_RED);
    }

    protected onSelectionChanged(): void {
        this.selected_bg.active = this.isSelected();
    }
}
