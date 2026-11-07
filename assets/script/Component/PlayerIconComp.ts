import { _decorator, Node, SpriteFrame } from 'cc';
import { child, comp } from '../Common/Decorator';
import { BaseComp } from './BaseComp';
import { BaseLabel } from './BaseComp/BaseLabel';
import { BaseSprite } from './BaseComp/BaseSprite';
const { ccclass } = _decorator;

/**
 * 玩家头像。
 * icon_id、icon_frame_id 是图标表 id。不传就用预制体上的默认图。
 */
export interface PlayerIconData {
    uuid?: string;
    icon_id?: number;
    icon_frame_id?: number;
    /** 不传就不显示等级 */
    level?: number;
}

export interface PlayerIconExtra {
    click_func?: () => void;
    can_not_click?: boolean;
}

/** 挂在 player_icon 上 */
@ccclass('PlayerIconComp')
export class PlayerIconComp extends BaseComp {

    @comp(BaseSprite, 'icon')
    icon: BaseSprite = null!;

    @comp(BaseSprite, 'frame')
    frame: BaseSprite = null!;

    @child()
    lv_bg: Node = null!;

    @comp(BaseLabel, 'lv')
    lv_label: BaseLabel = null!;

    private player?: PlayerIconData;
    private extra?: PlayerIconExtra;
    private default_icon: SpriteFrame | null = null;
    private default_frame: SpriteFrame | null = null;

    /** 玩家信息还没有窗口。接上之后由那边注册，默认按 uuid 打开 */
    private static open_player_info: (uuid: string) => void = (uuid) => {
        throw new Error(`玩家信息还没有接：${uuid}`);
    };

    public static setOpenPlayerInfo(open_player_info: (uuid: string) => void): void {
        this.open_player_info = open_player_info;
    }

    public init(): void {
        super.init();
        this.default_icon = this.icon.spriteFrame;
        this.default_frame = this.frame.spriteFrame;
    }

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.node, Node.EventType.TOUCH_END, this.onClick);
    }

    /** 不传数据就显示默认头像、默认头像框，并藏掉等级 */
    public setPlayer(player?: PlayerIconData, extra?: PlayerIconExtra): void {
        this.player = player;
        this.extra = extra;
        this.OnCheckRefreshUI();
    }

    public OnRefreshUI(): void {
        const player = this.player;
        this.showIcon(this.icon, player?.icon_id, this.default_icon);
        this.showIcon(this.frame, player?.icon_frame_id, this.default_frame);
        const level = player?.level;
        this.lv_bg.active = level != null;
        if (level != null) {
            this.lv_label.setText(`${level}`);
        }
    }

    /** 自定义点击优先。否则有 uuid 就打开玩家信息 */
    private onClick(): void {
        if (this.extra?.can_not_click) {
            return;
        }
        if (this.extra?.click_func) {
            this.extra.click_func();
            return;
        }
        const uuid = this.player?.uuid;
        if (uuid) {
            PlayerIconComp.open_player_info(uuid);
        }
    }

    private showIcon(sprite: BaseSprite, icon_id: number | undefined, fallback: SpriteFrame | null): void {
        if (icon_id == null) {
            sprite.releaseSprite();
            sprite.spriteFrame = fallback;
            return;
        }
        sprite.setIconData(icon_id);
    }
}
