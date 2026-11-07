import { _decorator, Component, Node, Slider } from 'cc';
import { BaseWin } from '../../../Component/BaseWin';
import { BaseLabel } from '../../../Component/BaseComp/BaseLabel';
import { comp } from '../../../Common/Decorator';
import { BaseBtn } from '../../../Component/BaseComp/BaseBtn';
import { ScrollList } from '../../../Component/BaseComp/ScrollList';
import { ITransactionEventsData } from '../../../Config/Typings/TransactionEventsData';
import { IMapResourcesData } from '../../../Config/Typings/MapResourcesData';
import { ConfigTools } from '../../../Config/ConfigTools';
import { GlobalData } from '../../../Common/GlobalData';
import { ConfigMgr } from '../../../Config/ConfigMgr';
import { CostItem } from '../../../Component/CostItem';
import { MapMgr } from '../MapMgr';
import { lang, LangMgr } from '../../../Common/LangMgr';

import { UnitShowCell } from './UnitShowCell';
import { SliderInputComp } from '../../../Component/SliderInputComp';
const { ccclass, property } = _decorator;

@ccclass('WildDealWin')
export class WildDealWin extends BaseWin {


    // @comp(BaseSprite)
    // itemImg: BaseSprite = null!;

    @comp(BaseLabel)
    lb_desc: BaseLabel = null!;

    @comp(BaseLabel)
    lb_attack: BaseLabel = null!;

    @comp(BaseLabel)
    lb_defend: BaseLabel = null!;

    @comp(BaseLabel)
    lb_hp: BaseLabel = null!;

    @comp(BaseLabel)
    lb_command: BaseLabel = null!;

    @comp(ScrollList)
    listCost: ScrollList = null!;

    @comp(BaseBtn)
    btn_exit: BaseBtn = null!;

    @comp(BaseBtn)
    btn_deal: BaseBtn = null!;
    @comp(BaseLabel)
    label_title: BaseLabel = null!;


    @comp(BaseBtn)
    btn_close: BaseBtn = null!;

    @comp(UnitShowCell)
    UnitShowCell: UnitShowCell = null!;
    @comp(SliderInputComp)
    slideNum: SliderInputComp = null!;




    private curTradeCfg: ITransactionEventsData;
    private _curNum = 1;
    // protected onLoad(): void {
    //     super.onLoad();
    // }
    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.slideNum.node, "slide", this.SliderChange, this);
        this.addNodeEvent(this.btn_exit.node, Node.EventType.TOUCH_END, this.closeWin, this)
        this.addNodeEvent(this.btn_deal.node, Node.EventType.TOUCH_END, this.onClickDeal, this);

    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        var mapResCfg = this.getData<IMapResourcesData>();

        if (mapResCfg) {
            this.label_title.setText(mapResCfg.title_desc);
            var tradeCfg = <ITransactionEventsData>ConfigTools.instance.GetWildMapObjectDataByChapterId(mapResCfg.id, GlobalData.wildData.chapter);
            this.curTradeCfg = tradeCfg;
            if (tradeCfg) {
                var itemCfg = ConfigMgr.instance.ItemData.get(tradeCfg.item);
                if (itemCfg) {
                    // this.itemImg.setIconData(itemCfg.icon);
                    // this.lb_name.setText(itemCfg.name);
                    this.UnitShowCell.setData({ unitId: itemCfg.unit_id, lv: 1 });
                    var unitCfg = ConfigMgr.instance.UnitData.get(itemCfg.unit_id);
                    if (unitCfg) {
                        var unitAttr = ConfigMgr.instance.UnitAttrData.get(unitCfg.unit_attr);
                        this.lb_desc.setText(unitCfg.desc);
                        if (unitAttr) {
                            this.lb_attack.string = unitAttr.atk.toString();
                            this.lb_defend.string = unitAttr.def.toString();
                            this.lb_hp.string = unitAttr.hp.toString();
                            this.lb_command.string = unitAttr.speed.toString();
                        }
                    }
                }
      
            }
            this.slideNum.setSlider({
                min_value: 1, max_value: this.curTradeCfg.max, btn_step: 1, value_step: { step: 1 }, on_value_changed: (cur: number, before: number) => {
                    this.SliderChange(cur);
                }
            })

        }
        this.SliderChange(1);
    }
    private UpdateCost() {
        if (this.curTradeCfg) {
            var costItems = this.curTradeCfg.cost_id;
            if (costItems) {
                var listCost = [];
                for (let i = 0; i < costItems.length; i++) {
                    let itemId = costItems[i];
                    let count = Number(this.curTradeCfg.cost_num[i]) * this._curNum;
                    listCost.push({ item_id: itemId, count: count });
                }
                this.listCost.updateList(listCost, CostItem)
            }
        }
    }
    private SliderChange(value?: number) {
        this._curNum = value;
        this.UpdateCost();
    }

    private onClickDeal() {
        this.closeWin();
        var itemCfg = ConfigMgr.instance.ItemData.get(this.curTradeCfg.item);
        if (itemCfg) {
            var showContent = `${lang(itemCfg.name)}x${this._curNum}`;
            MapMgr.getInstance().HandleMapOjectFinishChat(MapMgr.getInstance().mapObjectHandling, GlobalData.playerData, showContent);
        }
    }
}


