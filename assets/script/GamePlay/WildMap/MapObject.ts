import { _decorator, Component, Node } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { IMapObject } from './MapConfig';
const { ccclass, property } = _decorator;

@ccclass('MapObject')
export class MapObject extends BaseComp {
    protected m_data: IMapObject;

    public SetData(data: IMapObject) {
        this.m_data = data;
        if (this.isInitComponent) {
            this.CheckAndRegister();
            this.onDataUpdated();
        }
    }
    public initEvent(): void {
        super.initEvent();
        this.onDataUpdated();
    }
    protected onDataUpdated(): void {
        // 子类可以覆盖这个方法
        
    }
}


