import { _decorator, Component, Node, Sprite, ProgressBar, Label, game, macro, view, ResolutionPolicy, UITransform, EditBox } from 'cc';
import { ConfigMgr } from '../Config/ConfigMgr';
import { AssetMgr } from '../Common/AssetMgr';
import { GlobalData } from '../Common/GlobalData';
import { GameWebSocket } from '../WebSocket/GameWebSocket';
import { UIMananger } from '../Component/UIMananger';
import { MainCity } from '../GamePlay/MainCity/MainCity';
import { GMEntryWin } from '../GamePlay/GM/GMEntryWin';
import { lang, LangMgr } from '../Common/LangMgr';
import { toASCII } from 'node:punycode';
import { LoginMgr } from '../GamePlay/Login/LoginMgr';
import { comp } from '../Common/Decorator';

const { ccclass, property } = _decorator;

@ccclass('Loading')
export class Loading extends Component {

    @property(Label)
    lb_notice: Label = null!;

    @property(Sprite)
    sp_Bg: Sprite = null!;

    @property(ProgressBar)
    probar: ProgressBar = null!;

    @property(Label)
    lb_pro: Label = null!;

    @property(Component)
    loginPage: Component;
    @property(Node)
    loadingContent: Node = null;
    @property(EditBox)
    editAcount: EditBox = null!;


    private _isEnter: boolean = false;
    private _isLoggingIn: boolean = false;
    private _resourcesLoaded: boolean = false;
    async start() {
        console.log("loading")
        this.loginPage.node.active = true;
        this.loadingContent.active = false;

        LangMgr.getInstance().getLanguage();
        LoginMgr.getInstance().eventRegistor();

    }

    update(deltaTime: number) {

    }
    setPro(rate: number, content: string) {
        if (!this.isValid) {
            return;
        }
        this.lb_notice.string = content;
        this.probar.progress = rate;
        this.lb_pro.string = (rate * 100).toFixed(1) + "%"
    }
    onLoad() {
        // 动态加载JSZip
        (window as any).JSZip = JSZip; // 全局挂载


    }

    async login() {
        if (this._isLoggingIn || this._isEnter) {
            return;
        }
        this._isLoggingIn = true;
        this.loginPage.node.active = false;
        this.loadingContent.active = true;
        this.setPro(0.1, lang(209));

        try {
            let failure: Error = null;
            // 等两项任务都结束后再允许重试，避免旧任务修改新一轮的加载状态。this.connectServer(),
            await Promise.all([this.loadingGameRes()].map(task => task.catch(error => {
                if (!failure) {
                    failure = error instanceof Error ? error : new Error(String(error ?? '登录失败'));
                }
            })));
            if (failure) {
                throw failure;
            }
            if (!this.isValid) {
                return;
            }
            this.enterGame();
        } catch (error) {
            console.error('登录失败:', error);
            if (this.isValid) {
                this.loginPage.node.active = true;
                this.loadingContent.active = false;
                this.lb_notice.string = lang(354);
            }
        } finally {
            this._isLoggingIn = false;
        }
    }
    private async loadingGameRes(): Promise<void> {
        if (this._resourcesLoaded) {
            this.setPro(0.9, lang(209));
            return;
        }
        this.setPro(0.2, lang(9));
        await this.loadBundle(0.2, 0.6);

        this.setPro(0.6, lang(7));
        await ConfigMgr.instance.loadConfigZip();

        this.setPro(0.7, lang(8));
        await ConfigMgr.instance.loadBattleMapConfig(1);

        if (!this.isValid) {
            return;
        }
        this.setPro(0.9, lang(10));
        GlobalData.initData();
        this._resourcesLoaded = true;

        if (!GameWebSocket.getInstance().isConnected()) {
            this.lb_notice.string = lang(209);
        }
    }
    private async loadBundle(from: number, totalPercent: number): Promise<void> {
        await AssetMgr.preloadBundle();
        await AssetMgr.preloadGamePrefab((finished: number, total: number, item: RequestInit) => {
            this.setPro(Math.min(from += 0.0004, totalPercent), lang(9))
        });
    }
    enterGame() {
        if (this._isEnter)
            return;
        this._isEnter = true;
        this.checkViewDesign();
        console.log("进入游戏主界面")
        AssetMgr.removeInstant(this.node)
        this.setPro(1.0, lang(11));
        UIMananger.instance.showWin(MainCity)
        UIMananger.instance.showPersistentWin(GMEntryWin);
    }
    public checkViewDesign() {
        console.log("适配检测")
        const visibleRatio = view.getVisibleSize().width / view.getVisibleSize().height
        const designRate = 720 / 1280;
        console.log(`设备宽高：${view.getVisibleSize().width},${view.getVisibleSize().height},宽高比：${visibleRatio}`)
        if (visibleRatio >= designRate) {
            console.log("使用高度适配")
            view.setDesignResolutionSize(720, 1280, ResolutionPolicy.FIXED_HEIGHT);
            GlobalData.ResolutionPolicy = ResolutionPolicy.FIXED_HEIGHT
        } else {
            console.log("使用宽度适配")
            view.setDesignResolutionSize(720, 1280, ResolutionPolicy.FIXED_WIDTH);

            GlobalData.ResolutionPolicy = ResolutionPolicy.FIXED_WIDTH
        }
    }
    private connectServer() {
        return GameWebSocket.getInstance().initNetwork().then(() => {
            LoginMgr.getInstance().sendLoginReq(this.editAcount.string);
        });
    }
}


