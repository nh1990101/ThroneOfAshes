import { _decorator, Component, log, Node, Vec2 } from 'cc';
import { AssetMgr } from '../Common/AssetMgr';
import { Tools } from '../Common/Tools';
import { BaseWin } from './BaseWin';

const { ccclass, property } = _decorator;

export const WIN_NAMES = ["FlyNotice", "MainCity", "BattleWin", "WildMapWin"] as const
type WIN_NAMES<S extends string> = S

@ccclass('UIMananger')
export class UIMananger extends Component {
    public static instance: UIMananger;
    protected win: Map<string, BaseWin>;

    @property(Node)
    parentTemp: Node = null;
    @property(Node)
    winLoading: Node = null;

    onLoad() {
        this.win = new Map<string, BaseWin>();
        UIMananger.instance = this;
        this.parentTemp = this.node;
        if (this.winLoading) {
            this.winLoading.active = false;
        }
    }

    update(deltaTime: number) {

    }

    public showWin(winClass: new () => BaseWin, ...params): Promise<BaseWin> {
        return new Promise<BaseWin>((resolve, reject) => {
            this.winLoading.active = true;
            Tools.setNodeTopLayer(this.winLoading);

            // 从类构造函数获取类名作为 winName
            const winName = winClass.name;

            var win = this.win.get(winName);
            if (win) {
                win.showWin(...params);
                this.winLoading.active = false;
                resolve(win);
            } else {
                AssetMgr.createPrefabFromPool(`Windows/${winName}`, Vec2.ZERO, this.node, winClass).then((win: BaseWin) => {
                    if (win != null) {
                        UIMananger.instance.win.set(winName, win);
                        win.showWin(...params);
                        this.winLoading.active = false;
                    } else {
                        log(`创建窗口失败${winName}`);
                    }
                    resolve(win);
                });
            }
        });
    }
    public checkWinIsOpen(winName: WIN_NAMES<typeof WIN_NAMES[number]>): boolean {
        var win = this.getWinByName(winName);
        if (win) {
            return win.node.active
        }
        return false;
    }
    public showFlyNotice(content: string) {
        // this.showWin("FlyNotice", content)
    }
    public getWinByName(name: string): BaseWin {
        return this.win.get(name)
    }
    public closeWin(winName: WIN_NAMES<typeof WIN_NAMES[number]>) {
        var win = this.getWinByName(winName)
        if (win) {
            win.closeWin();//.active = false;
        }
    }
}


