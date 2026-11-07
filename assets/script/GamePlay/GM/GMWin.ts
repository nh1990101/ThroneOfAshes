import { Layout, _decorator } from 'cc';
import { comp } from '../../Common/Decorator';
import { RoleMgr } from '../../Common/RoleMgr';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { SCROLL_VERTICAL, ScrollList } from '../../Component/BaseComp/ScrollList';
import { BaseWin } from '../../Component/BaseWin';
import { UIMananger } from '../../Component/UIMananger';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { BattleWin } from '../Battle/BattleWin';
import { MainCity } from '../MainCity/MainCity';
import { WildMapWin } from '../WildMap/WildMapWin';
import { GMFunctionCell, GMFunctionData } from './GMFunctionCell';
const { ccclass } = _decorator;

@ccclass('GMWin')
export class GMWin extends BaseWin {
    @comp(BaseBtn, "btn_close")
    public btn_close: BaseBtn = null!;

    @comp(ScrollList, "function_list")
    private function_list: ScrollList = null!;

    private list_ready = false;
    private faction_function: GMFunctionData = {
        name: '切换阵营',
        input_placeholder: '阵营id',
        input_value: '',
        click_func: (value: string) => this.onClickFaction(value),
    };
    private gm_functions: GMFunctionData[] = [
        { name: '战斗测试', click_func: () => this.onClickBattle() },
        { name: '野外地图', input_placeholder: '默认 2001', input_value: '', click_func: (value: string) => this.onClickWild(value) },
        this.faction_function,
    ];

    public showWin(): void {
        this.faction_function.input_value = String(RoleMgr.getInstance().getRoleFactionId());
        if (!this.list_ready) {
            const layout = this.function_list.content.getComponent(Layout);
            this.function_list.setDataList(GMFunctionCell, this.gm_functions, SCROLL_VERTICAL, [layout.paddingTop, layout.paddingBottom, layout.spacingY], false);
            this.list_ready = true;
        }
        super.showWin();
    }

    public OnRefreshUI(): void {
        if (!this.list_ready) {
            return;
        }
        this.function_list.updateList(this.gm_functions);
    }

    private onClickBattle(): void {
        this.closeWin();
        UIMananger.instance.showWin(BattleWin);
    }

    private onClickWild(value: string): void {
        const map_id = Number(value || 2001);
        this.closeWin();
        UIMananger.instance.showWin(WildMapWin, map_id);
    }

    private onClickFaction(value: string): void {
        const faction_id = Number(value);
        if (!ConfigMgr.instance.FactionData.has(faction_id)) {
            UIMananger.instance.showFlyNotice('阵营不存在');
            return;
        }
        RoleMgr.getInstance().setRoleFactionId(faction_id);
        this.closeWin();
        UIMananger.instance.RefreshWin(MainCity);
    }
}
