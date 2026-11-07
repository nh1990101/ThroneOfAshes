import { _decorator, Camera, Component, js, log, Node, UITransform, Vec2 } from 'cc';
import { AssetMgr } from '../Common/AssetMgr';
import { Tools } from '../Common/Tools';
import { BaseWin } from './BaseWin';
import { child } from '../Common/Decorator';
import { FlyNotice } from '../GamePlay/BaseSystem/FlyNotice';
import { FlyNoticeMgr } from '../GamePlay/BaseSystem/FlyNoticeMgr';

const { ccclass, property } = _decorator;

export const WIN_NAMES = ["FlyNotice", "MainCity", "BattleWin", "WildMapWin", "HeroGrowWin"] as const
type WIN_NAMES<S extends string> = S

@ccclass('UIMananger')
export class UIMananger extends Component {
    public static instance: UIMananger;
    protected win: Map<string, BaseWin>;

    @property(Node)
    parentTemp: Node = null;
    @property(Node)
    winLoading: Node = null;
    @property(Node)
    tipsLayer: Node = null!;

    @property(Node)
    winLayer: Node = null!;


    private _openingWin: BaseWin[];
    /** 子面板 → 父面板 */
    private _parentWin: Map<BaseWin, BaseWin>;
    /** 同一窗口的并发打开共享一次加载，避免重复创建实例 */
    private _loadingWins: Map<string, Promise<BaseWin>>;
    /** 常驻窗口单独挂在提示层，不参与普通窗口栈。 */
    private persistent_wins: Set<BaseWin>;
    private _loadingCount: number;
    /** 只有最后一次打开请求可以改变当前显示 */
    private _showRequestId: number;

    onLoad() {
        this.win = new Map<string, BaseWin>();
        this._openingWin = [];
        this._parentWin = new Map<BaseWin, BaseWin>();
        this._loadingWins = new Map<string, Promise<BaseWin>>();
        this.persistent_wins = new Set<BaseWin>();
        this._loadingCount = 0;
        this._showRequestId = 0;
        UIMananger.instance = this;
        this.parentTemp = this.node;
        if (this.winLoading) {
            this.winLoading.active = false;
        }
    }

    update(deltaTime: number) {

    }

    public async showWin(winClass: new () => BaseWin, ...params): Promise<BaseWin> {
        const requestId = ++this._showRequestId;
        // 从类构造函数获取类名作为 winName。不能用 winClass.name，发布版会被压缩
        const winName = Tools.getClsName(winClass);

        try {
            const win = await this.getOrCreateWin(winName, winClass);
            if (requestId !== this._showRequestId) {
                // 过期请求创建的实例仍保留缓存，但不能留在场上抢占当前界面
                if (!this.checkWinIsOpen(win)) {
                    win.node.active = false;
                }
                return win;
            }

            win.showWin(...params);
            return win;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            log(`打开窗口失败${winName}: ${message}`);
            throw error;
        }
    }

    /** 打开常驻窗口，复用窗口缓存，切换全屏窗口时保持显示。 */
    public async showPersistentWin(win_class: new () => BaseWin, ...params): Promise<BaseWin> {
        const win_name = Tools.getClsName(win_class);
        const win = await this.getOrCreateWin(win_name, win_class, this.tipsLayer);
        this.persistent_wins.add(win);
        win.showWin(...params);
        return win;
    }

    /** 按注册的窗口类名打开，与传入窗口类共用加载和缓存 */
    public async showWinByName(win_name: string, ...params): Promise<BaseWin> {
        const win_class = js.getClassByName(win_name);
        if (!win_class || !js.isChildClassOf(win_class, BaseWin)) {
            throw new Error(`未注册的窗口类：${win_name}`);
        }
        return this.showWin(win_class as new () => BaseWin, ...params);
    }

    private getOrCreateWin(winName: string, winClass: new () => BaseWin, parent_node: Node = this.winLayer): Promise<BaseWin> {
        const cached = this.win.get(winName);
        if (cached) {
            return Promise.resolve(cached);
        }

        let loading = this._loadingWins.get(winName);
        if (!loading) {
            loading = this.createWin(winName, winClass, parent_node);
            this._loadingWins.set(winName, loading);
        }
        return loading;
    }

