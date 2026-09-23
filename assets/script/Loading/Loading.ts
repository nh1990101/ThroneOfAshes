import { _decorator, Component, Node, Sprite, ProgressBar, Label, game, macro, view, ResolutionPolicy, UITransform } from 'cc';
import { ConfigMgr } from '../Config/ConfigMgr';
import { AssetMgr } from '../Common/AssetMgr';
import { GlobalData } from '../Common/GlobalData';
import { GameWebSocket } from '../WebSocket/GameWebSocket';
import { UIMananger } from '../Component/UIMananger';
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
    async start() {
        // if (!CondictionMgr.getInstance().config) {
        this.setPro(0.1, "正在加载游戏配置")
        await ConfigMgr.instance.loadConfigZip()

        this.setPro(0.3, "正在加载资源包")
        await AssetMgr.preloadBundle()


        // this.setPro(0.5, "正在加载字体资源")
        // await AssetMgr.loadFontRes()

        this.setPro(0.6, "正在初始化全局变量")
        GlobalData.initData();

        // this.setPro(0.7, "正在链接服务器")
        // await GameWebSocket.instance.connect();

        // this.setPro(0.75, "正在登录账号")
        // await GameWebSocket.instance.login();

        // }
        this.setPro(0.8, "正在进入游戏")

        this.enterGame();
    }

    update(deltaTime: number) {

    }
    setPro(rate: number, content: string) {
        this.lb_notice.string = content;
        this.probar.progress = rate;
        this.lb_pro.string = (rate * 100).toFixed(1) + "%"
    }
    onLoad() {
        // 动态加载JSZip
        (window as any).JSZip = JSZip; // 全局挂载
       

    }


    enterGame() {
        this.checkViewDesign();
        console.log("进入游戏主界面")
        AssetMgr.removeInstant(this.node)



        UIMananger.instance.showWin("MainCity")



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
}


