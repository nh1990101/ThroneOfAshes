import { _decorator, Component, Node } from 'cc';
import { BaseRenderCell } from '../../../Component/BaseRenderCell';
import { BaseIcon, BaseIconData } from './BaseIcon';
import { StarListComp } from '../../../Component/StarListComp';
import { child, comp } from '../../../Common/Decorator';
import { BaseBtn } from '../../../Component/BaseComp/BaseBtn';
import { ConfigMgr } from '../../../Config/ConfigMgr';
const { ccclass, property } = _decorator;
export interface HeroIconData extends BaseIconData {
    /** 单位星级表 id */
    star?: number;
    heroId: number;
    uId?: number;
}

/** 这次怎么显示。和英雄数据分开传 */
export interface HeroIconExtra {
    /** 传了就显示勾 */
    show_tick?: boolean;
}
@ccclass('HeroIcon')
export class HeroIcon extends BaseRenderCell<HeroIconData> {
    @comp(StarListComp)
    star_list: StarListComp = null!;

    @child()
    base_icon: Node = null!;

    @child()
    tick: Node = null!;

    private show_tick = false;
    private _baseIcon: BaseIcon;
    public GetBaseIcon() {
        if (!this._baseIcon) {
            this._baseIcon = this.base_icon.addComponent(BaseIcon);
        }
        return this._baseIcon;
    }

    /** 英雄数据和勾这些额外参数分开传。列表刷新只传数据时会清掉勾 */
    public setData(data: HeroIconData, extra?: HeroIconExtra): void {
        this.show_tick = extra?.show_tick == true;
        super.setData(data);
    }

    /** 只改勾，不重刷英雄数据 */
    public setShowTick(show_tick: boolean): void {
        this.show_tick = show_tick;
        if (this.tick) {
            this.tick.active = show_tick;
        }
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        if (this.tick) {
            this.tick.active = this.show_tick;
        }
        var data = this.getData();
        if (!data) {
            this.base_icon.active = false;
            this.star_list.setStar(undefined);
            return;
        }
        this.base_icon.active = true;
        this.star_list.setStar(data.star);
        data.unitId = ConfigMgr.instance.HeroData.get(data.heroId).unit_id;
        this.GetBaseIcon().setData(data);

    }

    setSelected(selected: boolean): void {
        this.GetBaseIcon().is_select_bg.node.active = selected;
    }

}


