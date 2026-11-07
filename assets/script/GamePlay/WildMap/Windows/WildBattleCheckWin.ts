import { _decorator, Component, Node } from 'cc';
import { BaseWin } from '../../../Component/BaseWin';
import { BaseLabel } from '../../../Component/BaseComp/BaseLabel';
import { ScrollList } from '../../../Component/BaseComp/ScrollList';
import { BaseBtn } from '../../../Component/BaseComp/BaseBtn';
import { child, comp } from '../../../Common/Decorator';
import { BaseSprite } from '../../../Component/BaseComp/BaseSprite';
import { IMonsterAttrData } from '../../../Config/Typings/MonsterAttrData';
import { ConfigMgr } from '../../../Config/ConfigMgr';
import { PoolMgr } from '../../../Common/Pool';
import { BattleUnitData } from '../../Battle/BattleUnitData';
import { UIMananger } from '../../../Component/UIMananger';
import { BattleWin } from '../../Battle/BattleWin';
import { UnitShowCell } from './UnitShowCell';
import { IMapResourcesData } from '../../../Config/Typings/MapResourcesData';
import { ItemIconComp } from '../../../Component/ItemIconComp';
import { ConfigTools } from '../../../Config/ConfigTools';
import { MapMgr } from '../MapMgr';
const { ccclass, property } = _decorator;

@ccclass('WildBattleCheckWin')
export class WildBattleCheckWin extends BaseWin {
    @comp(BaseLabel)
    title_text: BaseLabel = null!;


    @comp(BaseLabel)
    lb_notice: BaseLabel = null!;

    @comp(ScrollList)
    listCom: ScrollList = null!;

    @comp(BaseBtn)
    btn_exit: BaseBtn = null!;

    @comp(BaseBtn)
    btn_fight: BaseBtn = null!;



    @comp(BaseSprite)
    mask: BaseSprite = null!;

    @child()
    reward: Node = null!;

    @comp(ScrollList)
    listReward: ScrollList = null!;


    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.mask.node, Node.EventType.TOUCH_END, this.closeWin, this);
        this.addNodeEvent(this.btn_exit.node, Node.EventType.TOUCH_END, this.closeWin, this);
        this.addNodeEvent(this.btn_fight.node, Node.EventType.TOUCH_END, this.onClickFight, this);
    }
    public OnRefreshUI(): void {
        super.OnRefreshUI();
        var monsterAttrsData = <IMonsterAttrData>this._winData[0];
        var mapResCfg = <IMapResourcesData>this._winData[1];
        var gridPos = monsterAttrsData.coordinates;
        var configMgr = ConfigMgr.instance;
        var list = [];
        this.title_text.setText(mapResCfg.title_desc);
        this.lb_notice.setText(mapResCfg.desc);
        for (var i = 0; i < gridPos.length; i++) {
            var posId = gridPos[i]
            var gridPosData = configMgr.DeployGridData.get(posId);
            var dataIndex = i * 2;
            var unitAttrId = monsterAttrsData.units_list[dataIndex]
            var unitId = ConfigMgr.instance.UnitDataIndex.unit_attr_dict[unitAttrId];
            // var unitCount = monsterAttrsData.units_list[dataIndex + 1];
            var unitCfg = configMgr.UnitData.get(unitId);
            if (gridPosData && unitCfg) {

                list.push({ unitId: unitId, lv: monsterAttrsData.soldier_lv_coef });
            }
        }
        this.listCom.updateList(list, UnitShowCell);

        if (monsterAttrsData.reward) {
            this.reward.active = true;
            const reward = ConfigTools.instance.getRewardList(monsterAttrsData.reward);
            this.listReward.updateList(reward.fixed.concat(reward.drops), ItemIconComp);
        } else {
            this.reward.active = false;
        }
    }
    private onClickFight() {

        UIMananger.instance.showWin(BattleWin, MapMgr.getInstance().GetBattleDataByMonsterAttrData(this._winData[0]));
        this.closeWin();
    }
}


