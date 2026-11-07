import { _decorator, Layout, Mask, Node, Slider, Sprite, UITransform, Widget } from 'cc';
import { comp } from '../Common/Decorator';
import { BaseComp } from './BaseComp';
import { BaseBtn } from './BaseComp/BaseBtn';
import { BaseLabel } from './BaseComp/BaseLabel';
import { BaseSprite } from './BaseComp/BaseSprite';
const { ccclass } = _decorator;

const EPS = 1e-6;

/** 步长对齐。can_min / can_max 为真时，允许停在不是步长倍数的下限或上限 */
export interface SliderValueStep {
    step: number;
    can_max?: boolean;
    can_min?: boolean;
}

/**
 * 滑动条这一次的范围。
 * min_value、max_value 是滑条两端。limit 是当前允许停住的区间，默认和两端重合。
 */
export interface SliderInputParam {
    min_value: number;
    max_value: number;
    limit_min_value?: number;
    limit_max_value?: number;
    /** 加减按钮一步的数值。不传则不显示加减按钮 */
    btn_step?: number;
    value_step?: SliderValueStep;
    init_value?: number;
    /** 初始值不按步长对齐 */
    init_ignore_value_step?: boolean;
    /** 数值变化后的当前值和变化前的值。setSlider 的初始赋值不触发 */
    on_value_changed?: (cur: number, before: number) => void;
}

/** 挂在 slider_input 上。减号 SubBtn，加号 AddBtn，滑条 Slider，填充 Fill，滑块 Handle，文字在 silder_text/text */
@ccclass('SliderInputComp')
export class SliderInputComp extends BaseComp {

    @comp(Slider, 'Slider')
    slider: Slider = null!;

    @comp(BaseBtn, 'SubBtn')
    subBtn: BaseBtn = null!;

    @comp(BaseBtn, 'AddBtn')
    addBtn: BaseBtn = null!;

    @comp(BaseLabel, 'text')
    valueLabel: BaseLabel = null!;

    @comp(BaseSprite, 'Slider')
    barSprite: BaseSprite = null!;

    @comp(BaseSprite, 'Fill')
    fillSprite: BaseSprite = null!;

    @comp(BaseSprite, 'Handle')
    handleSprite: BaseSprite = null!;

    @comp(BaseSprite, 'SubBtn')
    subSprite: BaseSprite = null!;

    @comp(BaseSprite, 'AddBtn')
    addSprite: BaseSprite = null!;

    @comp(Mask)
    maskFill: Mask = null!;


    private param: SliderInputParam | null = null;
    private value = 0;
    private minValue = 0;
    private maxValue = 0;
    private minLimit = 0;
    private maxLimit = 0;
    private interactable = true;
    private pending = false;
    private syncing = false;
    private fillLong: number;
    public initEvent(): void {
        // this.fillSprite.type = Sprite.Type.FILLED;
        // this.fillSprite.fillType = Sprite.FillType.HORIZONTAL;
        // this.fillSprite.fillStart = 0;
        this.initMaskFill();
        super.initEvent();
        this.addNodeEvent(this.slider.node, 'slide', this.onSlide);
        this.addNodeEvent(this.subBtn.node, Node.EventType.TOUCH_END, this.onClickSub);
        this.addNodeEvent(this.addBtn.node, Node.EventType.TOUCH_END, this.onClickAdd);

    }

