import { _decorator, Layout, Node } from 'cc';
import { BasePage } from '../../../Component/BasePage';
import { BaseBtn } from '../../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../../Component/BaseComp/BaseLabel';
import { BaseSprite } from '../../../Component/BaseComp/BaseSprite';
import { child, comp } from '../../../Common/Decorator';
import { FeatureMgr } from '../../../Common/FeatureMgr';
import { GameEvent } from '../../../Common/GameEnum';
import { lang } from '../../../Common/LangMgr';
import { RoleMgr } from '../../../Common/RoleMgr';
import { refreshNodeList } from '../../../Component/NodeList';
import { ConfigMgr } from '../../../Config/ConfigMgr';
import { IMainUISideBtnData } from '../../../Config/Typings/MainUISideBtnData';
import { UIMananger } from '../../../Component/UIMananger';
import { TechTreeMgr } from '../../TechTree/TechTreeMgr';
import { TechTreeWin } from '../../TechTree/TechTreeWin';
import { HallWin } from '../../Hall/HallWin';
import { BarracksWin } from '../../Barracks/BarracksWin';
import { ShopWin } from '../../Shop/ShopWin';
const { ccclass, property } = _decorator;

@ccclass('MainPage')
export class MainPage extends BasePage {
    @comp(BaseBtn)
    btn_bouleuterion: BaseBtn = null!;

    @comp(BaseBtn)
    btn_magicTower: BaseBtn = null!;

    @comp(BaseBtn)
    btn_barracks: BaseBtn = null!;

    @comp(BaseBtn)
    btn_tavern: BaseBtn = null!;

    @comp(BaseBtn)
    btn_templeOfHolyLight: BaseBtn = null!;

    @comp(BaseBtn)
    btn_market: BaseBtn = null!;

    @comp(BaseBtn)
    btn_family: BaseBtn = null!;

    @comp(BaseSprite)
    bg: BaseSprite = null!;

    @child()
    left_btns: Node = null!;

    @child()
    right_btns: Node = null!;

    private side_ready = false;
    private side_btns: { node: Node, row: IMainUISideBtnData }[] = [];

    public initEvent(): void {
        this.addEvent(GameEvent.Feature_State, this.OnRefreshUI, this);
        super.initEvent();
        // 建筑按钮事件
        this.addNodeEvent(this.btn_family.node, Node.EventType.TOUCH_END, this.OnClickFamily);
        this.addNodeEvent(this.btn_market.node, Node.EventType.TOUCH_END, this.OnClickMarket);
        this.addNodeEvent(this.btn_templeOfHolyLight.node, Node.EventType.TOUCH_END, this.OnClickTempleOfHolyLight);
        this.addNodeEvent(this.btn_tavern.node, Node.EventType.TOUCH_END, this.OnClickTavern);
        this.addNodeEvent(this.btn_barracks.node, Node.EventType.TOUCH_END, this.OnClickBarracks);
        this.addNodeEvent(this.btn_magicTower.node, Node.EventType.TOUCH_END, this.OnClickMagicTower);
        this.addNodeEvent(this.btn_bouleuterion.node, Node.EventType.TOUCH_END, this.OnClickBouleuterion);
        this.buildSideBtns();
    }
    public OnRefreshUI(): void {
        super.OnRefreshUI();
        const faction = ConfigMgr.instance.FactionData.get(RoleMgr.getInstance().getRoleFactionId());
        this.bg.setIconData(faction.main_city_bg);
        this.refreshSideBtns();
    }

    private buildSideBtns(): void {
        if (this.side_ready) {
            return;
        }
        this.side_ready = true;
        this.side_btns = [];
        this.createSideBtns(this.left_btns, true);
        this.createSideBtns(this.right_btns, false);
    }

    private refreshSideBtns(): void {
        if (!this.side_ready) {
            return;
        }
        for (const item of this.side_btns) {
            this.paintSideBtn(item.node, item.row);
        }
        this.left_btns.getComponent(Layout).updateLayout();
        this.right_btns.getComponent(Layout).updateLayout();
    }

    /** 左右按钮按表建一次。显隐变化不换节点，点击始终对应当初那一行 */
    private createSideBtns(parent: Node, is_left: boolean): void {
        refreshNodeList(parent, 'btn', this.getSideBtns(is_left), (node, row) => {
            this.side_btns.push({ node, row });
            this.paintSideBtn(node, row);
            this.addNodeEvent(node, Node.EventType.TOUCH_END, () => this.onClickSideBtn(row));
        });
    }

    private getSideBtns(is_left: boolean): IMainUISideBtnData[] {
        const rows: IMainUISideBtnData[] = [];
        ConfigMgr.instance.MainUISideBtnData.forEach((row) => {
            if (row.is_left !== is_left) {
                return;
            }
            rows.push(row);
        });
        rows.sort((a, b) => a.sort - b.sort || a.id - b.id);
        return rows;
    }

    private isSideBtnVisible(navigate_id: string): boolean {
        const nav = ConfigMgr.instance.NavigateData.get(navigate_id);
        if (!nav) {
            return true;
        }
        return FeatureMgr.getInstance().isFeatureVisible(nav.feature, nav.hide_cant_enter);
    }

    private paintSideBtn(node: Node, row: IMainUISideBtnData): void {
        node.active = this.isSideBtnVisible(row.navigate);
        if (row.btn_bg != null) {
            node.getComponent(BaseSprite).setIconData(row.btn_bg);
        }
        node.getChildByName('icon').getComponent(BaseSprite).setIconData(row.btn_icon);
        node.getChildByName('label').getComponent(BaseLabel).setText(row.btn_name);
    }

    private onClickSideBtn(row: IMainUISideBtnData): void {
        const nav = ConfigMgr.instance.NavigateData.get(row.navigate);
        if (!nav || !nav.nav_data) {
            console.log('点击' + lang(row.btn_name));
            return;
        }
        FeatureMgr.getInstance().openNavigate(row.navigate);
    }
    OnClickFamily() {
        // TODO 联盟
        console.log('点击联盟按钮');
    }
    OnClickMarket() {
        UIMananger.instance.showWin(ShopWin);
    }
    OnClickTempleOfHolyLight() {
        // TODO 圣光神殿
        console.log('点击圣光神殿按钮');
    }
    OnClickTavern() {
        FeatureMgr.getInstance().openNavigate('TavernDraw');
    }
    OnClickBarracks() {
        UIMananger.instance.showWin(BarracksWin);
    }
    OnClickMagicTower() {
        const mgr = TechTreeMgr.getInstance();
        if (!mgr.hasOpenTechType()) {
            UIMananger.instance.showFlyNotice(mgr.getTechLockedNotice());
            return;
        }
        UIMananger.instance.showWin(TechTreeWin);
    }
    OnClickBouleuterion() {
        UIMananger.instance.showWin(HallWin);
    }

}


