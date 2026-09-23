import { _decorator, Component, Node } from 'cc';
import { EventManager } from './EventManager';
import { Tools } from './Tools';
const { ccclass, property } = _decorator;

export interface EventData {
    call: Function;
    callThm: any;
    eventName: string;
}
export class BaseMgr {
    private static _instances = new Map<Function, BaseMgr>();

    public constructor() {
        const cls = this.constructor;
        if (BaseMgr._instances.has(cls)) {
            throw new Error(`${cls.name} 已存在实例`);
        }
        BaseMgr._instances.set(cls, this);
    }

    public static getInstance<T extends BaseMgr>(this: new () => T): T {
        if (!BaseMgr._instances.has(this)) {
            BaseMgr._instances.set(this, new this());

        }
        return BaseMgr._instances.get(this) as T;
    }
    protected events: EventData[] = []

    /**
     * 注册协议事件逻辑
     */
    public initEvent() {

    }

    public eventRegistor() {
        this.initEvent()
        if (this.events) {
            this.events.forEach(event => {
                EventManager.Instance.addListener(event.eventName, event.call, event.callThm)
            })
        }
    }
    public unRegistorEvent() {
        if (this.events) {
            this.events.forEach(event => {
                EventManager.Instance.removeListener(event.eventName, event.call, event.callThm)
            })
        }
    }
    protected addEvent(eventName: string, call: Function, thm: any) {
        Tools.insertArr(this.events, { eventName: eventName, call: call, callThm: thm })
    }
}


