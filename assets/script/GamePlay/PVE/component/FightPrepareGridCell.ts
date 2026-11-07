import { _decorator, tween, Tween, UIOpacity } from 'cc';
import { HexagonCell } from '../../Battle/HexagonCell';
import { GameUrl } from '../../../Common/GameUrl';
const { ccclass, property } = _decorator;

@ccclass('FightPrepareGridCell')
export class FightPrepareGridCell extends HexagonCell {



    /**更新显示状态 */
    public UpdateShowStatus() {
        //如果是高亮状态下（即检测状态），根据格子是否可移动来显示颜色
        if (this.m_data.highlighted) {
            if (!this.m_data.isEmpty()) {
                this.SetYellow();
            }
            else if (this.m_data.isWalkable()) {
                this.SetBlue();
            }
            else {
                this.SetRed();
            }
        } else {
            this.SetNormal();
        }
    }
    
 
    /**格子回收（对象池复用）时必须停掉动画 */
    public clear(): void {
        // this.stopBreath();
        super.clear();
    }
}
