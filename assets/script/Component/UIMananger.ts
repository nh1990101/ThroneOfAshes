import { _decorator, Camera, Component, log, Node, UITransform, Vec2 } from 'cc';
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

    private _openingWin: BaseWin[];

    onLoad() {
        this.win = new Map<string, BaseWin>();
        this._openingWin = [];
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
    /**
     * 
     * @param win 
     * @param status 设置窗口打开和关闭状态 
     */
    public SetOpeningWin(win: BaseWin, status: boolean) {
        if (status) {
            if (!this.checkWinIsOpen(win)) {
                //全屏界面需要隐藏掉其它打开的窗口
                if (win.Is_FullScene) {
                    this._openingWin.forEach(win => {
                        win.node.active = false;
                    })
                }
                this._openingWin.push(win);
            }
        } else {
            var index = this._openingWin.indexOf(win);
            if (index > -1) {
                this._openingWin.splice(index, 1);
            }
            if (win.Is_FullScene) {
                this._openingWin.forEach(win => {
                    if (win.Is_FullScene) {
                        win.node.active = true;
                    }
                })
            }
        }
    }


    public checkWinIsOpen(win: BaseWin): boolean {
        if (win) {
            return win.node.active && this._openingWin.indexOf(win) > -1;
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
    public GetUIRatio(camera: Camera) {
        // 获取相机视口大小
        const rootTransform = this.getComponent(UITransform);
        if (!rootTransform) return;
        const screenHeight = rootTransform.height * camera.rect.height;
        // 计算正交相机的世界坐标视口
        const viewHeight = camera.orthoHeight * 2;

        // UI坐标到世界坐标的转换比例
        const worldToUIRatio = viewHeight / screenHeight;

        return worldToUIRatio;
    }
}


