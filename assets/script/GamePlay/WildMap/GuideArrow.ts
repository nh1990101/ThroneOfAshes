import { _decorator, Component, Node } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { MapGridData } from './MapGridData';
import { ROLE_DIR } from '../../Common/GameEnum';
const { ccclass, property } = _decorator;

@ccclass('GuideArrow')
export class GuideArrow extends BaseComp {
    static GUIDE_ANGLE = [0, -45, -90, -135, -180, 135, 90, 45]
    SetData(gridData: MapGridData, dir: ROLE_DIR) {
        this.node.setWorldPosition(gridData.GetWorldPos().toVec3());
        this.node.angle = GuideArrow.GUIDE_ANGLE[dir];
    }
    public clear(): void {
        super.clear();

    }
}


