import { _decorator, Component, Node } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { AnimationCom } from '../../Component/AnimationCom';
import { IUnitData } from '../../Config/Typings/UnitData';
import { ResUrl } from '../../Common/GameEnum';
import { ConfigMgr } from '../../Config/ConfigMgr';
const { ccclass, property } = _decorator;

@ccclass('UnitCom')
export class UnitCom extends BaseComp {
    @property(AnimationCom)
    animation: AnimationCom;

    private _data: IUnitData;
    start(): void {
        super.start();
        this.SetData(ConfigMgr.instance.UnitData.get(1001));
    }
    public async SetData(data: IUnitData) {
        this._data = data;
        await this.animation.loadFramesFromAtlas(`${ResUrl.UnitAtlasUrl}${data.id}`, "");
        this.animation.play(0, 5);
    }
}


