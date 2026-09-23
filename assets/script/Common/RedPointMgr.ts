import { _decorator, Component, Node } from 'cc';
import { BaseMgr } from './BaseMgr';
import { RedPoint } from '../Component/RedPoint';
import { EventManager } from './EventManager';
import { Tools } from './Tools';
const { ccclass, property } = _decorator;

export interface RedPointRegisterData {
    rootRed: RED_ID;
    parentReds: RED_ID[];
    events: string[];
    callFunc: Function;
    callArea: any;
    params: any[]
}
export enum RED_ID {
    RED_ID1 = 1,//红点id
    
}
@ccclass('RedPointMgr')
export class RedPointMgr extends BaseMgr {
    protected mapRedData = new Map<RED_ID, RedPointData>();
    protected dataList: RedPointRegisterData[]

    RegisterRedPointId(id: RED_ID, redPoint: RedPoint) {
        var redPointData: RedPointData = this.getRedPointData(id);
        redPointData.redPoint = redPoint;
        redPoint.isRed = redPointData.isRed;
    }
    public unRegistorEvent(): void {
        if (this.dataList) {
            var list = this.dataList;
            list.forEach(redRegister => {
                redRegister.events.forEach(eventName => {

                    EventManager.Instance.removeListener(eventName, this.updateRedDataFunc.bind(this, redRegister), this)

                })
            })
            var dic = EventManager.Instance.dict;
        }
    }
    initData() {
        var list: RedPointRegisterData[] = [
            // {
            //     rootRed: RED_ID.DOCTOR_UPGRADE_ITEM, parentReds: [RED_ID.DOCTOR_UPGRADE_BTN, RED_ID.DOCTOR],
            //     callFunc: DoctorMgr.getInstance().onCheckRed, callArea: DoctorMgr.getInstance(), params: DoctorMgr.getInstance().configArr,
            //     events: [GameEvent.DOCTOR_INFO_UPDATE, GameEvent.BAG_ITEMS_UPDATE]
            // }, {
            //     rootRed: RED_ID.FISH_LEVEL, parentReds: [RED_ID.FISH],
            //     callFunc: FishMgr.getInstance().onCheckFishLevelRed, callArea: FishMgr.getInstance(), params: null,
            //     events: [GameEvent.FISH_EXP_UPDATE]
            // }, {
            //     rootRed: RED_ID.FISH_START, parentReds: [RED_ID.FISH],
            //     callFunc: FishMgr.getInstance().onCheckStartFishRed, callArea: FishMgr.getInstance(), params: null,
            //     events: [GameEvent.BAG_ITEMS_UPDATE]
            // }, {
            //     rootRed: RED_ID.PATIENT_NAV, parentReds: [RED_ID.PATENT],
            //     callFunc: PatientMgr.getInstance().onCheckPatientRed, callArea: PatientMgr.getInstance(), params: null,
            //     events: [GameEvent.PATIENT_INFO_UPDATE]
            // }, {
            //     rootRed: RED_ID.DOCTOR_NEW_ITEM, parentReds: [RED_ID.DOCTOR_NEW],
            //     callFunc: DoctorMgr.getInstance().onCheckNewRed, callArea: DoctorMgr.getInstance(), params: DoctorMgr.getInstance().configArr,
            //     events: [GameEvent.DOCTOR_INFO_UPDATE]
            // },
        ]
        list.forEach(redRegister => {
            redRegister.events.forEach(eventName => {

                EventManager.Instance.addListener(eventName, this.updateRedDataFunc.bind(this, redRegister), this)

            })
            var params = redRegister.params;

            if (params && params.length > 0) {
                for (let i = 0; i < params.length; i++) {
                    let id = redRegister.rootRed + i;
                    let redData = this.getRedPointData(id);
                    if (redData) {
                        this.setParentData(redData, redRegister.parentReds)
                    }
                }
            } else {
                let id = redRegister.rootRed
                let redData = this.getRedPointData(id);
                if (redData) {
                    this.setParentData(redData, redRegister.parentReds)
                }
            }
            this.updateRedDataFunc(redRegister)
        })
        this.dataList = list;
    }

    getRedPointData(id: number) {
        let redData = this.mapRedData.get(id);
        if (!redData) {
            this.mapRedData.set(id, new RedPointData())
            redData = this.mapRedData.get(id);
            redData.redId = id;
        }
        return redData;
    }
    setParentData(rootData: RedPointData, Ids: RED_ID[]) {
        let redIds = Ids.concat();
        let childFirst = rootData
        let parentFirst = this.getRedPointData(redIds[0]);
        childFirst.parent = parentFirst
        Tools.insertArr(parentFirst.childs, childFirst)

        while (redIds && redIds.length > 1) {
            let child = this.getRedPointData(redIds.shift())
            let parent = this.getRedPointData(redIds[0]);
            child.parent = parent
            if (parent.childs.indexOf(child) < 0) {
                Tools.insertArr(parent.childs, child)
            }
        }
    }
    updateRedDataFunc(data: RedPointRegisterData) {
        if (data) {
            var params = data.params;

            if (params && params.length > 0) {
                for (let i = 0; i < params.length; i++) {
                    let p = params[i]
                    let redData = this.mapRedData.get(data.rootRed + i);
                    if (redData) {
                        redData.isRed = data.callFunc.apply(data.callArea, [p])
                    }
                }

            } else {
                let redData = this.mapRedData.get(data.rootRed);
                redData.isRed = data.callFunc.apply(data.callArea)
            }
        }
    }

}
export class RedPointData {

    redId: number;
    parent: RedPointData;
    redPoint: RedPoint;
    childs: RedPointData[] = [];
    private _isRed: boolean;
    updateData() {
        if (this.childs && this.childs.length > 0) {
            var isRed = false;
            var len = this.childs.length;
            for (let i = 0; i < len; i++) {
                if (this.childs[i].isRed) {
                    isRed = true;
                    break;
                }
            }
            this.isRed = isRed;
        }
    }
    set isRed(red: boolean) {
        this._isRed = red;
        if (this.redPoint) {
            this.redPoint.isRed = red;
        }
        if (this.parent) {
            // this.parent.isRed = red;
            this.parent.updateData();
        }
    }
    get isRed() {
        return this._isRed;
    }
}


