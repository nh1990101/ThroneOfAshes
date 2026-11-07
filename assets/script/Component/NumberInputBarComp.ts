import { _decorator, Color, EditBox, Label, Layout, Node } from 'cc';
import { lang } from '../Common/LangMgr';
import { Tools } from '../Common/Tools';
import { comp } from '../Common/Decorator';
import { BaseComp } from './BaseComp';
import { BaseBtn } from './BaseComp/BaseBtn';
import { BaseLabel } from './BaseComp/BaseLabel';
import { UIMananger } from './UIMananger';
const { ccclass } = _decorator;

const HOLD_INTERVAL = 0.1;

/**
 * 数量输入这一次的范围。
 * min 不传当 0。max 是上限。
 */
export interface NumberInputParam {
    min?: number;
    max: number;
    /** 显示成 当前/上限 */
    show_range?: boolean;
    /** 不缩写大数，直接显示整数 */
    not_format_big?: boolean;
    /** 快进按钮一次加减的数量。不传则不显示快进按钮 */
    quick_step?: number;
    show_min_btn?: boolean;
    show_max_btn?: boolean;
    init_value?: number;
    /** 数值变化后的当前值。setInput 的初始赋值不触发 */
    on_value_changed?: (cur: number) => void;
}

/** 挂在 number_input_bar 上。减号 SubBtn，加号 AddBtn，快进 QuickSubBtn / QuickAddBtn，最小 MinBtn，最大 MaxBtn，输入在 TextContent/InputField，显示文字 ValueText */
@ccclass('NumberInputBarComp')
export class NumberInputBarComp extends BaseComp {

    @comp(BaseBtn, 'SubBtn')
    subBtn: BaseBtn = null!;

    @comp(BaseBtn, 'AddBtn')
    addBtn: BaseBtn = null!;

    @comp(BaseBtn, 'QuickSubBtn')
    quickSubBtn: BaseBtn = null!;

    @comp(BaseBtn, 'QuickAddBtn')
    quickAddBtn: BaseBtn = null!;

    @comp(BaseBtn, 'MinBtn')
    minBtn: BaseBtn = null!;

    @comp(BaseBtn, 'MaxBtn')
    maxBtn: BaseBtn = null!;

    @comp(EditBox, 'InputField')
    editBox: EditBox = null!;

    @comp(Label, 'TEXT_LABEL')
    textLabel: Label = null!;

    @comp(BaseLabel, 'ValueText')
    valueLabel: BaseLabel = null!;

    private param: NumberInputParam | null = null;
    private value = 0;
    private min = 0;
    private max = 0;
    private quickStep = 0;
    private pending = false;
    private editing = false;
    private syncing = false;
    private holdStep = 0;
    private holdTip = false;
    private tippedThisHold = false;
    private quickSubLabel: BaseLabel = null!;
    private quickAddLabel: BaseLabel = null!;

    private readonly holdTick = (): void => {
        if (!this.node.activeInHierarchy || !this.param) {
            this.stopHold();
            return;
        }
        this.applyHoldStep();
    };

    public initEvent(): void {
        this.editBox.inputMode = EditBox.InputMode.NUMERIC;
        this.editBox.inputFlag = EditBox.InputFlag.DEFAULT;
        this.quickSubLabel = this.quickSubBtn.node.getChildByName('Text').getComponent(BaseLabel);
        this.quickAddLabel = this.quickAddBtn.node.getChildByName('Text').getComponent(BaseLabel);
        super.initEvent();
        this.addNodeEvent(this.subBtn.node, Node.EventType.TOUCH_START, this.onSubHoldStart);
        this.addNodeEvent(this.subBtn.node, Node.EventType.TOUCH_END, this.stopHold);
        this.addNodeEvent(this.subBtn.node, Node.EventType.TOUCH_CANCEL, this.stopHold);
        this.addNodeEvent(this.addBtn.node, Node.EventType.TOUCH_START, this.onAddHoldStart);
        this.addNodeEvent(this.addBtn.node, Node.EventType.TOUCH_END, this.stopHold);
        this.addNodeEvent(this.addBtn.node, Node.EventType.TOUCH_CANCEL, this.stopHold);
        this.addNodeEvent(this.quickSubBtn.node, Node.EventType.TOUCH_END, this.onClickQuickSub);
        this.addNodeEvent(this.quickAddBtn.node, Node.EventType.TOUCH_END, this.onClickQuickAdd);
        this.addNodeEvent(this.minBtn.node, Node.EventType.TOUCH_END, this.onClickMin);
        this.addNodeEvent(this.maxBtn.node, Node.EventType.TOUCH_END, this.onClickMax);
        this.addNodeEvent(this.editBox.node, EditBox.EventType.EDITING_DID_BEGAN, this.onEditBegan);
        this.addNodeEvent(this.editBox.node, EditBox.EventType.TEXT_CHANGED, this.onTextChanged);
        this.addNodeEvent(this.editBox.node, EditBox.EventType.EDITING_DID_ENDED, this.onEditEnded);
    }

    protected onDisable(): void {
        this.stopHold();
        super.onDisable();
    }

    /** 设置范围、快进和初始值。初始赋值不触发 on_value_changed */
    public setInput(param: NumberInputParam): void {
        if (param.max == null) {
            throw new Error('数量输入未设置上限');
        }
        this.param = param;
        this.pending = true;
        this.OnCheckRefreshUI();
    }

    public OnRefreshUI(): void {
        if (!this.pending || !this.param) {
            return;
        }
        this.pending = false;
        this.applyParam();
    }

