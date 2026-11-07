import { _decorator, Layout } from 'cc';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { HeroCardComp, HeroCardData } from './HeroCardComp';
const { ccclass } = _decorator;

const CARD_NAMES = ['HeroCard1', 'HeroCard2', 'HeroCard3'];

/** 一行三张卡，heroes 是外面当前可见的整表，左右切换用 */
export interface HeroListRow {
    cards: HeroCardData[];
    heroes: HeroCardData[];
}

@ccclass('HeroListCell')
export class HeroListCell extends BaseRenderCell<HeroListRow> {
    private cards: HeroCardComp[] = [];

    public init() {
        super.init();
        const layout = this.node.getComponent(Layout);
        if (layout) {
            layout.enabled = false;
        }
        this.cards = [];
        for (const name of CARD_NAMES) {
            const node = this.node.getChildByName(name);
            if (!node) {
                continue;
            }
            this.cards.push(node.getComponent(HeroCardComp) || node.addComponent(HeroCardComp));
        }
    }

    public OnRefreshUI(): void {
        const row = this.getData();
        const list = row?.cards || [];
        const heroes = row?.heroes || [];
        for (let i = 0; i < this.cards.length; i++) {
            const card = this.cards[i];
            const data = list[i];
            card.node.active = !!data;
            if (data) {
                card.heroes = heroes;
                card.setData(data);
            }
        }
    }
}
