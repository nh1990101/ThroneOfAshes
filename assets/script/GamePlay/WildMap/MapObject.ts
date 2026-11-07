import { _decorator, Component, math, Node, UITransform, v2, Vec2 } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { MapResourceType } from './MapConfig';
import { AnimationCom } from '../../Component/AnimationCom';
import { comp } from '../../Common/Decorator';
import { GameUrl } from '../../Common/GameUrl';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { MapMgr } from './MapMgr';
import { Tools } from '../../Common/Tools';
import { EventManager } from '../../Common/EventManager';
import { GameEvent } from '../../Common/GameEnum';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { IAutoTriggerData } from '../../Config/Typings/AutoTriggerData';
import { Flag } from './component/Flag';
import { AssetMgr } from '../../Common/AssetMgr';
import { MapObjUserData } from './Data/MapObjUserData';
const { ccclass, property } = _decorator;

@ccclass('MapObject')
export class MapObject extends BaseComp {

    @comp(AnimationCom)
    animation: AnimationCom = null!;

    @comp(BaseBtn)
    touchArea: BaseBtn = null!;

    protected m_data: MapObjUserData;

    protected flag: Flag;

    protected m_showSize: math.Size;
    start() {
        super.start();
    }

    public SetData(data: MapObjUserData) {
        this.m_data = data;

        this.OnCheckRefreshUI();
    }
    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.touchArea.node, Node.EventType.TOUCH_END, this.OnTouchObj)
    }
    public OnRefreshUI(): void {
        this.animation.stop();
        var cfg = this.m_data.cfg;
        if (this.m_data.cfg.resourceType == MapResourceType.ANIMATION) {
            this.animation.loadFramesFromAtlas(cfg.resourcePath, "").then(() => {
                this.animation.gotoAndStop(0);
                //拿第一帧高度调整位置
                this.animation.node.setPosition(cfg.offsetX, cfg.offsetY - this.animation.aniImg.spriteFrame.rect.height * 0.5);
                this.animation.setFrameRate(5);
                this.animation.play();
                this.animation.SetFlipX(cfg.flipX);
            })
        } else {
            this.animation.aniImg.setSpriteFromSingle(Tools.removeFileExtension(cfg.resourcePath));
            this.animation.node.setPosition(cfg.offsetX, cfg.offsetY);
            this.animation.SetFlipX(cfg.flipX);
        }

        // this.touchArea.node.setPosition(this.m_data.offsetX, this.m_data.offsetY, 0);
        var mapCfg = MapMgr.getInstance().getMapCfg();
        var touchSize = this.touchArea.getComponent(UITransform);
        touchSize.setContentSize(mapCfg.GetGridWidthPx() * cfg.occupyX, mapCfg.GetGridHeightPx() * cfg.occupyY);
        this.updateUISize();
        this.OccupyShow();
    }
    OnTouchObj() {
        console.log(`点击了${this.m_data}`);
        EventManager.Instance.dispatch(GameEvent.MapObject_Touch, this.m_data)
    }
    clear() {
        super.clear();
        this.animation.releaseFrames();
        this.SetShowTouchArea(false);
        this.ClearFlag();
        // this.animation.SetFlipX(false);
    }
    public SetShowTouchArea(bolShow: boolean) {
        var touchSprite = this.touchArea.getComponent(BaseSprite)
        if (touchSprite) {
            touchSprite.enabled = bolShow;
        }
    }
    public getUISize() {
        if (!this.m_showSize) {
            this.updateUISize();
        }
        return this.m_showSize;
    }
    updateUISize() {
        var mapCfg = MapMgr.getInstance().getMapCfg();
        if (!this.m_showSize) {
            this.m_showSize = new math.Size()
        }
        if (this.m_data && this.m_data.cfg) {
            var cfg = this.m_data.cfg;
            this.m_showSize.set(mapCfg.GetGridWidthPx() * cfg.occupyX, mapCfg.GetGridHeightPx() * cfg.occupyY)
        }
    }
    /**被占领的显示设置 */
    public async OccupyShow() {
        if (this.m_data.ownPlayerId && this.m_data.OccupyRace) {
            if (!this.flag) {
                this.flag = await AssetMgr.createPrefabFromPool(GameUrl.WildMapPrefab.format("Flag"), Vec2.ZERO, this.node, Flag);
            }
            this.flag.SetData(this.m_data.OccupyRace);
            var mapResCfg = ConfigMgr.instance.MapResourcesData.get(this.m_data.cfg.id);
            if (mapResCfg && mapResCfg.flag_pos) {
                var pos = mapResCfg.flag_pos
                this.flag.node.setPosition(pos[0], pos[1]);
            }
        } else {
            this.ClearFlag();
        }
    }
    public ClearFlag() {
        if (this.flag) {
            AssetMgr.removeNode(this.flag.node);
        }
        this.flag = null;
    }
    public GetData() {
        return this.m_data;
    }
}