    public getValue(): number {
        return this.value;
    }

    public setValue(value: number): void {
        if (!this.param || !this.isInitComponent) {
            return;
        }
        this.editing = false;
        this.writeValue(value, true);
    }

    public setMin(min: number): void {
        if (!this.param || !this.isInitComponent) {
            return;
        }
        this.min = Math.round(min);
        if (this.max < this.min) {
            this.max = this.min;
        }
        this.writeValue(this.value, true);
    }

    public setMax(max: number): void {
        if (!this.param || !this.isInitComponent) {
            return;
        }
        this.max = Math.round(max);
        if (this.max < this.min) {
            this.max = this.min;
        }
        this.writeValue(this.value, true);
    }

    private applyParam(): void {
        const param = this.param;
        this.stopHold();
        this.editing = false;
        this.min = Math.round(param.min ?? 0);
        this.max = Math.round(param.max);
        if (this.max < this.min) {
            this.max = this.min;
        }
        this.minBtn.node.active = !!param.show_min_btn;
        this.maxBtn.node.active = !!param.show_max_btn;
        const step = param.quick_step == null ? 0 : Math.abs(Math.round(param.quick_step));
        this.quickStep = step;
        const showQuick = step > 0;
        this.quickSubBtn.node.active = showQuick;
        this.quickAddBtn.node.active = showQuick;
        if (showQuick) {
            this.quickSubLabel.setText(this.formatSigned(-step));
            this.quickAddLabel.setText(this.formatSigned(step));
        }
        this.writeValue(param.init_value ?? this.min, false);
        this.node.getComponent(Layout).updateLayout();
    }

    private onSubHoldStart(): void {
        this.beginHold(-1, false);
    }

    private onAddHoldStart(): void {
        this.beginHold(1, true);
    }

    private onClickQuickSub(): void {
        if (this.quickStep <= 0) {
            return;
        }
        this.writeValue(this.value - this.quickStep, true);
    }

    private onClickQuickAdd(): void {
        if (this.quickStep <= 0) {
            return;
        }
        this.writeValue(this.value + this.quickStep, true);
    }

    private onClickMin(): void {
        this.writeValue(this.min, true);
    }

    private onClickMax(): void {
        this.writeValue(this.max, true);
    }

    private onEditBegan(): void {
        if (!this.param) {
            return;
        }
        this.stopHold();
        this.editing = true;
        this.refreshVisual();
        this.syncing = true;
        this.editBox.string = `${this.value}`;
        this.syncing = false;
    }

    private onTextChanged(): void {
        if (this.syncing || !this.editing || !this.param) {
            return;
        }
        const text = this.editBox.string;
        this.writeValue(parseCount(text), true);
        // 纯数字先留着，方便继续输入。结束编辑时再收成范围内的整数。
        if (text !== '' && text !== '-' && !/^-?\d+$/.test(text)) {
            this.syncing = true;
            this.editBox.string = `${this.value}`;
            this.syncing = false;
        }
    }

    private onEditEnded(): void {
        if (!this.param) {
            return;
        }
        const next = parseCount(this.editBox.string);
        this.editing = false;
        this.writeValue(next, true);
    }

    private beginHold(step: number, tipAtMax: boolean): void {
        this.stopHold();
        this.holdStep = step;
        this.holdTip = tipAtMax;
        this.tippedThisHold = false;
        this.applyHoldStep();
        this.schedule(this.holdTick, HOLD_INTERVAL);
    }

    private stopHold(): void {
        this.unschedule(this.holdTick);
    }

    private applyHoldStep(): void {
        if (!this.param) {
            return;
        }
        if (this.holdTip && this.value >= this.max && !this.tippedThisHold) {
            this.tippedThisHold = true;
            UIMananger.instance.showFlyNotice(lang(220));
        }
        this.writeValue(this.value + this.holdStep, true);
    }

    private writeValue(raw: number, notify: boolean): void {
        const param = this.param;
        if (!param) {
            return;
        }
        const before = this.value;
        const value = clampInt(raw, this.min, this.max);
        this.value = value;
        this.refreshVisual();
        if (notify && value !== before) {
            param.on_value_changed?.(value);
        }
    }

    private refreshVisual(): void {
        if (this.editing) {
            this.valueLabel.node.active = false;
            this.textLabel.color = new Color(255, 255, 255, 255);
            return;
        }
        this.valueLabel.node.active = true;
        this.valueLabel.setText(this.formatDisplay());
        this.textLabel.color = new Color(255, 255, 255, 0);
        const raw = `${this.value}`;
        if (this.editBox.string !== raw) {
            this.syncing = true;
            this.editBox.string = raw;
            this.syncing = false;
        }
    }

    private formatDisplay(): string {
        const cur = this.formatCount(this.value);
        if (!this.param.show_range) {
            return cur;
        }
        return `${cur}/${this.formatCount(this.max)}`;
    }

    private formatCount(value: number): string {
        if (this.param.not_format_big) {
            return `${Math.round(value)}`;
        }
        return Tools.getNumberShow(value);
    }

    private formatSigned(value: number): string {
        const negative = value < 0;
        const abs = Math.abs(value);
        const body = this.param.not_format_big ? `${abs}` : Tools.getNumberShow(abs);
        return `${negative ? '-' : '+'}${body}`;
    }
}

function clampInt(value: number, min: number, max: number): number {
    const rounded = Math.round(value);
    return Math.min(max, Math.max(min, rounded));
}

function parseCount(text: string): number {
    if (!/^-?\d+$/.test(text)) {
        return 0;
    }
    return Number(text);
}
