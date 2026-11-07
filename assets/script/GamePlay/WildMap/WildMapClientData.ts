import { _decorator, Component, Node, Vec2 } from 'cc';
import { EventManager } from '../../Common/EventManager';
import { GameEvent, ROLE_DIR } from '../../Common/GameEnum';
import { Tools } from '../../Common/Tools';
import { MapObjUserData } from './Data/MapObjUserData';
const { ccclass, property } = _decorator;
export interface MAP_OBJ_STATE {
    /**归属的占领者ID */
    occupiedPlayerId: number;
    /**地图物体是否消失 */
    isDissapear: boolean;
    /**已触发次数 */
    usedTime: number;
    /**下次复活时间 */
    nextReliveTime: number;
}
/**
 * 野外地图PVE单机数据
 */
export class WildMapClientData {
    /**体力 */
    public energy: number;
    /**(当前地图)已打怪数量 地图ID->已击杀波数*/
    public killMonster: Map<number, number> = new Map();
    /**当前地图最大怪物数量 */
    public monsterMax: number;
    /**当前章 */
    public chapter = 1;
    /**当前节 */
    public copyIndex = 1;
    /**角色当前位置(逻辑格子位置) */
    public myRoleGridX: number = null;
    public myRoleGridY: number = null;
    public myRoleDir: ROLE_DIR;

    /**移动过的格子 */
    public map_hasArrivesPos: Map<number, Map<string, { x: number, y: number }>> = new Map();
    /**地图物体占领和消失状态 */
    public mapObjState: Map<string, MAP_OBJ_STATE>;
    /**发现的地图物体 */
    public arrMapObjFind: string[] = [];
    /**移动暗雷步数统计 */
    public surferFightStep = 0;



    public getRolePos() {

        return this.myRoleGridX != null ? { x: this.myRoleGridX, y: this.myRoleGridY } : null;
    }
    public ClearRolePos() {
        this.myRoleDir = null;
        this.myRoleGridX = this.myRoleGridY = null;
    }
    public initData() {
        this.energy = 100;
        this.chapter = 1;
    }

    public setMapObjOccupy(uId: string, occupiedPlayerId: number) {
        var mapstate: MAP_OBJ_STATE = this.getMapObjState(uId);
        mapstate.occupiedPlayerId = occupiedPlayerId;
    }
    public setMapObjDissapear(uId: string, isDissapear: boolean) {
        var mapstate: MAP_OBJ_STATE = this.getMapObjState(uId);
        mapstate.isDissapear = isDissapear;
    }
    public getMapObjState(uId: string) {
        if (!this.mapObjState) {
            this.mapObjState = new Map<string, MAP_OBJ_STATE>();
        }
        var mapstate: MAP_OBJ_STATE = this.mapObjState.get(uId)
        if (!mapstate) {
            mapstate = { occupiedPlayerId: null, isDissapear: false, usedTime: 0, nextReliveTime: 0 };
            this.mapObjState.set(uId, mapstate);
        }
        return mapstate;
    }
    /**增加击杀怪物波数数量 */
    public addKillMonster(mapId: number, killNum = 1) {
        if (!this.killMonster.get(mapId)) {
            this.killMonster.set(mapId, 0);
        }
        var num = this.killMonster.get(mapId);
        num += 1;
        this.killMonster.set(mapId, num);
        EventManager.Instance.dispatch(GameEvent.UpdateMapDiscover);
    }
    public getKillMonserNum(mapId: number) {
        if (!this.killMonster.get(mapId)) {
            this.killMonster.set(mapId, 0);
        }
        return this.killMonster.get(mapId);
    }
    /**体力更新 */
    public reduceEnergy() {
        this.energy--;
        EventManager.Instance.dispatch(GameEvent.UpdateEnergy)
    }
    /**按地图ID记录玩家坐标*/
    public addMovePoint(mapId: number, x: number, y: number) {
        var points = this.getMovePoints(mapId);
        var keyPos = Tools.formatPosKey(x, y);
        if (!points.get(keyPos)) {
            points.set(keyPos, { x: x, y: y });
        }
    }
    public getMovePoints(mapId: number) {
        var points = this.map_hasArrivesPos.get(mapId)
        if (!points) {
            points = new Map();
            this.map_hasArrivesPos.set(mapId, points)
        }
        return points;
    }
    /**发现该地图物体 */
    public addFindMapObj(uId: string) {
        if (!this.checkHasFind(uId)) {
            this.arrMapObjFind.push(uId);
        }
    }
    /**检测是否发现该地图物体 */
    public checkHasFind(uId: string): boolean {
        return this.arrMapObjFind.indexOf(uId) > -1;
    }

}


