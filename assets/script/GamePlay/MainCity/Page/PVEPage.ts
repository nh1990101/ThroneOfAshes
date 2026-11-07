import { _decorator, Component, Event, Node } from 'cc';
import { BasePage } from '../../../Component/BasePage';
import { BaseLabel } from '../../../Component/BaseComp/BaseLabel';
import { GroupList } from '../../../Component/GroupList';
import { BaseSprite } from '../../../Component/BaseComp/BaseSprite';
import { comp } from '../../../Common/Decorator';
import { BaseBtn } from '../../../Component/BaseComp/BaseBtn';
import { RedPoint } from '../../../Component/RedPoint';
import { ConfigMgr } from '../../../Config/ConfigMgr';
import { IChapterData } from '../../../Config/Typings/ChapterData';
import { GateCell } from '../component/GateCell';
import { GameEvent } from '../../../Common/GameEnum';
import { lang } from '../../../Common/LangMgr';
import { GlobalData } from '../../../Common/GlobalData';
import { ConfigTools } from '../../../Config/ConfigTools';
import { PVEMgr } from '../../PVE/PVEMgr';
import { UIMananger } from '../../../Component/UIMananger';
import { TreasureBoxWin } from '../../TreasureBox/TreasureBoxWin';
import { WildMapWin } from '../../WildMap/WildMapWin';
import { IStageData } from '../../../Config/Typings/StageData';
import { FightPrepareWin } from '../../PVE/FightPrepareWin';
const { ccclass, property } = _decorator;

@ccclass('PVEPage')
export class PVEPage extends BasePage {
    @comp(BaseSprite)
    bg: BaseSprite = null!;

    @comp(GroupList)
    groupList: GroupList = null!;

    @comp(BaseLabel)
    lb_seasonName: BaseLabel = null!;

    @comp(BaseLabel)
    lb_seasonTime: BaseLabel = null!;

    @comp(BaseBtn)
    btn_fight: BaseBtn = null!;

    @comp(BaseBtn)
    btn_holdReward: BaseBtn = null!;

    @comp(RedPoint)
    red_holdReward: RedPoint = null!;

    @comp(RedPoint)
    red_treasureBox: RedPoint = null!;

    @comp(BaseBtn)
    btn_treasureBox: BaseBtn = null!;

    @comp(BaseBtn)
    btnRight: BaseBtn = null!;

    @comp(BaseBtn)
    btnLeft: BaseBtn = null!;
    @comp(BaseLabel)
    lb_curChapter: BaseLabel = null!;


    private _chapterDatas: IChapterData[];
    private _curPage = 0;
    private MaxPage: number;
    private nextOrderCfg: IStageData;
    public init(): void {
        super.init();
        this._chapterDatas = Array.from(ConfigMgr.instance.ChapterData.values()).sort((a, b) => a.id - b.id);
        this.MaxPage = Math.ceil(this._chapterDatas.length / 6) - 1;
    }
    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.btnLeft.node, Node.EventType.TOUCH_END, this.onClickLeft, this);
        this.addNodeEvent(this.btnRight.node, Node.EventType.TOUCH_END, this.onClickRight, this);
        this.addNodeEvent(this.btn_treasureBox.node, Node.EventType.TOUCH_END, this.onClickTreasureBox, this);
        this.addNodeEvent(this.btn_fight.node, Node.EventType.TOUCH_END, this.onClickFight, this);
        // this.addEvent(GameEvent.PVE_SELECT_GATE, this.OnSelectGate, this);
    }
    public OnRefreshUI(): void {
        super.OnRefreshUI();
        this.setPage(this._curPage);
        this.updateChapterTittle();
    }
    setPage(page: number) {
        var perPageNum = this.groupList.node.children.length;
        var arr = this._chapterDatas.slice(page * perPageNum, (page + 1) * perPageNum);
        if (arr) {
            this.groupList.updateList(arr, GateCell);
        }
    }
    private onClickLeft() {
        this._curPage--;
        if (this._curPage < 0) {
            this._curPage = 0;
        }
        this.setPage(this._curPage);
    }
    private onClickRight() {
        this._curPage++;
        if (this._curPage > this.MaxPage) {
            this._curPage = this.MaxPage;
        }
        this.setPage(this._curPage);
    }
    private updateChapterTittle() {
        var nextGate = PVEMgr.getInstance().getNextGate();
        var nextChapter = nextGate[0];
        var nextOrder = nextGate[1];

        var chapterCfg = ConfigMgr.instance.ChapterData.get(nextChapter);
        var orderCfg = PVEMgr.getInstance().getStageCfgByChapter(nextChapter, nextOrder);
        if (orderCfg) {
            this.lb_curChapter.string = `${lang(43, { chapter: lang(chapterCfg.chapter_title, { id: nextChapter }) })}${lang(orderCfg.name)}`;
        }
        this.nextOrderCfg = orderCfg;
    }
    private onClickTreasureBox() {
        UIMananger.instance.showWin(TreasureBoxWin);
    }
    private onClickFight() {
        if (this.nextOrderCfg) {
            PVEMgr.getInstance().curStage = this.nextOrderCfg;
            UIMananger.instance.showWin(FightPrepareWin);
            // var mapData = ConfigTools.instance.getStageMapDataByChapterAndOrder(this.nextOrderCfg.chapter, this.nextOrderCfg.order);
            // if (mapData) {
            //     PVEMgr.getInstance().curStage = this.nextOrderCfg;
            //     UIMananger.instance.showWin(WildMapWin, mapData.scene);
            // }
        }
    }
}


