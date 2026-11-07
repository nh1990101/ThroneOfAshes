import { _decorator, Color, Node } from 'cc';
import { child, comp } from '../../Common/Decorator';
import { GameColor } from '../../Common/GameColor';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { HeroIcon } from '../PVE/component/HeroIcon';
import { HallLang, HallMgr, HeroChoiceView } from './HallMgr';
const { ccclass } = _decorator;

export interface HallHeroCellData {
    choice: HeroChoiceView;
    effect_sign: string;
    status_text: string;
}

/** 英雄选择弹窗里的一格。图标交给 HeroIcon。 */
@ccclass('HallHeroCell')
export class HallHeroCell extends BaseRenderCell<HallHeroCellData> {
    @comp(HeroIcon, 'hero_icon')
    hero_icon: HeroIcon = null!;

    @comp(BaseLabel, 'hero_name')
    hero_name: BaseLabel = null!;

    @comp(BaseLabel, 'hero_bonus')
    hero_bonus: BaseLabel = null!;

    @comp(BaseLabel, 'hero_status')
    hero_status: BaseLabel = null!;

    @child()
    selected_bg: Node = null!;

    @child()
    disabled_bg: Node = null!;

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
        const choice = data.choice;
        this.hero_name.setText(choice.name);
        if (choice.can_garrison) {
            this.hero_bonus.setText(HallLang.heroBonus, { value: `${data.effect_sign}${this.hall_mgr.formatPercent(choice.bonus)}` });
            this.hero_bonus.color = new Color().fromHEX(GameColor.GAME_GREEN);
        } else {
            this.hero_bonus.setText(HallLang.cannotGarrison);
            this.hero_bonus.color = new Color().fromHEX(GameColor.GAME_RED);
        }
        this.hero_status.setText(data.status_text);
        this.selected_bg.active = this.isSelected();
        this.disabled_bg.active = !choice.can_garrison;
        const unit_id = ConfigMgr.instance.HeroData.get(choice.hero.id).unit_id;
        this.hero_icon.setData({
            unitId: unit_id,
            lv: choice.hero.level,
            star: choice.hero.star,
            heroId: choice.hero.id,
        });
    }

    protected onSelectionChanged(): void {
        this.selected_bg.active = this.isSelected();
    }
}
