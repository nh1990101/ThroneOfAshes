import { _decorator, Node } from 'cc';
import { child, comp } from '../../Common/Decorator';
import { GameUrl } from '../../Common/GameUrl';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { PageController } from '../../Component/PageController';
import { refreshNodeList } from '../../Component/NodeList';
import { SelectCmp, SelectMode } from '../../Component/SelectCmp';
import { GameEvent } from '../../Common/GameEnum';
import { FeatureMgr } from '../../Common/FeatureMgr';
import { FlyNoticeMgr } from '../BaseSystem/FlyNoticeMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { IDrawPoolData } from '../../Config/Typings/DrawPoolData';
import { HeroDrawCommonPage } from './HeroDrawCommonPage';
const { ccclass } = _decorator;

/** 酒馆。底栏切卡池，中间始终是同一张公共抽卡页 */
@ccclass('HeroDrawWin')
export class HeroDrawWin extends BaseWin {
    @comp(BaseBtn)
    btn_close: BaseBtn = null!;

    @comp(PageController)
    private pageCtrl: PageController = null!;

    @child()
    private tab_list: Node = null!;

    private tab_select: SelectCmp<Node> = null!;
    private tab_items: { pool: IDrawPoolData, node: Node }[] = [];
    private view_ready = false;

    public get Is_FullScene() {
        return true;
    }

    public init(): void {
        super.init();
        // 卡池表没有面板类型，寻访、号角、限时不在这张界面里做。只加载这一张公共页
        this.pageCtrl.RegisterPages([
            { url: GameUrl.DrawPrefab.format('HeroDrawCommonPage'), pageClass: HeroDrawCommonPage, indexPage: 1 },
        ]);
    }

    public initEvent(): void {
        // 卡池表没有玩法说明 id，btn_tips 先不打开说明
        // 卡池表没有背景和立绘，spine、bg 用预制体上摆好的
        this.addEvent(GameEvent.Feature_State, this.OnRefreshUI, this);
        this.buildTabs();
        super.initEvent();
    }

    /** 当前选中的卡池。公共页加载完还没收到参数时来问这个 */
    public getSelectedPool(): number | null {
        if (!this.tab_select) {
            return null;
        }
        const pool_id = this.tab_select.getSelect();
        return typeof pool_id === 'number' ? pool_id : null;
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        if (!this.view_ready) {
            return;
        }
        this.refreshTabs();
        this.selectEnterableTab();
        const pool_id = this.getSelectedPool();
        const page = this.pageCtrl.curPage as HeroDrawCommonPage;
        if (!page) {
            return;
        }
        if (pool_id == null || !this.canShowPool(pool_id)) {
            page.node.active = false;
            return;
        }
        page.showPage(pool_id);
    }

    /** 页签只建一次。重开窗口只刷当前卡池 */
    private buildTabs(): void {
        const pools = Array.from(ConfigMgr.instance.DrawPoolData.values())
            .filter(pool => pool.is_open)
            .sort((a, b) => a.id - b.id);
        this.tab_select = new SelectCmp<Node>(SelectMode.Single, (key, is_select, node) => {
            if (node) {
                node.getChildByName('select').active = is_select;
                node.getChildByName('unselect').active = !is_select;
            }
            if (is_select && typeof key === 'number' && this.pageCtrl.curPage && this.canShowPool(key)) {
                (this.pageCtrl.curPage as HeroDrawCommonPage).showPage(key);
            }
        });
        this.tab_items = [];
        refreshNodeList(this.tab_list, 'draw_tab', pools, (node, pool) => {
            this.bindTab(node, pool);
        });
        this.view_ready = true;
        this.selectEnterableTab();
    }

    private bindTab(node: Node, pool: IDrawPoolData): void {
        this.tab_items.push({ pool, node });
        this.refreshTab(node, pool);
        const name = pool.name ?? '';
        node.getChildByPath('select/label').getComponent(BaseLabel).setText(name);
        node.getChildByPath('unselect/label').getComponent(BaseLabel).setText(name);
        this.addNodeEvent(node, Node.EventType.TOUCH_END, () => {
            this.onClickTab(pool);
        });
        this.tab_select.addKey(pool.id, node);
    }

    private refreshTabs(): void {
        for (const item of this.tab_items) {
            this.refreshTab(item.node, item.pool);
        }
    }

    private refreshTab(node: Node, pool: IDrawPoolData): void {
        const feature = FeatureMgr.getInstance();
        const feature_id = pool.feature_id;
        node.active = feature.isFeatureVisible(feature_id);
        node.getChildByName('lock').active = !!feature_id && !feature.canEnterFeature(feature_id);
    }

    private onClickTab(pool: IDrawPoolData): void {
        const feature_id = pool.feature_id;
        if (feature_id && !FeatureMgr.getInstance().canEnterFeature(feature_id)) {
            const desc = FeatureMgr.getInstance().getFeatureLockDesc(feature_id);
            if (desc) {
                void FlyNoticeMgr.getInstance().showTexts(desc);
            }
            return;
        }
        this.tab_select.setSelect(pool.id, true);
    }

    /** 单选会自动选中第一个。第一个不能进时，改选到第一个能进的卡池 */
    private selectEnterableTab(): void {
        const selected_id = this.getSelectedPool();
        const selected = this.tab_items.find(item => item.pool.id === selected_id);
        if (selected && this.canEnterPool(selected.pool)) {
            return;
        }
        for (const item of this.tab_items) {
            if (this.canEnterPool(item.pool)) {
                this.tab_select.setSelect(item.pool.id, true);
                return;
            }
        }
    }

    private canEnterPool(pool: IDrawPoolData): boolean {
        if (!pool.feature_id) {
            return true;
        }
        return FeatureMgr.getInstance().canEnterFeature(pool.feature_id);
    }

    /** 这个卡池还能不能打开抽卡页 */
    public canShowPool(pool_id: number): boolean {
        for (const item of this.tab_items) {
            if (item.pool.id === pool_id) {
                return this.canEnterPool(item.pool);
            }
        }
        return false;
    }
}
