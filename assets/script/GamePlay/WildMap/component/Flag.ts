import { _decorator, Component, Node } from 'cc';
import { BaseComp } from '../../../Component/BaseComp';
import { AnimationCom } from '../../../Component/AnimationCom';
import { comp } from '../../../Common/Decorator';
import { GameUrl } from '../../../Common/GameUrl';
const { ccclass, property } = _decorator;

@ccclass('Flag')
export class Flag extends BaseComp {
    @comp(AnimationCom)
    animation: AnimationCom = null!;
    public SetData(race: number) {
        this.animation.aniImg.setSpriteFromSingle(GameUrl.Wild_Image.format(`flag${race}`));
    }
}


