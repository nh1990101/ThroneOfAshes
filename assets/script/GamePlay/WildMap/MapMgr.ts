import { _decorator, Component, Node } from 'cc';
import { BaseMgr } from '../../Common/BaseMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
const { ccclass, property } = _decorator;

@ccclass('MapMgr')
export class MapMgr extends BaseMgr {
    public curMapId: number;
    public initEvent(): void {
        super.initEvent();
    }
    public async LoadMap(mapId: number) {
        this.curMapId = mapId;
        return ConfigMgr.instance.loadWildMapConfig(mapId);
    }
    public getMapCfg() {
        return ConfigMgr.instance.wildMapConfig.get(this.curMapId);
    }
    /**初始化地图 */
    initMap() {
      
    }
}


