import { _decorator, Component, Node, NodeEventType } from 'cc';
import { HeroIcon, HeroIconData } from './HeroIcon';
import { BaseSprite } from '../../../Component/BaseComp/BaseSprite';
import { child, comp } from '../../../Common/Decorator';
import { BaseRenderCell } from '../../../Component/BaseRenderCell';
import { BaseBtn } from '../../../Component/BaseComp/BaseBtn';
import { PVEMgr } from '../PVEMgr';
import { GlobalData } from '../../../Common/GlobalData';
import { ConfigMgr } from '../../../Config/ConfigMgr';
import { GameEvent, ParamDefined, ParamValueType } from '../../../Common/GameEnum';
import { UIMananger } from '../../../Component/UIMananger';
import { lang } from '../../../Common/LangMgr';
import { EventManager } from '../../../Common/EventManager';
import { BaseLabel } from '../../../Component/BaseComp/BaseLabel';
import { BattleMgr } from '../../Battle/BattleMgr';
const { ccclass, property } = _decorator;
export interface HeroIconSelectData extends HeroIconData {
    isInTeam: boolean;
}
@ccclass('HeroIconSelect')
export class HeroIconSelect extends BaseRenderCell<HeroIconData> {
    @comp(BaseSprite)
    tick: BaseSprite = null!;


    @comp(BaseBtn)
    hero_icon: BaseBtn = null!;

    @comp(BaseLabel)
    lb_command: BaseLabel = null!;

    @comp(BaseLabel)
    lb_name: BaseLabel = null!;


    private _heroIcon: HeroIcon;

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.node, NodeEventType.TOUCH_END, this.onClickSelect)
    }
    public GetBaseIcon() {
        if (!this._heroIcon) {
            this._heroIcon = this.hero_icon.node.addComponent(HeroIcon);
        }
        return this._heroIcon;
    }
    public OnRefreshUI(): void {
        super.OnRefreshUI();
        var data = this.getData();
        this.GetBaseIcon().setData(data);
        var pveMgr = PVEMgr.getInstance()
        var bolInTeam = pveMgr.checkIsInTeamByUnitId(data.uId);
        var cfg = ConfigMgr.instance.UnitData.get(data.unitId);
        if (cfg) {
            this.lb_name.string = lang(cfg.name)
            this.lb_command.string = "+" + BattleMgr.getInstance().GetPropertyByHero(data.uId).command; //lang(158, { command: "+" + BattleMgr.getInstance().GetPropertyByHero(data.uId).command })
            // console.log("刷新"+this.lb_name.string)
        }
        this.setSetlectFunc(bolInTeam);
    }
    onClickSelect() {
        var mgr = PVEMgr.getInstance();
        // 下阵
        if (this.tick.node.active) {
            mgr.deleteUnitInCurBattleArray(this.getData().uId);
            this.setSetlectFunc(false);
            EventManager.Instance.dispatch(GameEvent.HERO_FIGHT_SELECT_UPDATE);
        } else {
            // 上阵
            var isSuccess = mgr.addUnitInCurBattleArray({ uId: this.getData().uId, unitId: this.getData().unitId, num: 1 });
            var max = ConfigMgr.instance.getParam(ParamDefined.HERO_BATTLE_MAX, ParamValueType.INT)[0];
            if (!isSuccess) {
                UIMananger.instance.showFlyNotice(lang(157, { num: max }));
            } else {
                EventManager.Instance.dispatch(GameEvent.HERO_FIGHT_SELECT_UPDATE);
            }
            this.setSetlectFunc(isSuccess);
        }
    }
    setSetlectFunc(bol: boolean) {
        this.tick.node.active = bol;
        this.GetBaseIcon().setSelected(bol);
    }
}


