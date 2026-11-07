import { _decorator, Layout, Node } from 'cc';
import { BasePage } from '../../Component/BasePage';
import { comp } from '../../Common/Decorator';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { refreshNodeList } from '../../Component/NodeList';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { Tools } from '../../Common/Tools';
import { ISkillData } from '../../Config/Typings/SkillData';
import { UIMananger } from '../../Component/UIMananger';
import { HeroAttrId, HeroCardData, HeroGrowPageParam } from './HeroCardComp';
import { AttrTipsUI } from '../AttrTipsUI';
import { CostItem } from '../../Component/CostItem';
import { SkillIconComp } from '../../Component/SkillIconComp';
import { HeroLang, HeroMgr } from './HeroMgr';
import { lang } from '../../Common/LangMgr';
const { ccclass } = _decorator;

interface HeroAttrItem {
    text: string;
    value: string;
    icon_id: number;
}

/** 等级格子图标，图标表 id */
const LEVEL_ATTR_ICON = 155;

/** 等级后面的四项，按这个顺序从 attrs 取 */
const ATTR_LIST: { id: HeroAttrId; name: number }[] = [
    { id: 'base_atk', name: HeroLang.atk },
    { id: 'base_def', name: HeroLang.def },
    { id: 'base_intelligence', name: HeroLang.intelligence },
    { id: 'base_command', name: HeroLang.command },
];

@ccclass('HeroLevelUpPage')
export class HeroLevelUpPage extends BasePage {

    @comp(Layout)
    level_up_attr_list: Layout = null!;

    @comp(BaseSprite)
    level_up_score: BaseSprite = null!;

    @comp(CostItem)
    level_up_cost_item_bar: CostItem = null!;

    @comp(BaseBtn)
    btn_level_up: BaseBtn = null!;

    @comp(Layout)
    skill_list: Layout = null!;

    private attr_node_text = new WeakMap<Node, string>();
    private attr_click_bound = new WeakSet<Node>();

    public initEvent(): void {
        this.addNodeEvent(this.btn_level_up.node, Node.EventType.TOUCH_END, this.onClickLevelUp);
        super.initEvent();
    }

    public OnRefreshUI(): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        this.refreshAttrs(hero);
        this.refreshScore(hero);
        this.refreshLevelUp(hero);
        this.refreshSkills(hero);
    }

    private get hero(): HeroCardData | null {
        const data = this._winData as HeroGrowPageParam;
        return data?.hero ?? null;
    }

    private onClickLevelUp() {
        // TODO: 英雄升级协议还没有，先不发
    }

    /** 读当前等级那一行。1 级升级用 1 级的消耗。突破行用突破材料，按钮写成突破 */
    private refreshLevelUp(hero: HeroCardData) {
        const level = hero.level ?? 0;
        const row = ConfigMgr.instance.HeroLevelData.get(level);
        const isBreakthrough = row?.is_breakthrough === true;
        const text = this.btn_level_up.node.getChildByName('Label').getComponent(BaseLabel);
        text.setText(isBreakthrough ? lang(HeroLang.breakthrough) : lang(HeroLang.upgrade));
        const itemIds = isBreakthrough ? row?.breakthrough_item : row?.lvup_cost_item;
        const counts = isBreakthrough ? row?.item_count : row?.lvup_cost_count;
        this.bindLevelUpCost(itemIds?.[0], counts?.[0]);
    }

    /** 消耗条是 CostItem，只显示第一项 */
    private bindLevelUpCost(item_id: number | undefined, count: number | undefined) {
        const bar = this.level_up_cost_item_bar;
        if (item_id == null) {
            bar.node.active = false;
            return;
        }
        bar.node.active = true;
        bar.setData({ item_id, count: count ?? 0 });
    }

    private refreshScore(hero: HeroCardData) {
        const text = Tools.getNumberShow(hero.score ?? 0);
        this.level_up_score.node.getChildByName('score_value').getComponent(BaseLabel).setText(text);
    }

    /** 第一项是等级，当前/上限，图标写死。后面四项从属性表读大图标 */
    private refreshAttrs(hero: HeroCardData) {
        const attrs = HeroMgr.getInstance().getHeroDisplayAttrs(hero);
        const items: HeroAttrItem[] = [
            { text: lang(HeroLang.level), value: `${hero.level ?? 0}/${this.getLevelLim(hero.star)}`, icon_id: LEVEL_ATTR_ICON },
            ...ATTR_LIST.map(item => ({
                text: lang(item.name),
                value: `${attrs?.[item.id] ?? 0}`,
                icon_id: ConfigMgr.instance.AttributeData.get(item.id).icon_big,
            })),
        ];
        refreshNodeList(this.level_up_attr_list.node, 'attr_item', items, (node, item) => {
            this.bindAttrItem(node, item);
        });
    }

    /** 格子刷图标和数值。点一下在格子旁边弹出说明 */
    private bindAttrItem(node: Node, item: HeroAttrItem) {
        node.getChildByName('icon').getComponent(BaseSprite).setIconData(item.icon_id);
        node.getChildByName('value').getComponent(BaseLabel).setText(item.value);
        this.attr_node_text.set(node, item.text);
        if (this.attr_click_bound.has(node)) {
            return;
        }
        this.attr_click_bound.add(node);
        this.addNodeEvent(node, Node.EventType.TOUCH_END, () => {
            const text = this.attr_node_text.get(node);
            if (!text) {
                return;
            }
            UIMananger.instance.showWin(AttrTipsUI, {
                desc: text,
                go: node,
                show_mask: false,
            });
        });
    }

    /** 当前星级对应星级表那一行的 level_lim */
    private getLevelLim(starId: number | undefined): number {
        if (starId == null) {
            return 0;
        }
        return ConfigMgr.instance.UnitStarData.get(starId)?.level_lim ?? 0;
    }

    /**
     * 主动技能在前，普通技能在后。单位表这两列是技能组 id。
     * 组里取 unlock_lv 不超过英雄等级的最高一级；一级都没到就用最低一级。
     */
    private refreshSkills(hero: HeroCardData) {
        const skills = this.collectHeroSkills(hero);
        refreshNodeList(this.skill_list.node, 'skill_item', skills, (node, skill) => {
            this.bindSkillItem(node, skill);
        });
    }

    private collectHeroSkills(hero: HeroCardData): ISkillData[] {
        const hero_cfg = ConfigMgr.instance.HeroData.get(hero.id);
        const unit = hero_cfg?.unit_id != null ? ConfigMgr.instance.UnitData.get(hero_cfg.unit_id) : undefined;
        const groups = [...(unit?.anger_skill ?? []), ...(unit?.nomal_skill ?? [])];
        const skills: ISkillData[] = [];
        for (const group_id of groups) {
            const skill = this.pickSkill(group_id, hero.level ?? 0);
            if (skill) {
                skills.push(skill);
            }
        }
        return skills;
    }

    /** 组里有哪些等级，看 SkillDataIndex.level_group，再按 id 读技能行 */
    private pickSkill(group_id: number, hero_level: number): ISkillData | undefined {
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
            if (unlock <= hero_level && (!current || (skill.level ?? 0) > (current.level ?? 0))) {
                current = skill;
            }
        }
        return current ?? lowest;
    }

    private bindSkillItem(node: Node, skill: ISkillData) {
        const icon_node = node.getChildByName('skill_icon');
        const icon = icon_node.getComponent(SkillIconComp) || icon_node.addComponent(SkillIconComp);
        icon.setSkill({ skill_id: skill.id, level: skill.level ?? 0 });
        node.getChildByName('name').getComponent(BaseLabel).setText(skill.name ?? '');
    }
}
