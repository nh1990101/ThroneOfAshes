import { UIMananger } from '../../Component/UIMananger';
import { EquipMgr } from './EquipMgr';
import { EQUIPMENT_CHANGED, EquipWindowContext } from './EquipTypes';
import { EquipWorkshopWin } from './EquipWorkshopWin';
import { _decorator } from 'cc';
import { comp } from '../../Common/Decorator';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseWin } from '../../Component/BaseWin';
import { EquipDetailCell } from './EquipDetailCell';
const { ccclass } = _decorator;

@ccclass('EquipInfoWin')
export class EquipInfoWin extends BaseWin {
    @comp(BaseBtn, "btn_close")
    public btn_close: BaseBtn = null!;

    private title_label: BaseLabel = null!;

    @comp(EquipDetailCell, "equipment_detail")
    private equipment_detail: EquipDetailCell = null!;

    private view_ready = false;

    public init(): void {
        super.init();
        this.title_label = this.node.getChildByPath("frame/safe_area/panel/title/text").getComponent(BaseLabel);
        this.view_ready = true;
    }

    public get parentWinName(): string | null { return 'BagWin'; }

    public initEvent(): void {
        this.addEvent(EQUIPMENT_CHANGED, this.OnRefreshUI, this);
        super.initEvent();
    }

    public showWin(data: EquipWindowContext): void { super.showWin(data); }

    public OnRefreshUI(): void {
        if (!this.view_ready) return;
        const data = this.getData<EquipWindowContext>();
        if (!data) return;
        const item = EquipMgr.getInstance().getEquipmentItem(data.item_guid);
        if (!item) { this.closeWin(); return; }
        this.equipment_detail.setData({ item_guid: item.guid, role: 'info', on_strengthen: () => {
            UIMananger.instance.showWin(EquipWorkshopWin, { item_guid: item.guid, parent_win_name: 'EquipInfoWin' });
        } });
    }
}

