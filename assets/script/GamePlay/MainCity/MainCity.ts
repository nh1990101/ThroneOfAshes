import { _decorator, Component, EditBox, Node } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { child, comp } from '../../Common/Decorator';
import { SelectCmp, SelectMode } from '../../Component/SelectCmp';
import { BattleWin } from '../Battle/BattleWin';
import { WildMapWin } from '../WildMap/WildMapWin';
import { BagWin } from '../Bag/BagWin';
import { ItemInfoWin } from '../Bag/ItemInfoWin';
import { TreasureBoxWin } from '../TreasureBox/TreasureBoxWin';
import { PageController } from '../../Component/PageController';
import { MainPage } from './Page/MainPage';
import { HeroPage } from './Page/HeroPage';
import { SoldierPage } from './Page/SoldierPage';
import { GameUrl } from '../../Common/GameUrl';
import { PVEPage } from './Page/PVEPage';
import { PlayerIconComp } from '../../Component/PlayerIconComp';
import { TopItemBarComp } from '../../Component/TopItemBarComp';
import { UIMananger } from '../../Component/UIMananger';
import { SystemSettingWin } from '../Setting/SystemSettingWin';
import { RoleMgr } from '../../Common/RoleMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
const { ccclass, property } = _decorator;

@ccclass('MainCity')
export class MainCity extends BaseWin {


    @comp(BaseBtn)
    btn_main_city_tab: BaseBtn = null!;

    @comp(BaseBtn)
    btn_hero_tab: BaseBtn = null!;

    @comp(BaseBtn)
    btn_soldier_tab: BaseBtn = null!;

    @comp(BaseBtn)
    btn_pve_tab: BaseBtn = null!;

    @comp(BaseBtn)
    btn_pvp_tab: BaseBtn = null!;

    @comp(PageController)
    pageCtrl: PageController = null!;

    @comp(PlayerIconComp, 'player_icon')
    player_icon: PlayerIconComp = null!;

    @comp(BaseLabel, 'name')
    name_label: BaseLabel = null!;

    @child()
    vip_bg: Node = null!;

    @comp(BaseLabel, 'vip')
    vip_label: BaseLabel = null!;

    @comp(TopItemBarComp, 'top_item_bar')
    top_item_bar: TopItemBarComp = null!;



    private tabSelect: SelectCmp<Node>;

    public init(): void {
        super.init();
        this.pageCtrl.RegisterPages([
            { url: GameUrl.MainCityPrefab.format("Page/MainPage"), pageClass: MainPage, indexPage: 1 },
            { url: GameUrl.MainCityPrefab.format("Page/HeroPage"), pageClass: HeroPage, indexPage: 2 },
            { url: GameUrl.MainCityPrefab.format("Page/SoldierPage"), pageClass: SoldierPage, indexPage: 3 },
            { url: GameUrl.MainCityPrefab.format("Page/PVEPage"), pageClass: PVEPage, indexPage: 4 },
        ]);

    }
    public initEvent(): void {
        super.initEvent();
        this.initTabSelect();
        this.addNodeEvent(this.vip_bg, Node.EventType.TOUCH_END, this.onClickVip);
    }

    private initTabSelect(): void {
        const tabs: { btn: BaseBtn, page?: number }[] = [
            { btn: this.btn_main_city_tab, page: 1 },
            { btn: this.btn_hero_tab, page: 2 },
            { btn: this.btn_soldier_tab, page: 3 },
            { btn: this.btn_pve_tab, page: 4 },
            { btn: this.btn_pvp_tab },
        ];
        this.tabSelect = new SelectCmp<Node>(SelectMode.Single, (_key, isSelect, node) => {
            this.onTabChanged(node, isSelect);
        });
        for (const tab of tabs) {
            this.tabSelect.addKey(tab.btn.node, tab.btn.node);
            this.addNodeEvent(tab.btn.node, Node.EventType.TOUCH_END, () => {
                this.onClickTab(tab.btn.node, tab.page);
            });
        }
    }

    /** 已选中的页再点一次不切。page 为空表示只改选中 */
    private onClickTab(node: Node, page?: number): void {
        if (page != null) {
            if (this.pageCtrl.curIndex === page) {
                return;
            }
        } else if (this.tabSelect.isSelect(node)) {
            return;
        }
        this.tabSelect.setSelect(node, true);
        if (page != null) {
            this.pageCtrl.switchPage(page);
        }
    }

    private onTabChanged(node: Node, isSelect: boolean): void {
        node.getChildByName('SelectBg').active = isSelect;
    }

    //是否全屏
    public get Is_FullScene() {
        return true;
    }
    // OnClickBattle() {
    //     UIMananger.instance.showWin(BattleWin);
    // }
    // OnClickWild() {
    //     var mapId = this.editorMapId.string || 1;
    //     UIMananger.instance.showWin(WildMapWin, Number(mapId));
    // }

    OnRefreshUI(): void {
        super.OnRefreshUI();
        this.player_icon.setPlayer(undefined, {
            click_func: () => this.onClickPlayer(),
        });
        this.refreshFactionTabs();
        const current_page = this.pageCtrl.curPage;
        if (current_page) {
            current_page.OnCheckRefreshUI();
        }
        // TODO 玩家名字还没有角色数据，接到后写到 name_label
        // TODO 贵族等级、头像和等级还没有角色数据，贵族等级接到后写到 vip_label
    }

    /** 底部五个页签图标按当前阵营读表 */
    private refreshFactionTabs(): void {
        const faction = ConfigMgr.instance.FactionData.get(RoleMgr.getInstance().getRoleFactionId());
        this.setTabIcon(this.btn_hero_tab, faction.main_city_hero_tab_icon);
        this.setTabIcon(this.btn_soldier_tab, faction.main_city_soldier_tab_icon);
        this.setTabIcon(this.btn_main_city_tab, faction.main_city_city_tab_icon);
        this.setTabIcon(this.btn_pve_tab, faction.main_city_pve_tab_icon);
        this.setTabIcon(this.btn_pvp_tab, faction.main_city_pvp_tab_icon);
    }

    private setTabIcon(btn: BaseBtn, icon_id: number): void {
        btn.node.getChildByName('Icon').getComponent(BaseSprite).setIconData(icon_id);
    }

    /** 点自己的头像打开系统设置 */
    private onClickPlayer(): void {
        UIMananger.instance.showWin(SystemSettingWin);
    }

    private onClickVip(): void {
        // TODO 贵族界面还没有
    }


}


