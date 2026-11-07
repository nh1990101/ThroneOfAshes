import { _decorator, Component } from 'cc';
import { ConfigMgr } from '../Config/ConfigMgr';
import { BaseSprite } from './BaseComp/BaseSprite';
import { refreshNodeList } from './NodeList';
const { ccclass } = _decorator;

/** 挂在 star_list 上。同一档用同一张星图，按星级表的颗数排开 */
@ccclass('StarListComp')
export class StarListComp extends Component {
    /** 使用预制体已配置的星图，按数据给定的颗数展示。 */
    public setStarCount(count: number): void {
        refreshNodeList(this.node, 'Star', Array.from({ length: count }, (_value, index) => index), () => {});
    }

    /** 单位星级表 id。没有这一档或没有 star_icon 时清空并返回 0。返回这一档的颗数 */
    public setStar(starId: number | undefined): number {
        const row = starId != null ? ConfigMgr.instance.UnitStarData.get(starId) : undefined;
        const count = row ? (row.star_count ?? 1) : 0;
        const iconId = row?.star_icon;
        const icons = iconId != null && count > 0 ? Array.from({ length: count }, () => iconId) : [];
        refreshNodeList(this.node, 'Star', icons, (node, item) => {
            node.getComponent(BaseSprite).setIconData(item);
        });
        return count;
    }
}
