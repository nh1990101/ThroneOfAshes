import { _decorator, Component, Node } from 'cc';
import { BaseSprite } from '../../../Component/BaseComp/BaseSprite';
import { BaseRenderCell } from '../../../Component/BaseRenderCell';
import { IStageData } from '../../../Config/Typings/StageData';
import { BaseLabel } from '../../../Component/BaseComp/BaseLabel';
import { comp } from '../../../Common/Decorator';
import { lang } from '../../../Common/LangMgr';
import { IChapterData } from '../../../Config/Typings/ChapterData';
import { GlobalData } from '../../../Common/GlobalData';
import { ConfigMgr } from '../../../Config/ConfigMgr';
import { GameUrl } from '../../../Common/GameUrl';
import { UIMananger } from '../../../Component/UIMananger';
import { PVEGateDetailWin } from '../../PVE/PVEGateDetailWin';
import { PVEMgr } from '../../PVE/PVEMgr';
const { ccclass, property } = _decorator;

@ccclass('GateCell')
export class GateCell extends BaseRenderCell<IChapterData> {
    @comp(BaseLabel)
    lb_gateName: BaseLabel = null!;

    @comp(BaseLabel)
    lb_pro: BaseLabel = null!;

    @comp(BaseLabel)
    lb_lock: BaseLabel = null!;

    @comp(BaseSprite)
    lock: BaseSprite = null!;

    @comp(BaseSprite)
    gateBg: BaseSprite = null!;
    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.node, Node.EventType.TOUCH_END, this.onClickThis);
    }
    public OnRefreshUI(): void {
        super.OnRefreshUI();
        var data = this.getData();
        this.lb_gateName.string = lang(data.chapter_title, { id: data.id });
        var passChapter = GlobalData.wildData.chapter;
        var passOrder = GlobalData.wildData.copyIndex;
        var isSelect = false;
        if (passChapter >= data.id) {
            var num = Object.keys(ConfigMgr.instance.StageDataIndex.StageDataChapters[data.id] ?? {}).length;
            this.lb_pro.node.active = true;
            this.lb_pro.string = `${passOrder}/${num}`;
            this.lock.node.active = false;
            this.gateBg.grayscale = false;
            this.lb_lock.node.active = false;
            isSelect = passChapter == data.id;
            // this.gateBg.setStoken(passChapter == data.id);
        } else {
            this.lb_lock.node.active = true;
            this.lock.node.active = true;
            this.lb_pro.node.active = false;
            this.gateBg.grayscale = true;
            // this.gateBg.setStoken(false);
            // this.
        }
        var url = "gate1" + (isSelect ? "_select" : "");
        this.gateBg.setSpriteFromSingle(GameUrl.PVE_SingleImage_Url.format(url));
    }
    onClickThis() {
        var data = this.getData();
        var isCanFight = PVEMgr.getInstance().CheckIsCanFight(data.id, 1);
        if (isCanFight) {

            UIMananger.instance.showWin(PVEGateDetailWin, this.getData());
        } else {
            UIMananger.instance.showFlyNotice(lang(84));
        }
    }
}


