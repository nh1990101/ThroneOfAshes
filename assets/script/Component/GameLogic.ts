import { _decorator, Component, Node } from 'cc';
import { BaseComp } from './BaseComp';
import { TimerMgr } from '../Common/TimerMgr';
import { ProtoNetworkMgr } from '../WebSocket/ProtoNetworkMgr';
import { lang } from '../Common/LangMgr';
import { UIMananger } from './UIMananger';
import { CheckBox, ICheckBoxData } from '../Common/CheckBox';
import { title } from 'node:process';
import { CHECK_TYPE } from '../Common/GameEnum';
import { ConfigMgr } from '../Config/ConfigMgr';
const { ccclass, property } = _decorator;

/**游戏全局逻辑管理 */
@ccclass('GameLogic')
export class GameLogic extends BaseComp {

    /**游戏主逻辑帧 */
    protected update(dt: number): void {
        TimerMgr.getInstance().update(dt);
    }
    public initEvent(): void {
        super.initEvent();
        this.addEvent(ProtoNetworkMgr.EventType.RESULT_ERROR, this.OnHandleResultErrow, this);
    }
    OnHandleResultErrow(data: { detail: { code: number } }) {
        let code = data.detail.code;
        const serverData = ConfigMgr.instance.ServerNoticeData.get(code);
        if (serverData) {
            var content = lang(210, { code: code });
            if (serverData.type == 1) {
                let winData: ICheckBoxData = { tittle: lang(211), content: content, showType: CHECK_TYPE.CONFIRM };
                UIMananger.instance.showWin(CheckBox, winData)
            } else if (serverData.type == 2) {
                UIMananger.instance.showFlyNotice(content);
            }
        }
    }
}


