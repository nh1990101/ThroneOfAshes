import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MapEditor')
export class MapEditor extends Component {
    @property(Node)
    MapLayer: Node;
    @property(Node)
    MapObjLayer: Node;
    start() {

    }

    update(deltaTime: number) {

    }
}


