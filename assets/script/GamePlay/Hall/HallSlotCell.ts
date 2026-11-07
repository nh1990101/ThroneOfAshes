import { _decorator, Node } from 'cc';
import { child, comp } from '../../Common/Decorator';
import { lang } from '../../Common/LangMgr';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { HallLang, HallMgr } from './HallMgr';
const { ccclass } = _decorator;

export interface HallSlotCellData {
    index: number;
    hero_uuid: string | null;
    locked: boolean;
}

/** 建筑详情里的一个驻守席位。 */
@ccclass('HallSlotCell')
export class HallSlotCell extends BaseRenderCell<HallSlotCellData> {
    @comp(BaseLabel, 'slot_label')
    slot_label: BaseLabel = null!;

    @comp(BaseSprite, 'slot_icon')
    slot_icon: BaseSprite = null!;

    @child()
    selected_bg: Node = null!;

    @child()
    locked_bg: Node = null!;

    private hall_mgr = HallMgr.getInstance();
    click_func: () => void = null!;

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.node, Node.EventType.TOUCH_END, () => this.click_func());
    }

    public OnRefreshUI(): void {
        const data = this.getData();
        if (!data) {
            return;
        }
        const hero_uuid = data.hero_uuid;
        this.selected_bg.active = this.isSelected() && !data.locked;
        this.locked_bg.active = data.locked;
        this.slot_icon.node.active = !data.locked && hero_uuid != null;
        if (hero_uuid != null && !data.locked) {
            const icon_id = this.hall_mgr.getHeroIcon(hero_uuid);
            this.slot_icon.node.active = icon_id != null;
            if (icon_id != null) {
                this.slot_icon.setIconData(icon_id);
            }
        }

        const seat = lang(HallLang.seatIndex, { n: data.index + 1 });
        if (data.locked) {
            this.slot_label.setText(`${seat}\n${lang(HallLang.seatLocked)}`);
        } else if (hero_uuid != null) {
            this.slot_label.setText(`${this.hall_mgr.getHeroName(hero_uuid)}\n${seat}`);
        } else {
            this.slot_label.setText(`${seat}\n${lang(HallLang.seatEmpty)}`);
        }
    }

    protected onSelectionChanged(): void {
        const data = this.getData();
        this.selected_bg.active = this.isSelected() && data != null && !data.locked;
    }
}
