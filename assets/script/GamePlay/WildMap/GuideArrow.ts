import { _decorator, Component, Node } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { MapGridData } from './MapGridData';
import { ROLE_DIR } from '../../Common/GameEnum';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { comp } from '../../Common/Decorator';
const { ccclass, property } = _decorator;

@ccclass('GuideArrow')
export class GuideArrow extends BaseComp {
    @comp(BaseSprite)
    gridBg: BaseSprite = null!;

    @comp(BaseSprite)
    arrow: BaseSprite = null!;

    static GUIDE_ANGLE = [0, -45, -90, -135, -180, 135, 90, 45]
    SetData(gridData: MapGridData, dir: ROLE_DIR) {
        this.node.setWorldPosition(gridData.GetWorldPos().toVec3());
        this.arrow.node.angle = GuideArrow.GUIDE_ANGLE[dir];
        this.gridBg.node.active = !gridData.walkable;
    }
    public clear(): void {
        super.clear();

    }
}


