import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;


export class ServerData {
    private _date: Date;
    public initData() {
        this._date = new Date();
    }
    /**获取服务器时间 */
    public getServerTime() {
        return this._date.getTime();
    }
}


