import { _decorator, Component, Node, UITransform } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { IMapObject, MapResourceType } from './MapConfig';
import { AnimationCom } from '../../Component/AnimationCom';
import { comp } from '../../Common/Decorator';
import { GameUrl } from '../../Common/GameUrl';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { MapMgr } from './MapMgr';
import { Tools } from '../../Common/Tools';
import { EventManager } from '../../Common/EventManager';
import { GameEvent } from '../../Common/GameEnum';
const { ccclass, property } = _decorator;

@ccclass('MapObject')
export class MapObject extends BaseComp {

    @comp(AnimationCom)
    animation: AnimationCom = null!;

    @comp(BaseBtn)
    touchArea: BaseBtn = null!;
    protected m_data: IMapObject;

    start() {
        super.start();
    }

    public SetData(data: IMapObject) {
        this.m_data = data;

        this.OnCheckRefreshUI();
    }
    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.touchArea.node, Node.EventType.TOUCH_END, this.OnTouchObj)
    }
    public OnRefreshUI(): void {
        this.animation.stop();

        if (this.m_data.resourceType == MapResourceType.ANIMATION) {
            this.animation.loadFramesFromAtlas(this.m_data.resourcePath, "").then(() => {
                this.animation.gotoAndStop(0);
                //拿第一帧高度调整位置
                this.animation.node.setPosition(this.m_data.offsetX, this.m_data.offsetY - this.animation.aniImg.spriteFrame.rect.height * 0.5);
                this.animation.play();
            })
        } else {
            this.animation.aniImg.setSpriteFromSingle(Tools.removeFileExtension(this.m_data.resourcePath));
            this.animation.node.setPosition(this.m_data.offsetX, this.m_data.offsetY);

        }

        // this.touchArea.node.setPosition(this.m_data.offsetX, this.m_data.offsetY, 0);
        var mapCfg = MapMgr.getInstance().getMapCfg();
        this.touchArea.getComponent(UITransform).setContentSize(mapCfg.GetGridWidthPx() * this.m_data.occupyX, mapCfg.GetGridHeightPx() * this.m_data.occupyY)
    }
    OnTouchObj() {
        console.log(`点击了${this.m_data}`);
        EventManager.Instance.dispatch(GameEvent.MapObject_Touch,this.m_data)
    }
    clear() {
        super.clear();
        this.animation.releaseFrames();
    }

}


