import { _decorator, Component, Node } from 'cc';
import { Tools } from '../Common/Tools';
import { EventManager } from '../Common/EventManager';
import { EventData } from '../Common/BaseMgr';
const { ccclass, property } = _decorator;

@ccclass('BaseComp')
export class BaseComp extends Component {
    protected events: EventData[] = []
    protected isInitEvent: boolean;
    protected isInit: boolean;
    start() {
        this.isInit = true;
    }
    public initEvent() {
        this.isInitEvent = true;
    }
    public CheckAndRegister() {
        if (!this.isInitEvent) {
            this.initEvent();
        }
        this.eventRegister();
    }
    protected onDestroy(): void {
        this.unRegisterEvent();

    }
    public eventRegister() {
        if (this.events) {
            this.events.forEach(event => {
                EventManager.Instance.addListener(event.eventName, event.call, event.callThm)
            })
        }
    }
    public unRegisterEvent() {
        if (this.events) {
            this.events.forEach(event => {
                EventManager.Instance.removeListener(event.eventName, event.call, event.callThm)
            })
        }
        this.isInitEvent = false;
    }
    protected addEvent(eventName: string, call: Function, thm: any) {
        Tools.insertArr(this.events, { eventName: eventName, call: call, callThm: thm })
    }





}


