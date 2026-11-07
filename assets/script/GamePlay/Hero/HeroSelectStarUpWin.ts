import { _decorator, Node } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { GridScrollList, SCROLL_VERTICAL } from '../../Component/BaseComp/GridScrollList';
import { comp } from '../../Common/Decorator';
import type { HeroCardData } from './HeroTypes';
import { HeroMgr } from './HeroMgr';
import { HeroCostItemCell } from './HeroCostItemCell';
const { ccclass } = _decorator;

/** 点升星材料槽后，从当前能消耗的英雄里选一张 */
@ccclass('HeroSelectStarUpWin')
export class HeroSelectStarUpWin extends BaseWin {

    @comp(BaseBtn)
    btn_close: BaseBtn = null!;

    @comp(BaseBtn)
    btn_confirm: BaseBtn = null!;

    @comp(GridScrollList)
    hero_scroll: GridScrollList = null!;


    private heroes: HeroCardData[] = [];
    private selected?: HeroCardData;
    private picked?: HeroCardData;
    private onConfirm: (hero: HeroCardData) => void = null!;

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.btn_confirm.node, Node.EventType.TOUCH_END, this.onClickConfirm);
    }

    showWin(heroes: HeroCardData[], selected: HeroCardData | undefined, onConfirm: (hero: HeroCardData) => void): void {
        this.heroes = heroes;
        this.selected = selected;
        this.onConfirm = onConfirm;
        // 先显示再铺列表。窗口还关着时新建的图标不会走 onLoad，选中底还是空的
        super.showWin();
        this.fillHeroList();
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
    }

    /** 每次打开的名单不同，在 showWin 里铺列表 */
    private fillHeroList(): void {
        const index = this.selected ? this.heroes.findIndex(hero => hero.uuid ? hero.uuid === this.selected.uuid : hero === this.selected) : -1;
        this.picked = index >= 0 ? this.heroes[index] : undefined;
        const scroll = this.hero_scroll;
        scroll.autoSelectIndex = index;
        scroll.setSelectFunc((hero: HeroCardData) => {
            this.picked = hero;
        });
        scroll.setDataList(HeroCostItemCell, this.heroes, SCROLL_VERTICAL);
    }

    /** 已经点过一张才关窗，把这张交回去 */
    private onClickConfirm() {
        if (!this.picked) {
            return;
        }
        const hero = HeroMgr.getInstance().getHeroByUuid(this.picked.uuid);
        if (!hero) {
            return;
        }
        const confirm = this.onConfirm;
        this.closeWin();
        confirm(hero);
    }

}
