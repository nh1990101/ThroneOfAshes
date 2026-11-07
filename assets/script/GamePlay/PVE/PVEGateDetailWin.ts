import { _decorator, Component, Node, NodeEventType } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { comp } from '../../Common/Decorator';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { ScrollList } from '../../Component/BaseComp/ScrollList';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { IChapterData } from '../../Config/Typings/ChapterData';
import { lang } from '../../Common/LangMgr';
import { GameUrl } from '../../Common/GameUrl';
import { GlobalData } from '../../Common/GlobalData';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { ConfigTools } from '../../Config/ConfigTools';
import { PVEMgr } from './PVEMgr';
import { ItemIconComp } from '../../Component/ItemIconComp';
import { UnitShowCell } from '../WildMap/Windows/UnitShowCell';
import { MonsterHeadCell } from './component/MonsterHeadCell';
import { UIMananger } from '../../Component/UIMananger';
import { WildMapWin } from '../WildMap/WildMapWin';
import { FightPrepareWin } from './FightPrepareWin';
const { ccclass, property } = _decorator;

@ccclass('PVEGateDetailWin')
export class PVEGateDetailWin extends BaseWin {
    @comp(BaseSprite)
    mask: BaseSprite = null!;

    @comp(BaseBtn)
    btn_left: BaseBtn = null!;

    @comp(BaseBtn)
    btn_right: BaseBtn = null!;

    @comp(ScrollList)
    listReward: ScrollList = null!;

    @comp(ScrollList)
    listMonsters: ScrollList = null!;

    @comp(BaseBtn)
    btnFight: BaseBtn = null!;

    @comp(BaseLabel)
    title_text: BaseLabel = null!;

    @comp(BaseSprite)
    img_orderBg: BaseSprite = null!;

    @comp(BaseLabel)
    lb_state: BaseLabel = null!;

    @comp(BaseLabel)
    lb_chapterOrder: BaseLabel = null!;

    private _curOrder: number;
    private maxOrder: number;

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.mask.node, NodeEventType.TOUCH_END, this.closeWin);
        this.addNodeEvent(this.btn_left.node, NodeEventType.TOUCH_END, this.onClickLeft);
        this.addNodeEvent(this.btn_right.node, NodeEventType.TOUCH_END, this.onClickRight);
        this.addNodeEvent(this.btnFight.node, NodeEventType.TOUCH_END, this.onClickFight);
    }
    public OnRefreshUI(): void {
        super.OnRefreshUI();
        var winData: IChapterData = this._winData;
        if (winData) {
            this.maxOrder = this.Mgr.GetMaxOrderByChapter(winData.id);
            this.title_text.string = lang(winData.chapter_title, { id: winData.id });
            this.img_orderBg.setSpriteFromSingle(GameUrl.PVE_SingleImage_Url.format(`orderBg${winData.id}`));
            if (GlobalData.wildData.chapter == winData.id) {
                var nextGate = PVEMgr.getInstance().getNextGate();
                this._curOrder = nextGate[1];
            } else {
                this._curOrder = 1;
            }
            this.updatePage();

        }
    }
    updatePage() {
        var winData: IChapterData = this._winData;
        if (winData) {
            var stageCfg = this.Mgr.getStageCfgByChapter(winData.id, this._curOrder);
            if (stageCfg) {
                this.lb_chapterOrder.string = lang(stageCfg.name);//lang(85, { chapter: `${winData.id}-${this._curOrder}` });
                this.lb_state.node.active = this.Mgr.CheckHasFinish(winData.id, this._curOrder);
                var arrRewards = ConfigTools.instance.getRewardListByItemIds(stageCfg.reward_pre);
                this.listReward.updateList(arrRewards, ItemIconComp);
                var arrUnits = ConfigTools.instance.getUnitDatasByIds(stageCfg.monster_pre);
                if (arrUnits) {
                    this.listMonsters.updateList(arrUnits, MonsterHeadCell);
                }
            }
        }
    }
    public get Mgr() {
        return PVEMgr.getInstance();
    }
    onClickLeft() {
        this._curOrder--;
        if (this._curOrder < 1) {
            this._curOrder = 1;
        } else {
            this.updatePage();
        }
    }
    onClickRight() {
        this._curOrder++;
        if (this._curOrder > this.maxOrder) {
            this._curOrder = this.maxOrder;
        } else {
            this.updatePage();
        }
    }
    onClickFight() {
        var winData: IChapterData = this._winData;
        if (winData) {
            var isCanFight = this.Mgr.CheckIsCanFight(winData.id, this._curOrder)
            if (isCanFight) {
                var mapData = ConfigTools.instance.getStageMapDataByChapterAndOrder(winData.id, this._curOrder);
                if (mapData) {
                    var orderCfg = PVEMgr.getInstance().getStageCfgByChapter(winData.id, this._curOrder);
                    PVEMgr.getInstance().curStage = orderCfg;
                    this.closeWin();
                    UIMananger.instance.showWin(FightPrepareWin);
                }
            } else {
                UIMananger.instance.showFlyNotice(lang(84));
            }
        }
    }
}


