import { _decorator, Component, Node } from 'cc';
import { BaseComp } from './BaseComp';
const { ccclass, property } = _decorator;

@ccclass('BaseRenderCell')
export class BaseRenderCell<T = any> extends BaseComp {
    protected _data: T;
    protected _isSelected: boolean = false;




    setData(data: T): void {
        this._data = data;
        if (this.isInitComponent) {
            this.CheckAndRegister();
            this.onDataUpdated();
        }
    }

    getData(): T {
        return this._data;
    }

    setSelected(selected: boolean): void {
        this._isSelected = selected;
        this.onSelectionChanged();
    }

    isSelected(): boolean {
        return this._isSelected;
    }
    public initEvent(): void {
        super.initEvent();
        this.onDataUpdated();
    }
    protected onDataUpdated(): void {
        // 子类可以覆盖这个方法

    }

    protected onSelectionChanged(): void {
        // 子类可以覆盖这个方法来处理选中状态变化
    }
}


