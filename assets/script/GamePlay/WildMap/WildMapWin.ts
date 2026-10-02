import { _decorator, Component, Node } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { MapMgr } from './MapMgr';
const { ccclass, property } = _decorator;

@ccclass('WildMapWin')
export class WildMapWin extends BaseWin {
    protected mapId: number;
    public init(): void {
        super.init();
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