    private async createWin(winName: string, winClass: new () => BaseWin, parent_node: Node): Promise<BaseWin> {
        this.beginLoading();
        try {
            const win = await AssetMgr.createPrefabFromPool(`Windows/${winName}`, Vec2.ZERO, parent_node, winClass);
            if (!win) {
                throw new Error(`创建窗口失败${winName}`);
            }
            win.name = winName;
            this.win.set(winName, win);
            return win;
        } finally {
            this._loadingWins.delete(winName);
            this.endLoading();
        }
    }

    /** 开始一项加载。必须与 endLoading 成对调用 */
    public beginLoading(): void {
        this._loadingCount++;
        if (this.winLoading) {
            this.winLoading.active = true;
            Tools.setNodeTopLayer(this.winLoading);
        }
    }

    /** 结束一项加载。所有加载结束后才关闭 loading */
    public endLoading(): void {
        this._loadingCount = Math.max(0, this._loadingCount - 1);
        if (this._loadingCount === 0 && this.winLoading) {
            this.winLoading.active = false;
        }
    }
    /**
     * 
     * @param win 
     * @param status 设置窗口打开和关闭状态 
     */
    public SetOpeningWin(win: BaseWin, status: boolean) {
        if (this.persistent_wins.has(win)) {
            return;
        }
        if (status) {
            if (!this.checkWinIsOpen(win)) {
                this.rememberParentWin(win);
                //全屏界面需要隐藏掉其它打开的窗口
                if (win.Is_FullScene) {
                    this._openingWin.forEach(opened => {
                        opened.node.active = false;
                    })
                }
                this._openingWin.push(win);
            }
        } else {
            this.closeChildWins(win);
            var index = this._openingWin.indexOf(win);
            if (index > -1) {
                this._openingWin.splice(index, 1);
            }
            // 只让一个全屏窗口显示
            if (win.Is_FullScene) {
                let openLen = this._openingWin.length;
                for (let i = openLen - 1; i >= 0; i--) {
                    var openWin = this._openingWin[i];
                    if (openWin && openWin.Is_FullScene) {
                        openWin.node.active = true;
                        openWin.OnCheckRefreshUI();
                        break;
                    }
                }
            }
            // 检测父窗口显示状态
            this.showParentWin(win);
        }
    }

    /** 藏起其它窗口之前记下父面板 */
    private rememberParentWin(win: BaseWin) {
        const parentName = win.parentWinName;
        if (!parentName) {
            return;
        }
        const parent = this.getWinByName(parentName);
        if (parent && parent.node.active && this.checkWinIsOpen(parent)) {
            this._parentWin.set(win, parent);
        }
    }

    /** 先清掉父记录再关。子面板关掉时不会把正在关的父面板又显示出来 */
    private closeChildWins(win: BaseWin) {
        const children: BaseWin[] = [];
        this._parentWin.forEach((parent, child) => {
            if (parent === win) {
                children.push(child);
            }
        });
        for (const child of children) {
            this._parentWin.delete(child);
            child.closeWin();
        }
    }

    /** 父面板还在打开列表里才显示。已被切走关掉的不再打开 */
    private showParentWin(win: BaseWin) {
        const parent = this._parentWin.get(win);
        this._parentWin.delete(win);
        if (parent && this._openingWin.indexOf(parent) > -1) {
            parent.node.active = true;
            parent.OnCheckRefreshUI();
        }
    }


    public checkWinIsOpen(win: BaseWin): boolean {
        if (win) {
            if (this.persistent_wins.has(win)) {
                return win.node.active;
            }
            return this._openingWin.indexOf(win) > -1;
        }
        return false;
    }
    public checkWinIsOpenByClass(winClass: new () => BaseWin) {
        var win = this.getWinByName(Tools.getClsName(winClass))
        return this.checkWinIsOpen(win);
    }
    public showFlyNotice(content: string) {
        // this.showWin("FlyNotice", content)
        FlyNoticeMgr.getInstance().showTexts(content);
    }
    public getWinByName(name: string): BaseWin {
        return this.win.get(name)
    }
    public closeWin(winClass: new () => BaseWin) {
        var win = this.getWinByName(Tools.getClsName(winClass))
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

    public addTipsLayer(target: Node) {
        target.setParent(this.tipsLayer);
    }
    // 刷新界面
    public RefreshWin(winClass: new () => BaseWin) {
        var win = this.getWinByName(Tools.getClsName(winClass))
        if (win && this.checkWinIsOpen(win)) {
            win.OnRefreshUI();//.active = false;
        }
    }
}


