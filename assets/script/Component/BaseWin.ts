import { _decorator, Component, Node, tween } from 'cc';
import { Tools } from '../Common/Tools';
import { EventManager } from '../Common/EventManager';
import { EventData } from '../Common/BaseMgr';
import { BaseComp } from './BaseComp';
const { ccclass, property } = _decorator;

@ccclass('BaseWin')
export class BaseWin extends BaseComp {

    @property()
    winBg: Node = null;


    protected animTime = 0.2

    RegisterUIEvent() {
        
    }

    showWin(...param) {
        this.node.active = true;
        Tools.setNodeTopLayer(this.node)
        // this.node.setSiblingIndex(this.node.parent.children.length - 1);
        if (this.winBg) {
            this.winBg.setScale(0.1, 0.1, 1);
            tween(this.winBg).to(this.animTime, { x: 1, y: 1, z: 1 }).start();
        }

        this.CheckAndRegister();
    }
    closeWin() {
        this.node.active = false;
        this.unRegisterEvent();
    }


}


