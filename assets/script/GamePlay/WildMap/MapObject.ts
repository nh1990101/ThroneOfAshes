import { _decorator, Component, Node, UITransform } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { IMapObject, MapResourceType } from './MapConfig';
import { AnimationCom } from '../../Component/AnimationCom';
import { comp } from '../../Common/Decorator';
import { GameUrl } from '../../Common/GameUrl';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { MapMgr } from './MapMgr';
const { ccclass, property } = _decorator;

@ccclass('MapObject')
export class MapObject extends BaseComp {
    protected m_data: IMapObject;

    @comp(AnimationCom)
    animation: AnimationCom = null!;
    @comp(BaseBtn)
    touchArea: BaseBtn = null!;


    public SetData(data: IMapObject) {
        this.m_data = data;
        this.animation.stop();
        this.OnCheckRefreshUI();
    }
    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.touchArea.node, Node.EventType.TOUCH_END, this.OnTouchObj)
    }
    public OnRefreshUI(): void {
        if (this.m_data.resourceType == MapResourceType.ANIMATION) {
            this.animation.loadFramesFromAtlas(this.m_data.resourcePath, "").then(() => {
                this.animation.play();
            })
        } else {
            this.animation.aniImg.setSpriteFromSingle(this.m_data.resourcePath);
        }

        this.touchArea.node.setPosition(this.m_data.offsetX, this.m_data.offsetY, 0);
        var mapCfg = MapMgr.getInstance().getMapCfg();
        this.touchArea.getComponent(UITransform).setContentSize(mapCfg.GetGridWidthPx() * this.m_data.occupyX, mapCfg.GetGridHeightPx() * this.m_data.occupyY)
    }
    OnTouchObj() {
        console.log(`点击了${this.m_data}`)
    }
    clear() {
        super.clear();
        this.animation.releaseFrames();
    }

}


