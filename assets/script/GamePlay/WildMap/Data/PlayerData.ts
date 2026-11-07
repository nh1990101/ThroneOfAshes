import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

export class PlayerData {
    /**玩家ID */
    public uId: number;
    /**种族 */
    public Race: number = 1;
    public initData() {
        this.Race = 1;
        this.uId = 1;
    }
}


