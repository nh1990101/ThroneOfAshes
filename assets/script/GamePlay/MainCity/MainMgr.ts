import { _decorator, Component, Node } from 'cc';
import { BaseMgr } from '../../Common/BaseMgr';
const { ccclass, property } = _decorator;

@ccclass('MainMgr')
export class MainMgr extends BaseMgr {
    public initEvent() {
        super.initEvent();
        // this.addEvent(CmdGameNtfItemInit, this.initItems, this)
        // this.addEvent(CmdGameNtfItemUpdate, this.updateItems, this)


    }
    // initItems(data: NtfItemInit, code: Code) {
    //     if (code == CodeSuccess) {
    //         this._mapItem = new Map<number, Item>();
    //         var funcItems = ConfigMgr.instance.function_prop_tbl;

    //         funcItems.forEach((item, key) => {
    //             this._mapItem.set(item.ID, { id: item.ID, count: 0 })
    //         })
    //         this.updateItems(data, code)
    //         EventManager.Instance.dispatch(GameEvent.BAG_ITEMS_UPDATE)
    //     }
    // }
    // updateItems(data: NtfItemUpdate, code: Code) {
    //     if (code == CodeSuccess) {
    //         data.items.forEach(it => {
    //             this._mapItem.set(it.id, it)
    //         })
    //         EventManager.Instance.dispatch(GameEvent.BAG_ITEMS_UPDATE)
    //     }
    // }



}


