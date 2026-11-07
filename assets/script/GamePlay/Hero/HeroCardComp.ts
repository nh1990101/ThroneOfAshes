import { _decorator, Node } from 'cc';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { StarListComp } from '../../Component/StarListComp';
import { Tools } from '../../Common/Tools';
import { lang } from '../../Common/LangMgr';
import { HeroLang } from './HeroMgr';
import { UIMananger } from '../../Component/UIMananger';
import { HeroGrowWin } from './HeroGrowWin';
import type { HeroCardData } from './HeroTypes';
export type { HeroAttrId, HeroCardData, HeroGrowPageParam } from './HeroTypes';
const { ccclass } = _decorator;

/** 点击这些和英雄数据分开传 */
export interface HeroCardExtra {
    can_not_click?: boolean;
}

@ccclass('HeroCardComp')
export class HeroCardComp extends BaseRenderCell<HeroCardData> {
    /** 外面当前可见的英雄列表，打开养成窗口时按这份顺序左右切 */
    heroes: HeroCardData[] = [];

    private extra?: HeroCardExtra;

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.node, Node.EventType.TOUCH_END, this.onClick);
    }

    /** 英雄数据和点击这些额外参数分开传 */
    public setCard(data: HeroCardData, extra?: HeroCardExtra): void {
        this.extra = extra;
        super.setData(data);
    }

    public setData(data: HeroCardData): void {
        this.extra = undefined;
        super.setData(data);
    }

    public OnRefreshUI(): void {
        const data = this.getData();
        if (!data) {
            return;
        }
        this.node.getChildByName('name').getComponent(BaseLabel).setText(data.name);
        this.node.getChildByName('level').getComponent(BaseLabel).setText(lang(HeroLang.cardLevel, {
            level: data.level ?? 0,
            star: data.star ?? 0,
            score: Tools.getNumberShow(data.score ?? 0),
        }));
        this.refreshFaction(data.id);
        this.refreshBg(data.id);
        this.node.getChildByName('star_list').getComponent(StarListComp).setStar(data.star);
    }

    private onClick() {
        if (this.extra?.can_not_click) {
            return;
        }
        const data = this.getData();
        if (!data) {
            return;
        }
        UIMananger.instance.showWin(HeroGrowWin, data, this.heroes);
    }

    /** 卡片底图用单位稀有度表的 rare_bg_big */
    private refreshBg(hero_id: number) {
        const bg_node = this.node.getChildByName('Bg');
        const hero_cfg = ConfigMgr.instance.HeroData.get(hero_id);
        const unit = hero_cfg?.unit_id != null ? ConfigMgr.instance.UnitData.get(hero_cfg.unit_id) : undefined;
        const rarity_id = unit?.rarity_id;
        const icon_id = rarity_id != null ? ConfigMgr.instance.UnitRareData.get(rarity_id)?.rare_bg_big : undefined;
        if (icon_id == null) {
            bg_node.active = false;
            return;
        }
        bg_node.active = true;
        bg_node.getComponent(BaseSprite).setIconData(icon_id);
    }

    /** id 是英雄表 id，阵营图标用单位表的 faction_id */
    private refreshFaction(heroId: number) {
        const factionNode = this.node.getChildByName('faction');
        const heroCfg = ConfigMgr.instance.HeroData.get(heroId);
        const unit = heroCfg?.unit_id != null ? ConfigMgr.instance.UnitData.get(heroCfg.unit_id) : undefined;
        const factionId = unit?.faction_id;
        const iconId = factionId != null ? ConfigMgr.instance.FactionData.get(factionId)?.icon : undefined;
        if (iconId == null) {
            factionNode.active = false;
            return;
        }
        factionNode.active = true;
        factionNode.getComponent(BaseSprite).setIconData(iconId);
    }
}
