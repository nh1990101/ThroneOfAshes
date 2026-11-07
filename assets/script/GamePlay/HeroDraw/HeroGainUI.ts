import { _decorator, Node } from 'cc';
import { child, comp } from '../../Common/Decorator';
import { BaseWin } from '../../Component/BaseWin';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { refreshNodeList } from '../../Component/NodeList';
import { SkillIconComp } from '../../Component/SkillIconComp';
import { StarListComp } from '../../Component/StarListComp';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { ISkillData } from '../../Config/Typings/SkillData';
const { ccclass } = _decorator;

/** 新英雄按 1 级取技能，和结算卡面的等级一致 */
const GAIN_HERO_LEVEL = 1;

export interface HeroGainParam {
    hero_id: number;
    on_close?: () => void;
}

/** 抽到图鉴里没有的英雄时弹出。关掉后由结算界面决定要不要弹下一只 */
@ccclass('HeroGainUI')
export class HeroGainUI extends BaseWin {
    @comp(BaseLabel, 'name')
    private hero_name: BaseLabel = null!;

    @comp(StarListComp, 'star_list')
    private star_list: StarListComp = null!;

    @child()
    private skill_list: Node = null!;

    @child({ name: 'btn_close' })
    private close_btn: Node = null!;

    private hero_id = 0;
    private on_close: (() => void) | null = null;

    public get Is_FullScene() {
        return true;
    }

    public get parentWinName(): string | null {
        return 'HeroDrawRewardWin';
    }

    public showWin(param?: HeroGainParam): void {
        if (param) {
            this.hero_id = param.hero_id;
            this.on_close = param.on_close ?? null;
        }
        super.showWin(param);
    }

    public initEvent(): void {
        this.addNodeEvent(this.close_btn, Node.EventType.TOUCH_END, this.onClickClose);
        super.initEvent();
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        if (this.hero_id === 0) {
            return;
        }
        const unit_id = ConfigMgr.instance.HeroData.get(this.hero_id)?.unit_id;
        const unit = unit_id != null ? ConfigMgr.instance.UnitData.get(unit_id) : undefined;
        this.hero_name.setText(unit?.name ?? '');
        const star_id = unit?.rarity_id != null
            ? ConfigMgr.instance.UnitRareData.get(unit.rarity_id)?.default_star
            : undefined;
        this.star_list.setStar(star_id);
        this.refreshSkills(unit?.anger_skill ?? [], unit?.nomal_skill ?? []);
    }

    private onClickClose(): void {
        const on_close = this.on_close;
        this.on_close = null;
        this.closeWin();
        if (on_close) {
            on_close();
        }
    }

    /** 主动技能在前，普通技能在后。这里不点选，选中框关掉 */
    private refreshSkills(anger_skill: readonly number[], nomal_skill: readonly number[]): void {
        const skills: ISkillData[] = [];
        for (const group_id of [...anger_skill, ...nomal_skill]) {
            const skill = this.pickSkill(group_id);
            if (skill) {
                skills.push(skill);
            }
        }
        refreshNodeList(this.skill_list, 'skill_item', skills, (node, skill) => {
            const icon_node = node.getChildByName('skill_icon');
            const icon = icon_node.getComponent(SkillIconComp) || icon_node.addComponent(SkillIconComp);
            icon.setSkill({ skill_id: skill.id, level: skill.level ?? 0 }, { can_not_click: true });
            node.getChildByName('name').getComponent(BaseLabel).setText(skill.name ?? '');
        });
    }

    /** 组里取 unlock_lv 不超过 1 级的最高一级；一级都没到就用最低一级 */
    private pickSkill(group_id: number): ISkillData | undefined {
        const levels = ConfigMgr.instance.SkillDataIndex.level_group[group_id];
        if (!levels) {
            return undefined;
        }
        let current: ISkillData | undefined;
        let lowest: ISkillData | undefined;
        for (const skill_id of Object.values(levels)) {
            const skill = ConfigMgr.instance.SkillData.get(skill_id);
            if (!skill) {
                continue;
            }
            if (!lowest || (skill.level ?? 0) < (lowest.level ?? 0)) {
                lowest = skill;
            }
            const unlock = skill.unlock_lv ?? 0;
            if (unlock <= GAIN_HERO_LEVEL && (!current || (skill.level ?? 0) > (current.level ?? 0))) {
                current = skill;
            }
        }
        return current ?? lowest;
    }
}
