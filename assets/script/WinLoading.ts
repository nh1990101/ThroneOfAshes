import { _decorator, Component, Node, Sprite } from 'cc';
import { comp } from '../script/Common/Decorator';
const { ccclass, property } = _decorator;

@ccclass('WinLoading')
export class WinLoading extends Component {
    @property(Sprite)
    loadingIcon: Sprite = null!;



    update(deltaTime: number) {
        this.loadingIcon.node.angle += deltaTime * 300;
    }
}


