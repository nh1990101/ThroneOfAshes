import { _decorator, Node } from 'cc';
import { child, comp } from '../Common/Decorator';
import { ConfigMgr } from '../Config/ConfigMgr';
import { IItemData } from '../Config/Typings/ItemData';
import { BaseRenderCell } from './BaseRenderCell';
import { BaseLabel } from './BaseComp/BaseLabel';
import { BaseSprite } from './BaseComp/BaseSprite';
import { ProgressBarComp } from './ProgressBarComp';
import { ItemType } from '../Common/GameEnum';
const { ccclass } = _decorator;

/**
 * 背包物品在服务器上的字段是 guid、item_id、count。
 * 图标至少要有 item_id。没有实例时可以不带 guid。
 */
export interface ItemIconData {
    item_id: number;
    count?: number;
    guid?: number;
}

/** 点击和数量文案 */
export interface ItemIconExtra {
    click_func?: () => void;
    /** 传了就盖过 count，数量节点一定会显示 */
    count_text?: string;
    can_not_click?: boolean;
    hide_type_icon?: boolean;
    /** 碎片也不画进度条，改回数量 */
    hide_piece_progress?: boolean;
}

/** 挂在 item_icon 上 */
@ccclass('ItemIconComp')
export class ItemIconComp extends BaseRenderCell<ItemIconData> {

    @comp(BaseSprite, 'bg')
    quality_bg: BaseSprite = null!;

    @child()
    is_select_bg: Node = null!;

    @comp(BaseLabel, 'count')
    countLabel: BaseLabel = null!;

    @comp(BaseSprite, 'icon')
    icon: BaseSprite = null!;

    @comp(BaseSprite, 'label')
    labelBg: BaseSprite = null!;

    @comp(BaseLabel, 'text')
    labelText: BaseLabel = null!;

    @comp(BaseSprite, 'type_icon')
    typeIcon: BaseSprite = null!;

    @comp(ProgressBarComp, 'piece')
    piece_bar: ProgressBarComp = null!;

    @child()
    top_left_icon: Node = null!;

    private extra?: ItemIconExtra;

    /** 点图标时打开物品信息。由物品信息窗口注册 */
    private static openItemInfo: (item: ItemIconData) => void;

    public static setOpenItemInfo(openItemInfo: (item: ItemIconData) => void): void {
        this.openItemInfo = openItemInfo;
    }

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.node, Node.EventType.TOUCH_END, this.onClick);
    }

    /** 物品数据和点击、数量这些额外参数分开传 */
    public setItem(param: ItemIconData, extra?: ItemIconExtra): void {
        this.extra = extra;
        super.setData(param);
    }

    public setData(data: ItemIconData): void {
        this.extra = undefined;
        super.setData(data);
    }

    public OnRefreshUI(): void {
        const data = this.getData();
        this.is_select_bg.active = this.isSelected();
        if (!data) {
            return;
        }
        const cfg = ConfigMgr.instance.ItemData.get(data.item_id);
        if (!cfg) {
            throw new Error(`物品表没有这个 id：${data.item_id}`);
        }
        this.icon.setIconData(cfg.icon);
        this.quality_bg.setIconData(ConfigMgr.instance.QualityData.get(cfg.quality).quality_frame);
        this.bindCount(data.count, cfg);
        this.bindLabel(cfg);
        this.bindTypeIcon(cfg);
        this.top_left_icon.active = false;
    }

    protected onSelectionChanged(): void {
        this.is_select_bg.active = this.isSelected();
    }

    /** 有左上角文案才显示。底图按 label_icon 换，没有就清掉上一格的图 */
    private bindLabel(cfg: IItemData): void {
        const label_lang_id = cfg.item_icon_label_text;
        const show = label_lang_id != null;
        this.labelBg.node.active = show;
        if (!show) {
            return;
        }
        if (cfg.label_icon != null) {
            this.labelBg.setIconData(cfg.label_icon);
        } else {
            this.labelBg.releaseSprite();
        }
        this.labelText.setText(label_lang_id);
    }

    /** 物品类型表有 type_icon 才显示 */
    private bindTypeIcon(cfg: IItemData): void {
        const typeId = cfg.type;
        let iconId: number | undefined;
        if (typeId != null) {
            const typeCfg = ConfigMgr.instance.ItemTypeData.get(typeId);
            if (!typeCfg) {
                throw new Error(`物品类型表没有这个 id：${typeId}`);
            }
            iconId = typeCfg.type_icon;
        }
        this.typeIcon.node.active = iconId != null && !this.extra?.hide_type_icon;
        if (iconId == null) {
            return;
        }
        this.typeIcon.setIconData(iconId);
    }

    /**
     * 碎片有所需数量时，用进度条代替数量，文案是当前/所需。
     * 传了 count_text 或 hide_piece_progress 时仍显示数量。
     */
    private bindCount(count: number | undefined, cfg: IItemData): void {
        const count_text = this.extra?.count_text;
        const has_count_text = count_text != null && count_text !== '';
        const self_count = cfg.self_count;
        const show_piece = !has_count_text
            && !this.extra?.hide_piece_progress
            && isPieceItem(cfg.type)
            && count != null && count > 0
            && self_count != null && self_count > 0;
        this.piece_bar.node.active = show_piece;
        if (show_piece && count != null && self_count != null) {
            this.countLabel.node.active = false;
            this.piece_bar.setProgress(count / self_count);
            this.piece_bar.node.getChildByName('text').getComponent(BaseLabel).setText(`${count}/${self_count}`);
            return;
        }
        const show = has_count_text || (count != null && count > 1);
        this.countLabel.node.active = show;
        if (!show) {
            return;
        }
        this.countLabel.setText(has_count_text ? count_text : `${count}`);
    }

    /** 自定义点击优先。否则把当前物品数据交给物品信息 */
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
        if (data.guid == null && this.extra?.count_text) {
            ItemIconComp.openItemInfo({ item_id: data.item_id, count: 1 });
            return;
        }
        ItemIconComp.openItemInfo(data);
    }
}

function isPieceItem(item_type: number | undefined): boolean {
    return item_type === ItemType.HERO_FRAG
        || item_type === ItemType.SOLDIER_FRAG
        || item_type === ItemType.STUFF_FRAG;
}
