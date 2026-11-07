import { _decorator, Node, tween, Tween, Vec3 } from 'cc';
import { lang } from '../../Common/LangMgr';
import { BaseComp } from '../../Component/BaseComp';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { HeroCardComp, HeroCardData } from '../Hero/HeroCardComp';
const { ccclass } = _decorator;

/** 单位稀有度 SSR。和许愿门槛一致，达到才播翻开表现 */
const SSR_RARE_ID = 4;
/** 从落点往下这么远开始飞 */
const FLY_OFFSET_Y = 1400;
const FLY_TIME = 0.28;
const FLIP_HALF = 0.12;

/** 一张抽卡结果。卡背飞到落点，点击翻开，一键全开按顺序翻 */
@ccclass('DrawRewardItem')
export class DrawRewardItem extends BaseComp {
    private rest_ready = false;
    private rest_pos = new Vec3();
    private rare_id = 0;
    private opened = false;
    private flying = false;
    private flipping = false;
    private clickable = true;
    /** 重新发牌时加一，停掉的飞入和翻面不再回调 */
    private anim_id = 0;
    private on_opened: (() => void) | null = null;

    public initEvent(): void {
        this.addNodeEvent(this.node, Node.EventType.TOUCH_END, this.onClick);
        super.initEvent();
    }

    protected onDisable(): void {
        Tween.stopAllByTarget(this.node);
        super.onDisable();
    }

    public setOpenedListener(listener: () => void): void {
        this.on_opened = listener;
    }

    public isOpened(): boolean {
        return this.opened;
    }

    /** 正在翻面。一键全开时，还有卡在翻就不盖结算界面 */
    public isFlipping(): boolean {
        return this.flipping;
    }

    /** 顺序翻牌时先关掉点击，避免点到后面的卡插队 */
    public setClickable(clickable: boolean): void {
        this.clickable = clickable;
    }

    /** 盖上卡背，挪到落点下方 */
    public prepare(hero_id: number): void {
        this.anim_id += 1;
        Tween.stopAllByTarget(this.node);
        this.rememberRest();
        this.rare_id = this.readRare(hero_id);
        this.opened = false;
        this.flying = true;
        this.flipping = false;
        this.clickable = true;
        this.node.setScale(1, 1, 1);
        this.showBack();
        this.fillFace(hero_id);
        this.node.setPosition(this.rest_pos.x, this.rest_pos.y - FLY_OFFSET_Y, this.rest_pos.z);
    }

    public playFly(delay: number, on_arrive: () => void): void {
        const anim_id = this.anim_id;
        tween(this.node)
            .delay(delay)
            .to(FLY_TIME, { position: this.rest_pos.clone() }, { easing: 'quadOut' })
            .call(() => {
                if (anim_id !== this.anim_id) {
                    return;
                }
                this.flying = false;
                on_arrive();
            })
            .start();
    }

    /** 翻到正面。飞入中、正在翻、已经翻开都不再翻 */
    public flip(): void {
        if (this.opened || this.flying || this.flipping) {
            return;
        }
        this.flipping = true;
        const anim_id = this.anim_id;
        tween(this.node)
            .to(FLIP_HALF, { scale: new Vec3(0, 1, 1) })
            .call(() => {
                if (anim_id !== this.anim_id) {
                    return;
                }
                this.showFace();
            })
            .to(FLIP_HALF, { scale: new Vec3(1, 1, 1) })
            .call(() => {
                if (anim_id !== this.anim_id) {
                    return;
                }
                this.opened = true;
                this.flipping = false;
                this.playBurst();
                if (this.on_opened) {
                    this.on_opened();
                }
            })
            .start();
    }

    /** 正面翻开之后。SSR 及以上先放大再收回，换成炸开特效时只改这里 */
    public playBurst(): void {
        if (this.rare_id < SSR_RARE_ID) {
            return;
        }
        tween(this.node)
            .to(0.08, { scale: new Vec3(1.15, 1.15, 1) })
            .to(0.12, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    private onClick(): void {
        if (!this.clickable) {
            return;
        }
        this.flip();
    }

    private rememberRest(): void {
        if (this.rest_ready) {
            return;
        }
        this.rest_pos.set(this.node.position);
        this.rest_ready = true;
    }

    private showBack(): void {
        this.node.getChildByName('unopen').active = true;
        this.node.getChildByName('open').active = false;
    }

    private showFace(): void {
        this.node.getChildByName('unopen').active = false;
        this.node.getChildByName('open').active = true;
    }

    private fillFace(hero_id: number): void {
        const card_node = this.node.getChildByName('open').getChildByName('hero_card');
        const card = card_node.getComponent(HeroCardComp) || card_node.addComponent(HeroCardComp);
        card.setCard(this.cardData(hero_id), { can_not_click: true });
        // 等级行是英雄列表用的，结算正面只留名字、星级和立绘
        card_node.getChildByName('level').active = false;
        this.applyPortrait(card_node, hero_id);
    }

    private applyPortrait(card_node: Node, hero_id: number): void {
        const icon_node = card_node.getChildByName('Icon');
        const unit_id = ConfigMgr.instance.HeroData.get(hero_id)?.unit_id;
        const icon_id = unit_id != null ? ConfigMgr.instance.UnitData.get(unit_id)?.icon : undefined;
        if (icon_id == null) {
            icon_node.active = false;
            return;
        }
        icon_node.active = true;
        icon_node.getComponent(BaseSprite).setIconData(icon_id);
    }

    private cardData(hero_id: number): HeroCardData {
        const unit_id = ConfigMgr.instance.HeroData.get(hero_id)?.unit_id ?? 0;
        const unit = ConfigMgr.instance.UnitData.get(unit_id);
        const star = unit?.rarity_id != null
            ? ConfigMgr.instance.UnitRareData.get(unit.rarity_id)?.default_star
            : undefined;
        const name = unit?.name != null ? lang(unit.name) : String(hero_id);
        return { id: hero_id, name, level: 1, star };
    }

    private readRare(hero_id: number): number {
        const unit_id = ConfigMgr.instance.HeroData.get(hero_id)?.unit_id;
        if (unit_id == null) {
            return 0;
        }
        return ConfigMgr.instance.UnitData.get(unit_id)?.rarity_id ?? 0;
    }
}
