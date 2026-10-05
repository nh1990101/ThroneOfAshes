import { _decorator, Component, Node, Vec2 } from 'cc';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { GameUrl } from '../../Common/GameUrl';
const { ccclass, property } = _decorator;
/**
 * 地图块图片
 */
@ccclass('MapBlock')
export class MapBlock extends Component {
    @property(BaseSprite)
    mapImg: BaseSprite = null;
    /**地图块坐标 */
    protected pos: Vec2;
    /**地图ID */
    protected mapId: number;
    protected onLoad(): void {
        this.mapImg = this.getComponentInChildren(BaseSprite);
    }
    start() {

    }

    update(deltaTime: number) {

    }

    SetData(mapId: number, pos: Vec2) {
        this.pos = pos;
        this.mapId = mapId
        this.mapImg.node.active = false;
    }
    ShowMapCell() {
        this.mapImg.node.active = true;
        this.mapImg.setSpriteFromSingle(GameUrl.WildMapBlockUrl.format(this.mapId, this.pos.x, this.pos.y));
    }
    HideMapCell() {
        this.mapImg.node.active = false;
        this.mapImg.releaseSprite();
    }
}