    /** 设置范围、步长和初始值。初始赋值不触发 on_value_changed，并恢复为可操作 */
    public setSlider(param: SliderInputParam): void {
        this.param = param;
        this.interactable = true;
        this.pending = true;
        this.OnCheckRefreshUI();
    }
    public getParam() {
        return this.param;
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

    public setValue(value: number, ignoreValueStep = false): void {
        if (!this.param || !this.isInitComponent) {
            return;
        }
        this.writeValue(value, ignoreValueStep, true);
    }

    public setValueDiff(diff: number): void {
        if (!this.param || !this.isInitComponent) {
            return;
        }
        this.writeValue(this.value + diff, false, true, diff);
    }

    public setMinValue(min: number): void {
        if (!this.param || !this.isInitComponent) {
            return;
        }
        this.minValue = min;
        if (this.maxValue < this.minValue) {
            this.maxValue = this.minValue;
        }
        this.minLimit = clamp(this.param.limit_min_value ?? min, this.minValue, this.maxValue);
        this.writeValue(this.value, false, true);
    }

    public setMaxValue(max: number): void {
        if (!this.param || !this.isInitComponent) {
            return;
        }
        this.maxValue = max;
        if (this.maxValue < this.minValue) {
            this.maxValue = this.minValue;
        }
        this.maxLimit = clamp(this.param.limit_max_value ?? this.maxValue, this.minValue, this.maxValue);
        this.writeValue(this.value, false, true);
    }

    public setMinLimit(min: number): void {
        if (!this.param || !this.isInitComponent) {
            return;
        }
        this.minLimit = clamp(min, this.minValue, this.maxValue);
        this.writeValue(this.value, false, true);
    }

    public setMaxLimit(max: number): void {
        if (!this.param || !this.isInitComponent) {
            return;
        }
        this.maxLimit = clamp(max, this.minValue, this.maxValue);
        this.writeValue(this.value, false, true);
    }

    public setInteractable(on: boolean): void {
        this.interactable = on;
        if (!this.isInitComponent) {
            return;
        }
        this.refreshBtnState();
    }

    private applyParam(): void {
        const param = this.param;
        this.assertStep(param.value_step);
        this.minValue = param.min_value;
        this.maxValue = param.max_value;
        if (this.maxValue < this.minValue) {
            this.maxValue = this.minValue;
        }
        this.minLimit = clamp(param.limit_min_value ?? this.minValue, this.minValue, this.maxValue);
        this.maxLimit = clamp(param.limit_max_value ?? this.maxValue, this.minValue, this.maxValue);
        const showBtn = param.btn_step != null;
        this.subBtn.node.active = showBtn;
        this.addBtn.node.active = showBtn;
        this.writeValue(param.init_value ?? this.minValue, !!param.init_ignore_value_step, false);
        this.node.getComponent(Layout)?.updateLayout();
    }

    private onSlide(): void {
        if (this.syncing || !this.param) {
            return;
        }
        this.writeValue(this.progressToValue(this.slider.progress), false, true);
    }

    private onClickSub(): void {
        const step = this.param?.btn_step;
        if (step == null) {
            return;
        }
        this.setValueDiff(-step);
    }

    private onClickAdd(): void {
        const step = this.param?.btn_step;
        if (step == null) {
            return;
        }
        this.setValueDiff(step);
    }

    /** diff 有值时按加减方向取整：减小向上，增大向下 */
    private writeValue(raw: number, ignoreStep: boolean, notify: boolean, diff?: number): void {
        const param = this.param;
        this.assertStep(param.value_step);
        const before = this.value;
        let value = clamp(raw, this.minLimit, this.maxLimit);
        const stepInfo = param.value_step;
        if (stepInfo && !ignoreStep) {
            const keepMin = near(value, this.minLimit) && stepInfo.can_min;
            const keepMax = near(value, this.maxLimit) && stepInfo.can_max;
            if (keepMin) {
                value = this.minLimit;
            } else if (keepMax) {
                value = this.maxLimit;
            } else if (diff != null && diff < 0) {
                value = ceilStep(value, stepInfo.step);
            } else if (diff != null) {
                value = floorStep(value, stepInfo.step);
            } else {
                value = roundStep(value, stepInfo.step);
            }
            if (!keepMin && !keepMax) {
                value = clamp(value, this.getStepMin(), this.getStepMax());
            }
        }
        this.value = value;
        this.syncVisual();
        if (notify && !near(value, before)) {
            param.on_value_changed?.(value, before);
        }
    }

    /**
     * maskFill 上挂着 LEFT|RIGHT 拉伸的 Widget，它会在启动后的第一次 refreshScene 里
     * 把宽度强行拉回满宽，覆盖掉 syncVisual 写入的值（所以只有第一次不生效），
     * 窗口尺寸变化时还会再覆盖一次。这里先手动对齐拿到真实满宽，再停用 Widget，
     * 之后宽度完全由 syncVisual 控制。
     */
    private initMaskFill(): void {
        const maskTrans = this.maskFill.getComponent(UITransform);
        const widget = this.maskFill.getComponent(Widget);
        if (widget && widget.enabled) {
            widget.updateAlignment();
            widget.enabled = false;
        }
        const width = maskTrans.width;
        this.fillLong = width > 0 ? width : 0;
    }

    private syncVisual(): void {
        const progress = this.valueToProgress(this.value);
        if (Math.abs(this.slider.progress - progress) > EPS) {
            this.syncing = true;
            this.slider.progress = progress;
            this.syncing = false;
        }
        // 兜底：initMaskFill 没拿到宽度（节点被重新激活、尺寸这时才有效）时再取一次
        if (!(this.fillLong > 0)) {
            const width = this.maskFill.getComponent(UITransform).width;
            if (width > 0) {
                this.fillLong = width;
            }
        }
        if (this.fillLong > 0) {
            this.maskFill.getComponent(UITransform).width = progress * this.fillLong;
        }
        // this.fillSprite.fillRange = progress;
        this.valueLabel.setText(`${formatNum(this.value)}/${formatNum(this.maxValue)}`);
        this.refreshBtnState();
    }

    private refreshBtnState(): void {
        const atMin = this.value <= this.getStepMin() + EPS;
        const atMax = this.value >= this.getStepMax() - EPS;
        const canSub = this.interactable && !atMin;
        const canAdd = this.interactable && !atMax;
        this.subBtn.interactable = canSub;
        this.addBtn.interactable = canAdd;
        this.subSprite.grayscale = !canSub;
        this.addSprite.grayscale = !canAdd;
        const barGray = !this.interactable;
        this.barSprite.grayscale = barGray;
        this.fillSprite.grayscale = barGray;
        this.handleSprite.grayscale = barGray;
        if (this.slider.enabled !== this.interactable) {
            this.slider.enabled = this.interactable;
        }
    }

    private getStepMin(): number {
        const stepInfo = this.param?.value_step;
        if (!stepInfo || stepInfo.can_min) {
            return this.minLimit;
        }
        return ceilStep(this.minLimit, stepInfo.step);
    }

    private getStepMax(): number {
        const stepInfo = this.param?.value_step;
        if (!stepInfo || stepInfo.can_max) {
            return this.maxLimit;
        }
        return floorStep(this.maxLimit, stepInfo.step);
    }

    private valueToProgress(value: number): number {
        const span = this.maxValue - this.minValue;
        if (span <= 0) {
            return 1;
        }
        return clamp((value - this.minValue) / span, 0, 1);
    }

    private progressToValue(progress: number): number {
        const span = this.maxValue - this.minValue;
        if (span <= 0) {
            return this.minValue;
        }
        return this.minValue + progress * span;
    }

    private assertStep(stepInfo: SliderValueStep | undefined): void {
        if (stepInfo && stepInfo.step <= 0) {
            throw new Error(`滑动条步长必须大于 0：${stepInfo.step}`);
        }
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function near(a: number, b: number): boolean {
    return Math.abs(a - b) <= EPS;
}

function floorStep(value: number, step: number): number {
    return Math.floor(value / step + 1e-8) * step;
}

function ceilStep(value: number, step: number): number {
    return Math.ceil(value / step - 1e-8) * step;
}

function roundStep(value: number, step: number): number {
    const scaled = value / step;
    const i = Math.trunc(scaled);
    const f = scaled - i;
    if (f >= 0.5) {
        return (i + 1) * step;
    }
    if (f <= -0.5) {
        return (i - 1) * step;
    }
    return i * step;
}

function formatNum(value: number): string {
    const rounded = Math.round(value);
    if (Math.abs(value - rounded) < 1e-4) {
        return `${rounded}`;
    }
    return `${Math.round(value * 1000) / 1000}`;
}
