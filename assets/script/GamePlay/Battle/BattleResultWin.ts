import { _decorator } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { comp } from '../../Common/Decorator';
import { lang } from '../../Common/LangMgr';
import { BATTLE_RESULT } from '../../Common/GameEnum';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { UIMananger } from '../../Component/UIMananger';
import { BattleWin } from './BattleWin';
import { Tools } from '../../Common/Tools';
import { MapMgr } from '../WildMap/MapMgr';
import { GlobalData } from '../../Common/GlobalData';
import { WildMapWin } from '../WildMap/WildMapWin';
const { ccclass, property } = _decorator;

@ccclass('BattleResultWin')
export class BattleResultWin extends BaseWin {
    @comp(BaseLabel)
    lb_result: BaseLabel = null!;
    @comp(BaseBtn)
    btn_close: BaseBtn = null!;
    public OnRefreshUI(): void {
        super.OnRefreshUI();
        var result: BATTLE_RESULT = this.getData();
        this.lb_result.string = lang(result == BATTLE_RESULT.WIN ? 184 : 185);
    }
    closeWin(): void {

        if (UIMananger.instance.checkWinIsOpenByClass(BattleWin)) {
            UIMananger.instance.closeWin(BattleWin);
        }
        var result: BATTLE_RESULT = this.getData();
        if (result == BATTLE_RESULT.WIN) {
            var mapMgr = MapMgr.getInstance()

            // 这里需要判断是否是暗雷，暗雷不加次数
            if (mapMgr.mapObjectHandling?.mapUID) {
                GlobalData.wildData.addKillMonster(mapMgr.curMapId);
            }

            mapMgr.HandleMapOjectFinishChat(mapMgr.mapObjectHandling, GlobalData.playerData, "");
        } else {
            this.scheduleOnce(() => {
                UIMananger.instance.closeWin(WildMapWin);
            })
            // UIMananger.instance.showWin(MainCity);
            GlobalData.wildData.ClearRolePos();
        }
        super.closeWin();
    }
}


