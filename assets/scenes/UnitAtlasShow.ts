import { _decorator, Component, EditBox, Node, Toggle, ToggleContainer } from 'cc';
import { UnitBase } from '../script/GamePlay/Battle/UnitBase';
import { BaseBtn } from '../script/Component/BaseComp/BaseBtn';
import { UNIT_ACTION } from '../script/Common/GameEnum';
import { ConfigMgr } from '../script/Config/ConfigMgr';
import { AssetMgr } from '../script/Common/AssetMgr';
import { GlobalData } from '../script/Common/GlobalData';
const { ccclass, property } = _decorator;
/**
 * 动画展示测试器
 */
@ccclass('UnitAtlasShow')
export class UnitAtlasShow extends Component {
    @property(UnitBase)
    unit: UnitBase = null;
    @property(ToggleContainer)
    toggleContainer: ToggleContainer = null;
    @property(BaseBtn)
    btn_play: BaseBtn = null;
    @property(EditBox)
    edit_Id: EditBox = null;


    async start() {
        await ConfigMgr.instance.loadConfigZip();
        await AssetMgr.preloadBundle();
        GlobalData.initData();

    }

    update(deltaTime: number) {

    }
    private async startPlay() {

        var id = this.edit_Id.string;
        await this.unit.SetUnitId(Number(id));
        this.checkPlay();
    }
    checkPlay() {
        var toggle = this.toggleContainer.activeToggles();

        var action = UNIT_ACTION.IDLE;

        if (toggle.length > 0) {

            var index = this.toggleContainer.node.children.indexOf(toggle[0].node);

            action = <UNIT_ACTION>index;
        }
        if (action == UNIT_ACTION.MAX) {
            this.unit.PlayActions([UNIT_ACTION.IDLE, UNIT_ACTION.MOVE, UNIT_ACTION.BE_HIT, UNIT_ACTION.DEAD, UNIT_ACTION.ATTACK]);
        } else {
            this.unit.PlayAction(action, true);
        }
    }

    private onClickToggle(e: CustomEvent) {
        this.checkPlay();
    }

}


