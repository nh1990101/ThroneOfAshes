import { _decorator, Node } from 'cc';
import { child, comp } from '../Common/Decorator';
import { ConfigMgr } from '../Config/ConfigMgr';
import { UIMananger } from './UIMananger';
import { BaseRenderCell } from './BaseRenderCell';
import { BaseLabel } from './BaseComp/BaseLabel';
import { BaseSprite } from './BaseComp/BaseSprite';
import { SkillInfoUI } from '../GamePlay/Hero/SkillInfoUI';
const { ccclass } = _decorator;

/** 技能行 id 和这次要显示的等级 */
export interface SkillIconData {
    skill_id: number;
    level: number;
}

/** 点击和这些额外参数分开传 */
export interface SkillIconExtra {
    click_func?: () => void;
    can_not_click?: boolean;
}

/** 挂在 skill_icon 上 */
@ccclass('SkillIconComp')
export class SkillIconComp extends BaseRenderCell<SkillIconData> {

    @child()
    is_select: Node = null!;

    @comp(BaseSprite, 'icon')
    icon: BaseSprite = null!;

    @comp(BaseLabel, 'level')
    level_label: BaseLabel = null!;

    private extra?: SkillIconExtra;

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.node, Node.EventType.TOUCH_END, this.onClick);
    }

    public setSkill(data: SkillIconData, extra?: SkillIconExtra): void {
        this.extra = extra;
        super.setData(data);
    }

    public setData(data: SkillIconData): void {
        this.extra = undefined;
        super.setData(data);
    }

    public OnRefreshUI(): void {
        const data = this.getData();
        this.is_select.active = this.isSelected();
        if (!data) {
            return;
        }
        const skill = ConfigMgr.instance.SkillData.get(data.skill_id);
        if (!skill) {
            throw new Error(`技能表没有这个 id：${data.skill_id}`);
        }
        this.icon.node.active = skill.icon != null;
        if (skill.icon != null) {
            this.icon.setIconData(skill.icon);
        }
        this.level_label.setText(`lv.${data.level}`);
    }

    protected onSelectionChanged(): void {
        this.is_select.active = this.isSelected();
    }

    /** 自定义点击优先。否则打开技能详情 */
    private onClick(): void {
        if (this.extra?.can_not_click) {
            return;
        }
        if (this.extra?.click_func) {
            this.extra.click_func();
            return;
        }
        const data = this.getData();
        if (!data) {
            return;
        }
        UIMananger.instance.showWin(SkillInfoUI, {
            skill_id: data.skill_id,
            go: this.node,
            show_mask: false,
        });
    }
}
