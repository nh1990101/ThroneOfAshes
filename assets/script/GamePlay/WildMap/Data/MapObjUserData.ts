import { _decorator, Component, Node } from 'cc';
import { IMapObject } from '../MapConfig';
import { GlobalData } from '../../../Common/GlobalData';
const { ccclass, property } = _decorator;


export class MapObjUserData {
    constructor() {
    }

    public setData(cfg: IMapObject, mapId: number) {
        this.cfg = cfg;
        this.cfg.id = Number(this.cfg.id);
        this._uId = MapObjUserData.FormatUID(mapId, cfg.gridX, cfg.gridY, cfg.id);
    }
    public cfg: IMapObject;
    private _uId: string;
    public get uId() {
        return this._uId;
    }
    public static FormatUID(mapId: number, x: number, y: number, mapResId: number) {
        return `${mapId}_${x}_${y}_${mapResId}`;
    }
    /**当前归属的玩家ID */
    public ownPlayerId: number;
    /**当前归属的玩家阵营 */
    public OccupyRace: number;
    /**是否已发现 */
    public get hasFinded(): boolean {
        return GlobalData.wildData.checkHasFind(this.uId);
    }
    public Clear() {
        this.cfg = null;
        this.ownPlayerId = null;
        this.OccupyRace = null;
    }
    /**设置占领后的数据 */
    public SetOccupy(playerId: number, Race: number) {
        this.ownPlayerId = playerId;
        this.OccupyRace = Race;
    }
    /**判断是否可以被占领 */
    public isCanOccupy() {
        return !this.ownPlayerId && !this.OccupyRace
    }
    public isEqual(x: number, y: number) {
        return this.cfg.gridX == x && this.cfg.gridY == y;
    }
}


