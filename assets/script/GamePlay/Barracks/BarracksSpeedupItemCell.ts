import { _decorator, Node } from 'cc';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { ItemIconComp } from '../../Component/ItemIconComp';
import { comp } from '../../Common/Decorator';
import { lang } from '../../Common/LangMgr';
import { BarracksLang, RecruitSpeedupItemView } from './BarracksMgr';
const { ccclass } = _decorator;

@ccclass('BarracksSpeedupItemCell')
export class BarracksSpeedupItemCell extends BaseRenderCell<RecruitSpeedupItemView> {
    @comp(ItemIconComp)
    item_icon: ItemIconComp = null!;

    @comp(BaseLabel)
    text_name: BaseLabel = null!;

    @comp(BaseLabel)
    text_effect: BaseLabel = null!;

    @comp(BaseBtn)
    btn_use: BaseBtn = null!;

    use_func: (item_id: number) => void = null!;

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.btn_use.node, Node.EventType.TOUCH_END, this.onClickUse);
    }

    public OnRefreshUI(): void {
        const data = this.getData();
        if (!data) {
            return;
        }
        this.item_icon.setItem({ item_id: data.item_id, count: data.count }, { can_not_click: true });
        this.text_name.setText(data.name);
        this.text_effect.setText(lang(BarracksLang.speedupEffect, { minute: data.time_minutes, count: data.count }));
    }

    private onClickUse(): void {
        this.use_func(this.getData().item_id);
    }
}
