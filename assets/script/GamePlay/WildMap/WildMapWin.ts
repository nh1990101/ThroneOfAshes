import { _decorator, Camera, Component, Node } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { MapMgr } from './MapMgr';
const { ccclass, property } = _decorator;

@ccclass('WildMapWin')
export class WildMapWin extends BaseWin {
    /**地图块容器 */
    protected mapContainer: Node = null;
    protected mapId: number = null;
    /**地图摄像机 */
    protected mapCamera: Camera = null;
    public init(): void {
        super.init();
        this.mapContainer = this.node.getChildByName("mapContainer");
        this.mapCamera = this.getComponentInChildren(Camera);
    }
    showWin(mapId: number): void {
        super.showWin(mapId);
        this.mapId = mapId;
        this.Mgr.LoadMap(mapId).then(this.initMap);
    }
    initMap() {
        var cfg = MapMgr.getInstance().getMapCfg();
    }
    get Mgr() {
        return MapMgr.getInstance();
    }
}


