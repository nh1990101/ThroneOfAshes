import { _decorator, Node } from 'cc';
import { BasePage } from '../../../Component/BasePage';
import { comp } from '../../../Common/Decorator';
import { BaseBtn } from '../../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../../Component/BaseComp/BaseLabel';
import { SelectCmp, SelectMode } from '../../../Component/SelectCmp';
import { PageController } from '../../../Component/PageController';
import { GameUrl } from '../../../Common/GameUrl';
import { lang } from '../../../Common/LangMgr';
import { HeroListPage } from '../../Hero/HeroListPage';
const { ccclass } = _decorator;

@ccclass('HeroPage')
export class HeroPage extends BasePage {

    @comp(BaseBtn)
    btn_tab_hero: BaseBtn = null!;

    @comp(BaseBtn)
    btn_tab_artifact: BaseBtn = null!;

    @comp(BaseBtn)
    btn_tab_illustration: BaseBtn = null!;

    @comp(BaseBtn)
    btn_tab_formation: BaseBtn = null!;

    @comp(PageController)
    pageCtrl: PageController = null!;

    private tabSelect: SelectCmp<Node>;
    /** 底部英雄页只在第一次打开时选中。tabSelect 可能比 showPage 更晚就绪 */
    private heroTabApplied = false;

    public init(): void {
        super.init();
        this.pageCtrl.RegisterPages([
            { url: GameUrl.HeroPrefab.format('HeroListPage'), pageClass: HeroListPage, indexPage: 1 },
        ]);
    }

    public initEvent(): void {
        this.initTabSelect();
        super.initEvent();
        this.applyHeroTab();
    }

    public showPage(...param): void {
        this.applyHeroTab();
        super.showPage(...param);
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
    }

    /** tabSelect 还没创建时先跳过，等 initEvent 建好再切一次默认页 */
    private applyHeroTab(): void {
        if (this.heroTabApplied || !this.tabSelect) {
            return;
        }
        this.heroTabApplied = true;
        this.tabSelect.setSelect(this.btn_tab_hero.node, true);
    }

    private initTabSelect() {
        const tabs: { btn: BaseBtn, name: number }[] = [
            { btn: this.btn_tab_hero, name: 1 },
            { btn: this.btn_tab_artifact, name: 2 },
            { btn: this.btn_tab_illustration, name: 3 },
            { btn: this.btn_tab_formation, name: 4 },
        ];
        this.tabSelect = new SelectCmp<Node>(SelectMode.Single, (key, isSelect) => {
            this.setTabSelected(key as Node, isSelect);
            if (isSelect) {
                this.pageCtrl.switchPage(1);
            }
        });
        for (const tab of tabs) {
            const text = lang(tab.name);
            tab.btn.node.getChildByPath('select/label').getComponent(BaseLabel).setText(text);
            tab.btn.node.getChildByPath('unselect/label').getComponent(BaseLabel).setText(text);
            this.tabSelect.addKey(tab.btn.node, tab.btn.node);
            this.addNodeEvent(tab.btn.node, Node.EventType.TOUCH_END, () => {
                this.tabSelect.setSelect(tab.btn.node, true);
            });
        }
    }

    private setTabSelected(tabNode: Node, isSelect: boolean) {
        tabNode.getChildByName('select').active = isSelect;
        tabNode.getChildByName('unselect').active = !isSelect;
    }
}
