import { _decorator, Component, EventTouch, Node, Prefab, ScrollView, UITransform, Vec2 } from 'cc';
import { BaseRenderCell } from '../BaseRenderCell';
import { Tools } from '../../Common/Tools';
import { AssetMgr } from '../../Common/AssetMgr';
const { ccclass, property } = _decorator;
/**横向排布拖动*/
export const SCROLL_HORIZONTAL: number = 1;
/**竖向排布拖动*/
export const SCROLL_VERTICAL: number = 2;
@ccclass('ScrollList')
export class ScrollList extends ScrollView {

    /**item子节点预制体*/
    @property({ type: Prefab, tooltip: "item子节点预制体" })
    itemPrefab: Prefab = null;

    @property({ type: Number, tooltip: "上下左右的元素位置偏移值" })
    offSetPos: number = 0;

    /**单条记录高度*/
    private _itemSize: number;

    /**需要多少个记录组件 在可视范围内+2条*/
    private _numItem: number = 0;

    private _itemArr: Array<Node> = [];

    /**当前最大节点下标*/
    private _itemIndex: number = 0;

    /**当前最大数据下标*/
    private _dataIndex: number = 0;

    /**数据源*/
    private _dataArr: any[];

    /**滚动方向*/
    private _direction: number = 0;

    /**间隙 0=开始边框，1=结束边框，2=间隙*/
    private _gapNum: number[];

    /**选中回调 */
    private _selectFunc: Function;

    /**当前选中的数据索引（不是视觉索引）*/
    private _selectedDataIndex: number = -1;

    /**当前选中的数据项*/
    private _selectedData: any = null;

    /**子节点刷新绑定事件，或者使用item继承的模式*/
    public onItemRender: Function;

    /**选中后是否自动滚动到选中项 */
    autoScrollToSelected: boolean = false;

    /**初始化列表后是否自动选中第一个元素 */
    autoSelectIndex = 0;


    pools: Node[] = []

    start() {
        this.node.on('scrolling', this.scrollCheck, this);
    }

    onDestroy() {
        if (this.node) {
            this.node.off('scrolling', this.scrollCheck, this);
        }
    }
    // protected onEnable(): void {
    //     super.onEnable();
    //     this.scrollCheck();
    // }
    public onDisable(): void {
        this.stopAutoScroll();
    }
    /**设置数据
     * @param dataArr : 数据源
     * @param direction : 滚动方向，默认上下
     * @param gap : [开始边框距离，结束边框距离，每个之间空隙]
    */
    public setDataList(dataArr: any[], direction: number = SCROLL_VERTICAL, gap?: number[]) {
        this._dataArr = dataArr;
        this._direction = direction;
        this._gapNum = gap;
        this._selectedDataIndex = -1;
        this._selectedData = null;
        this.createList();
    }

    public setSelectFunc(selectFunc: Function) {
        this._selectFunc = selectFunc;
    }

    updateList(dataArr: any[]) {
        if (!this._dataArr || this._dataArr.length != dataArr.length) {
            this._dataArr = dataArr;
            this.createList()
        } else {
            this._dataArr = dataArr;
            let from = Math.max(this._dataIndex - this._numItem + 1, 0)
            var numCell = this._itemArr.length;

            var copy = [...this._itemArr].sort((a: Node, b: Node) => {
                if (this._direction == SCROLL_VERTICAL) {
                    return a.y > b.y ? -1 : 1
                } else {
                    return a.x > b.x ? -1 : 1
                }
            })
            for (let i = 0; i < numCell; i++) {
                const item = copy[i].getComponent(BaseRenderCell)
                if (item) {
                    item.setData(this._dataArr[from + i]);
                }
            }

            // 更新选中状态
            this.updateVisibleSelection();
        }
    }

    private removeCell(node: Node) {
        Tools.insertArr(this.pools, node)
        let idx = this._itemArr.indexOf(node)
        if (idx > -1) {
            this._itemArr.splice(idx, 1)
        }
        node.removeFromParent();
    }

    private createCell(index: number) {
        let pNode: Node;
        if (this.pools.length > 0) {
            pNode = this.pools.shift();
            pNode.parent = this.content;
        } else {
            pNode = AssetMgr.instantiate(this.itemPrefab);
            pNode.parent = this.content;
            if (this._selectFunc) {
                this.addItemClickHandler(pNode)
            }
        }
        pNode.getComponent(BaseRenderCell)?.CheckAndRegister();
        // 创建时立即设置选中状态
        this.itemRender(pNode, index);
        Tools.insertArr(this._itemArr, pNode)
        return pNode;
    }

