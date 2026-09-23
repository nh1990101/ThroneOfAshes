import { _decorator, Component, Node } from 'cc';
import { BaseMgr } from './BaseMgr';
import { MainMgr } from '../GamePlay/MainCity/MainMgr';
const { ccclass, property } = _decorator;

@ccclass('GlobalData')
export class GlobalData {
    protected static mgrList: (typeof BaseMgr)[]
    public static serverDate: Date;

    public static ResolutionPolicy: number;

    public static initData() {
     
        this.mgrList = [MainMgr]
        this.serverDate = new Date();
        this.mgrList.forEach(cls => {
            const instance = cls.getInstance();
            instance.eventRegistor();
        });

    }
    static getSoundDenyState() {
        return false;
    }
}


