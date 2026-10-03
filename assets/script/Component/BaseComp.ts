import { _decorator, Component, Node, Button } from 'cc';
import { Tools } from '../Common/Tools';
import { EventManager } from '../Common/EventManager';
import { EventData } from '../Common/BaseMgr';
import { BaseBtn } from './BaseComp/BaseBtn';
const { ccclass, property } = _decorator;

interface NodeEventData {
    target: Node;
    eventType: string;
    callback: Function;
    thisArg: any;
}

@ccclass('BaseComp')
export class BaseComp extends Component {
    protected events: EventData[] = []
    protected nodeEvents: NodeEventData[] = []
    protected isInitEvent: boolean;
    protected isInit: boolean;
    protected isInitComponent: boolean;

    // protected onLoad(): void {

    // }
    start() {
        this.init();
        this.CheckAndRegister();
        this.isInitComponent = true;
    }
    /**
     * 实例化后执行，只执行一次
     */
    public init() {
        this.isInit = true;
    }
    /**
     * 节点加载完毕后，只执行一次
     */
    public initEvent() {
        this.isInitEvent = true;
        this.OnRefreshUI();
    }
    public CheckAndRegister() {
        if (!this.isInitEvent) {
            this.initEvent();
        }
        this.eventRegister();
    }
    protected onDestroy(): void {
        super.onDestroy();
        this.clear();

    }
    protected onDisable(): void {
        this.clear();
    }
    public clear() {
        this.unRegisterEvent();
    }
    protected onEnable(): void {
        //二次激活才会执行这里的逻辑（对象池拿出对象激活）
        if (this.isInitComponent) {
            this.CheckAndRegister();

        }
    }


    /**可操作UI节点更新界面 */
    public OnRefreshUI() {

    }
    /**需要外部手动调用更新*/
    public OnCheckRefreshUI() {
        if (this.isInitComponent) {
            this.OnRefreshUI();
        }
    }

    public eventRegister() {
        if (this.events) {
            this.events.forEach(event => {
                EventManager.Instance.addListener(event.eventName, event.call, event.callThm)
            })
        }
        if (this.nodeEvents) {
            this.nodeEvents.forEach(event => {
                if (event.target && event.target.isValid) {
                    event.target.on(event.eventType, event.callback, event.thisArg);
                }
            });
        }
    }
    public unRegisterEvent() {
        if (this.events) {
            this.events.forEach(event => {
                EventManager.Instance.removeListener(event.eventName, event.call, event.callThm)
            })
        }
        if (this.nodeEvents && this.nodeEvents.length > 0) {
            this.nodeEvents.forEach(event => {
                if (event.target && event.target.isValid) {
                    event.target.off(event.eventType, event.callback, event.thisArg);
                }
            });

        }
    }
    protected addEvent(eventName: string, call: Function, thm: any) {
        Tools.insertArr(this.events, { eventName: eventName, call: call, callThm: thm })
    }

    /**
     * 添加节点触摸事件（支持 TOUCH_START、TOUCH_MOVE、TOUCH_END、TOUCH_CANCEL 等）
     * 如果节点有 BaseBtn 组件且事件类型为 TOUCH_END，会自动转换为 Button.EventType.CLICK
     * @param target 目标节点
     * @param eventType 事件类型，如 Node.EventType.TOUCH_END
     * @param callback 回调函数
     * @param thisArg 回调上下文，默认为当前组件
     */
    protected addNodeEvent(target: Node, eventType: string, callback: Function, thisArg?: any) {
        const ctx = thisArg || this;

        // 检查节点是否有 BaseBtn 组件，如果有且事件类型为 TOUCH_END，则使用 Button.EventType.CLICK
        const baseBtn = target.getComponent(BaseBtn);
        let finalEventType = eventType;
        if (baseBtn && eventType === Node.EventType.TOUCH_END) {
            finalEventType = Button.EventType.CLICK;
        }

        const eventData = {
            target: target,
            eventType: finalEventType,
            callback: callback,
            thisArg: ctx
        };


        // 保存到列表，用于后续清理
        this.nodeEvents.push(eventData);
    }





}