    /**获得数据后开始创建*/
    private createList() {
        let nodeUIT = this.node.getComponent(UITransform);
        let _showSize = nodeUIT.height;//.height;
        //获得预制体的高度
        if (!this._itemSize) {
            let pNode = AssetMgr.instantiate(this.itemPrefab).getComponent(UITransform) //this.createCell(0);
            if (this._direction == SCROLL_HORIZONTAL) {
                this._itemSize = pNode.width;
                _showSize = nodeUIT.width;
            }
            else {
                this._itemSize = pNode.height;
            }
            pNode.destroy();
        }

        //可视范围，对应可以创建多少个实体单例item
        this._numItem = Math.floor(_showSize / this._itemSize) + 2;
        if (this._dataArr.length < this._numItem) {
            this._numItem = this._dataArr.length;
        }

        while (this._itemArr.length > 0) {
            this.removeCell(this._itemArr[this._itemArr.length - 1])
        }

        this._itemArr.length = 0;
        for (let index = 0; index < this._numItem; index++) {
            this.createCell(index)
        }

        //设置容器大小
        let contentSize = this._itemSize * this._dataArr.length;
        //前面距离边框
        if (this._gapNum && this._gapNum[0]) {
            contentSize += this._gapNum[0];
        }
        //后面距离边框
        if (this._gapNum && this._gapNum[1]) {
            contentSize += this._gapNum[1];
        }
        //间隙距离
        if (this._gapNum && this._gapNum[2]) {
            contentSize += this._gapNum[2] * (this._dataArr.length - 1);
        }
        var contentUIT = this.content.getComponent(UITransform);
        if (this._direction == SCROLL_HORIZONTAL) {
            contentUIT.width = contentSize;
        }
        else {
            contentUIT.height = contentSize;
        }

        this._itemIndex = this._dataIndex = this._itemArr.length - 1;

        if (this.autoSelectIndex > -1 && this._selectedDataIndex == -1) {
            this.setSelectedIndex(this.autoSelectIndex, this.autoScrollToSelected)
        }
    }
    public getItem(idx: number) {
        return this._itemArr[idx]
    }
    // 为列表项添加点击处理
    private addItemClickHandler(item: Node) {
        item.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            if (event) {
                event.propagationImmediateStopped = true;
            }
            const cell = item.getComponent(BaseRenderCell);
            if (cell && cell.getData()) {
                const data = cell.getData();
                const dataIndex = this._dataArr.indexOf(data);
                if (dataIndex !== -1) {
                    this.setSelectedIndex(dataIndex, this.autoScrollToSelected);
                }
            }
        });
    }

    // 设置选中项
    setSelectedIndex(index: number, scrollToItem: boolean = this.autoScrollToSelected) {
        // 验证索引有效性
        if (index < 0 || index >= this._dataArr.length) {
            console.warn(`Invalid index: ${index}, data length: ${this._dataArr ? this._dataArr.length : 0}`);
            return;
        }

        // // 如果已经是选中状态，不再处理
        // if (this._selectedDataIndex === index) return;

        // 取消之前所有项的选中状态
        this.clearAllSelection();

        // 设置新选中项
        this._selectedDataIndex = index;
        this._selectedData = this._dataArr[index];

        // 更新当前可见项的选中状态
        this.updateVisibleSelection();

        if (this._selectFunc) {
            this._selectFunc(this._selectedData, index);
        }

        // 如果需要滚动到选中项
        if (scrollToItem) {
            this.scroll2Index(index);
        }
    }

    /**清除所有项的选中状态*/
    private clearAllSelection() {
        for (let i = 0; i < this._itemArr.length; i++) {
            const cell = this._itemArr[i].getComponent(BaseRenderCell);
            if (cell) {
                cell.setSelected(false);
            }
        }
    }

    /**更新当前可见项的选中状态*/
    private updateVisibleSelection() {
        var isFindSelect: boolean
        for (let i = 0; i < this._itemArr.length; i++) {
            const cell = this._itemArr[i].getComponent(BaseRenderCell);
            if (cell && cell.getData()) {
                const isSelected = cell.getData() === this._selectedData;
                if (isSelected) {
                    isFindSelect = true;
                }
                cell.setSelected(isSelected);
            }
        }
        if (!isFindSelect) {
            let cellNode = this._itemArr[this.selectIndex];
            if (cellNode) {
                const cell = cellNode.getComponent(BaseRenderCell);
                if (cell && cell.getData()) {
                    cell.setSelected(true);
                }
            } else {
                console.log("列表选中" + this.selectIndex + "找不到")
            }
        }
    }

    private scrollCheck() {
        // console.log(this.content.getPosition().y)
        let nowPos = this.getScrollOffset().y;
        let topPos = (this._dataIndex + 1 - this._numItem) * this._itemSize;//当前屏幕中靠近最开始的坐标

        //前面边框
        if (this._gapNum && this._gapNum[0]) {
            topPos += this._gapNum[0];
        }
        //间隙距离
        if (this._gapNum && this._gapNum[2]) {
            topPos += this._gapNum[2] * (this._dataIndex + 1 - this._numItem);
        }

        let size = this._itemSize;
        if (this._direction == SCROLL_HORIZONTAL) {
            nowPos = this.getScrollOffset().x;
            topPos = -topPos;
            size = -this._itemSize;
        }

        //判断向结束端滚动，滚动点和初始点对比
        if ((this._direction == SCROLL_VERTICAL && nowPos > size + topPos) ||
            (this._direction == SCROLL_HORIZONTAL && nowPos < size + topPos)) {
            let newIndex = this._dataIndex + 1;
            if (newIndex >= this._dataArr.length) {
                return; //如果滚动到底部最后一条数据，不再进行写入
            }

            this._dataIndex = newIndex;

            let topItemIndex = this._itemIndex + 1;
            if (topItemIndex >= this._numItem) {
                topItemIndex = 0;
            }

            let item = this._itemArr[topItemIndex];
            if (item) {
                this.itemRender(item, newIndex);
            }

            this._itemIndex = topItemIndex;
        }

        //判断向开始端滚动
        else if ((this._direction == SCROLL_VERTICAL && nowPos < topPos) ||
            (this._direction == SCROLL_HORIZONTAL && nowPos > topPos)) {

            let newIndex = this._dataIndex + 1 - this._numItem - 1;
            if (newIndex < 0) {
                return; //如果滚动到第一条数据，不再进行写入
            }
            this._dataIndex--;

            let item = this._itemArr[this._itemIndex];
            if (item) {
                this.itemRender(item, newIndex);
            }

            this._itemIndex--;
            if (this._itemIndex < 0) {
                this._itemIndex = this._numItem - 1;
            }
        }
    }

    /**刷新单项*/
    private itemRender(node: Node, newIndex: number) {
        const data = this._dataArr[newIndex];

        //设置有全局得刷新事件
        if (this.onItemRender) {
            this.onItemRender(node, newIndex);
        }
        //没有全局，使用继承的item
        else {
            const item = node.getComponent(BaseRenderCell)
            if (item) {

                item.setData(data);
                // 每次渲染时检查是否需要设置选中状态
                const isSelected = this._selectedDataIndex === newIndex || this._selectedData === data;
                item.setSelected(isSelected);
            }
        }
        this.setPos(node, newIndex);
    }

    /**设置坐标*/
    private setPos(node: Node, index: number) {
        let pos = this.countPosByIndex(index);
        if (this._direction == SCROLL_HORIZONTAL) {
            node.setPosition(pos, this.offSetPos);
        }
        else {
            node.setPosition(this.offSetPos, -pos);
        }
    }

    /**根据下标计算坐标。 0 ~ length-1*/
    private countPosByIndex(index: number): number {
        let pos = (1 / 2 + index) * this._itemSize;
        //前面距离边框
        if (this._gapNum && this._gapNum[0]) {
            pos += this._gapNum[0];
        }
        //间隙距离
        if (this._gapNum && this._gapNum[2]) {
            pos += this._gapNum[2] * index;
        }
        return pos;
    }

    /**滚动到指定下标（直接方法）*/
    /**滚动到指定下标（使用tween动画）*/
    public scroll2Index(index: number) {


        this.stopAutoScroll();
        //太靠近结束点，需要回退屏幕显示数量
        // if (index > this._dataArr.length - this._numItem) {
        //     index = this._dataArr.length - this._numItem;
        // }
        if (index < 0) {
            index = 0;
        }

        /**设置滚动坐标*/
        let pos = this.countPosByIndex(index) - 1 / 2 * this._itemSize;
        let ve = new Vec2(0, pos);
        if (this._direction == SCROLL_HORIZONTAL) {
            ve = new Vec2(pos, 0);
        }
        this.scrollToOffset(ve, 0.5);//滚动

    }
    public setSelectIdx(idx: number) {
        this.scroll2Index(idx);
    }

    getSelectItem(): BaseRenderCell {
        if (this._selectedDataIndex !== -1) {
            // 查找当前显示项中是否有选中的项
            for (let i = 0; i < this._itemArr.length; i++) {
                const cell = this._itemArr[i].getComponent(BaseRenderCell);
                if (cell && cell.getData() === this._selectedData) {
                    return cell;
                }
            }
        }
        return null;
    }

    get selectIndex(): number {
        return this._selectedDataIndex;
    }

    get selectedData(): any {
        return this._selectedData;
    }

    getDatas(): any[] {
        return this._dataArr;
    }
}


