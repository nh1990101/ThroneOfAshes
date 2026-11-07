import { _decorator, Color, Layout, Node, UITransform, Widget } from 'cc';
import { lang } from '../../Common/LangMgr';
import { HeroLang } from './HeroMgr';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { refreshNodeList } from '../../Component/NodeList';
import { SkillIconComp } from '../../Component/SkillIconComp';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { ISkillData } from '../../Config/Typings/SkillData';
import { PointerPopupParam, PointerPopupWinBase } from '../PointerPopupWinBase';
const { ccclass } = _decorator;

const LOCK_COLOR = '#8C8C8C';
const OPEN_COLOR = '#3E2B16';

/** 导表补上 tag_list 之前，界面先按语言 id 数组读 */
type SkillRow = ISkillData & { tag_list?: number[] };

export interface SkillInfoParam extends PointerPopupParam {
    /** 当前正在看的技能行 */
    skill_id: number;
}

/** 跟着技能图标弹出的技能详情 */
@ccclass('SkillInfoUI')
export class SkillInfoUI extends PointerPopupWinBase {

    private skill_info: SkillInfoParam = null;

    public showWin(skill_info: SkillInfoParam): void {
        this.skill_info = skill_info;
        super.showWin(skill_info);
    }

    protected refreshPopup(): void {
        const skill = ConfigMgr.instance.SkillData.get(this.skill_info.skill_id) as SkillRow;
        if (!skill) {
            throw new Error(`技能表没有这个 id：${this.skill_info.skill_id}`);
        }
        const floor = this.node.getChildByPath('FollowArea/Follow/HeightArea/Window/Floor');
        const head = floor.getChildByName('head');
        const icon = head.getChildByName('skill_icon').getComponent(SkillIconComp);
        icon.setSkill({ skill_id: skill.id, level: skill.level ?? 0 }, { can_not_click: true });
        const name_label = head.getChildByPath('info/text_name').getComponent(BaseLabel);
        if (skill.name != null) {
            name_label.setText(skill.name);
        } else {
            name_label.setText('');
        }
        this.refreshTags(head.getChildByPath('info/tags'), skill.tag_list);
        const level_content = floor.getChildByPath('level_scroll/view/level_content');
        this.refreshLevels(level_content, skill);
        level_content.getComponent(Widget).updateAlignment();
        head.getChildByName('info').getComponent(Layout).updateLayout();
        head.getComponent(Layout).updateLayout();
        floor.getComponent(Layout).updateLayout();
        const window = floor.parent;
        window.getComponent(UITransform).setContentSize(floor.getComponent(UITransform).contentSize);
    }

    private refreshTags(tags: Node, tag_list: number[] | undefined): void {
        const list = tag_list ?? [];
        tags.active = list.length > 0;
        if (list.length === 0) {
            return;
        }
        refreshNodeList(tags, 'tag_item', list, (node, tag_id) => {
            node.getChildByName('text').getComponent(BaseLabel).setText(tag_id);
        });
    }

    private refreshLevels(level_content: Node, skill: ISkillData): void {
        const rows = this.collectLevels(skill);
        const current_level = skill.level ?? 0;
        refreshNodeList(level_content, 'level_item', rows, (node, row, index) => {
            this.bindLevel(node, row, index, current_level, rows.length);
        });
    }

    private bindLevel(node: Node, row: ISkillData, index: number, current_level: number, count: number): void {
        const level = row.level ?? 0;
        const unlocked = level <= 1 || level <= current_level;
        const level_text = `Lv.${level}`;
        const level_label = node.getChildByName('text_level').getComponent(BaseLabel);
        level_label.setText(level_text);
        level_label.color = new Color().fromHEX(unlocked ? OPEN_COLOR : LOCK_COLOR);
        const raw = row.desc != null ? lang(row.desc) : '';
        const desc_label = node.getChildByName('text_desc').getComponent(BaseLabel);
        desc_label.setText(unlocked ? raw : lang(HeroLang.skillUnlock, { desc: raw, level: row.unlock_lv ?? 0 }));
        desc_label.color = new Color().fromHEX(unlocked ? OPEN_COLOR : LOCK_COLOR);
        node.getChildByName('line').active = index < count - 1;
        node.getComponent(Layout).updateLayout();
    }

    /** 同组技能按等级从小到大。没有组就只显示当前这一行 */
    private collectLevels(skill: ISkillData): ISkillData[] {
        const group_id = skill.group_id;
        if (group_id == null) {
            return [skill];
        }
        const levels = ConfigMgr.instance.SkillDataIndex.level_group[group_id];
        if (!levels) {
            return [skill];
        }
        const rows: ISkillData[] = [];
        for (const skill_id of Object.values(levels)) {
            const row = ConfigMgr.instance.SkillData.get(skill_id);
            if (row) {
                rows.push(row);
            }
        }
        rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
        if (rows.length === 0) {
            return [skill];
        }
        return rows;
    }
}
