import { _decorator, Component, Node } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
const { ccclass, property } = _decorator;

@ccclass('BattleDamageTxt')
export class BattleDamageTxt extends BaseComp {
    public lb_damage: BaseLabel;
    protected onLoad(): void {
        this.lb_damage = this.getComponent(BaseLabel);
    }
    showText(content: string) {
        this.lb_damage.string = content;
    }
}


