import { _decorator, BatchedSkinningModelComponent, Component, Node, Prefab } from 'cc';
import { BaseComp } from './BaseComp';
import { BaseRenderCell } from './BaseRenderCell';
import { AssetMgr } from '../Common/AssetMgr';
const { ccclass, property } = _decorator;

@ccclass('GroupList')
export class GroupList extends BaseComp {
    @property(Prefab)
    itemPrefab: Prefab;

    private _arrDatas: any[];
    private itemClass: new () => BaseRenderCell
    start(): void {
        super.start();
        console.log("grouplist")
    }

    public updateList<T extends BaseRenderCell = BaseRenderCell>(arr: any[], itemClass: new () => T) {
        if (!arr) {
            return;
        }
        this._arrDatas = arr;
        this.itemClass = itemClass;
        this.OnCheckRefreshUI();

    }
    public OnRefreshUI(): void {
        super.OnRefreshUI();
        var childs = this.node.children;
        if (!this._arrDatas) {
            return;
        }
        for (let i = 0; i < this._arrDatas.length; i++) {
            var cell: Node;
            if (childs.length - 1 >= i) {
                cell = childs[i];
            } else {
                cell = AssetMgr.createPrefabFromPoolByPrefab(this.itemPrefab, this.itemClass);
                cell.parent = this.node;
            }
            if (cell) {
                var itemCell = cell.getComponent(this.itemClass);
                if (!itemCell) {
                    itemCell = cell.addComponent(this.itemClass);
                }
                if (itemCell) {
                    itemCell.node.active = true;
                    itemCell.setData(this._arrDatas[i]);
                }
            }
        }
      
        var max=this.node.children.length;
        for (let i = this._arrDatas.length; i < max; i++) {
            childs[i].active = false;
        }
    }

}


