import { _decorator, CCFloat, CCObject, EventTouch, instantiate, js, Layers, Layout, Node, Prefab, ScrollView, UITransform, Vec2 } from 'cc';
import { EDITOR_NOT_IN_PREVIEW } from 'cc/env';
import { BaseRenderCell } from '../BaseRenderCell';
import { AssetMgr } from '../../Common/AssetMgr';
import { EdgeResistScrollView } from './EdgeResistScrollView';
import { SCROLL_HORIZONTAL, SCROLL_VERTICAL } from './ScrollList';
const { ccclass, property } = _decorator;

const GRID_PREVIEW_NAME = '__grid_preview__';
const GRID_COMPONENT_GUARD = Symbol.for('GridScrollList.beforeAddComponent');

export { SCROLL_HORIZONTAL, SCROLL_VERTICAL };

/**
 * 格子虚拟列表。一行（竖滑）或一列（横滑）放多个。
 * 单列继续用 ScrollList。
 * 只创建可见行数加两行的格子，滚动时按偏移重绑数据。
 */
@ccclass('GridScrollList')
export class GridScrollList extends EdgeResistScrollView {

    /** 编辑器添加前按基类检查，禁止同节点重复挂载滚动组件。 */
    private static _disallowMultiple = ScrollView;

    @property({ type: Prefab, tooltip: "item子节点预制体" })
    itemPrefab: Prefab = null;

    /**整行以这个位置为中心排开*/
    @property({ type: CCFloat, tooltip: "整行或整列的中心偏移" })
    offSetPos: number = 0;

    /**竖滑时一行几个，横滑时一列几个*/
    @property({ tooltip: "一行（竖滑）或一列（横滑）放几个" })
    lineCount: number = 1;

    /**竖滑是列间距，横滑是行间距*/
    @property({ type: CCFloat, displayName: '交叉方向间距', tooltip: "竖滑为左右间距，横滑为上下间距" })
    crossGap: number = 0;

    /**竖滑是行间距，横滑是列间距。setDataList 传入 gap 时以传入值为准*/
    @property({ type: CCFloat, displayName: '滚动方向间距', tooltip: "竖滑为上下间距，横滑为左右间距。setDataList 传入 gap 时以传入值为准" })
    lineGap: number = 0;

    @property({ displayName: '预览数量', tooltip: "点击预览时摆出的格子数量" })
    previewCount: number = 8;

    @property
    private _showPreview = false;

    /**选中后是否滚到该项*/
    autoScrollToSelected: boolean = false;

    /**建完列表后自动选中的数据下标，-1 表示不选*/
    autoSelectIndex = -1;

    /**子节点刷新。不设则走 BaseRenderCell.setData */
    public onItemRender: Function;

    private _itemWidth: number;
    private _itemHeight: number;
    private _itemSize: number;
    private _itemCrossSize: number;
    private _direction: number = SCROLL_VERTICAL;
    /**[开始边框，结束边框，滚动方向间距]*/
    private _gapNum: number[];
    private _dataArr: any[] = [];
    private _itemClass: new () => BaseRenderCell;
    private _itemArr: Node[] = [];
    private _indexOfNode = new Map<Node, number>();
    private _first_visible_index = -1;
    private _visible_window_end = -1;
    private _selectFunc: Function;
    private _selectedDataIndex = -1;
    private _selectedData: any = null;
    private _previewNodes: Node[] = [];
    private _previewContentWidth = 0;
    private _previewContentHeight = 0;
    private _previewContentSaved = false;

    @property({ displayName: '点击预览', tooltip: "编辑预制体时勾选，按当前间距摆出预览格子；取消勾选清掉。改完间距后取消再勾一次" })
    get showPreview() {
        return this._showPreview;
    }

    set showPreview(value: boolean) {
        if (!EDITOR_NOT_IN_PREVIEW) {
            this._showPreview = value;
            return;
        }
        if (!value) {
            this._showPreview = false;
            this.clearEditorPreview();
            return;
        }
        this._showPreview = this.buildEditorPreview();
    }

    public onEnable(): void {
        super.onEnable();
        this.node.on('scrolling', this.onScrolling, this);
    }

    public onDisable(): void {
        this.node.off('scrolling', this.onScrolling, this);
        this.stopAutoScroll();
        super.onDisable();
    }

    /**
     * @param gap [开始边框，结束边框，滚动方向上每行间距]。不传则滚动方向间距用 lineGap
     * @param lineCount 不传则用组件上的 lineCount
     */
    public setDataList(itemClass: new () => BaseRenderCell, dataArr: any[], direction: number = SCROLL_VERTICAL, gap?: number[], lineCount?: number) {
        this.clearEditorPreview();
        this._showPreview = false;
        this._itemClass = itemClass;
        this._dataArr = dataArr || [];
        this._direction = direction;
        if (gap) {
            this._gapNum = gap;
        } else {
            this._gapNum = [0, 0, this.lineGap];
        }
        if (lineCount != null) {
            this.lineCount = lineCount;
        }
        this.lineCount = Math.max(1, Math.floor(this.lineCount));
        this.horizontal = direction == SCROLL_HORIZONTAL;
        this.vertical = direction != SCROLL_HORIZONTAL;
        this._selectedDataIndex = -1;
        this._selectedData = null;
        this.createList();
    }

    /** 切换格子预制体时归还旧格子，并重新测量新格子的尺寸。 */
    public setItemPrefab(prefab: Prefab): void {
        if (this.itemPrefab === prefab) {
            return;
        }
        this.resizePool(0);
        this.itemPrefab = prefab;
        this._itemWidth = undefined;
        this._itemHeight = undefined;
    }

    public setSelectFunc(selectFunc: Function) {
        this._selectFunc = selectFunc;
        for (let i = 0; i < this._itemArr.length; i++) {
            this.bindClick(this._itemArr[i]);
        }
    }

    updateList(dataArr: any[], itemClass?: new () => BaseRenderCell, direction: number = SCROLL_VERTICAL, gap?: number[], lineCount?: number) {
        const sameLength = this._dataArr && this._dataArr.length == dataArr.length;
        this._dataArr = dataArr || [];
        this.horizontal = direction == SCROLL_HORIZONTAL;
        this.vertical = direction != SCROLL_HORIZONTAL;
        this._direction = direction;
        if (gap) {
            this._gapNum = gap;
        } else if (!this._gapNum) {
            this._gapNum = [0, 0, this.lineGap];
        }
        if (this._selectedDataIndex >= this._dataArr.length) {
            this._selectedDataIndex = -1;
            this._selectedData = null;
        }
        if (lineCount != null) {
            this.lineCount = lineCount;
        }
        this.lineCount = Math.max(1, Math.floor(this.lineCount));
        if (itemClass) {
            this._itemClass = itemClass;
        }

        if (!sameLength) {
            this.createList();
            return;
        }
        this.refreshVisible(true);
    }

    setSelectedIndex(index: number, scrollToItem: boolean = this.autoScrollToSelected) {
        if (index < 0 || index >= this._dataArr.length) {
            console.warn(`Invalid index: ${index}, data length: ${this._dataArr.length}`);
            return;
        }
        this._selectedDataIndex = index;
        this._selectedData = this._dataArr[index];
        this.applySelection();
        if (this._selectFunc) {
            this._selectFunc(this._selectedData, index);
        }
        if (scrollToItem) {
            this.scroll2Index(index);
        }
    }

    public scroll2Index(index: number) {
        this.stopAutoScroll();
        if (index < 0) {
            index = 0;
        }
        const line = Math.floor(index / this.lineCount);
        const pos = this.rowCenter(line) - this._itemSize / 2;
        const offset = this._direction == SCROLL_HORIZONTAL ? new Vec2(pos, 0) : new Vec2(0, pos);
        this.scrollToOffset(offset, 0.5);
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

    private createList() {
        this.measureItem();
        const lineNum = Math.ceil(this._dataArr.length / this.lineCount);
        let contentSize = this._itemSize * lineNum + this.gapOf(0) + this.gapOf(1);
        if (lineNum > 1) {
            contentSize += this.gapOf(2) * (lineNum - 1);
        }
        const contentUIT = this.content.getComponent(UITransform);
        if (this._direction == SCROLL_HORIZONTAL) {
            contentUIT.width = contentSize;
        } else {
            contentUIT.height = contentSize;
        }

        const viewSize = this.viewLength();
        const stride = this._itemSize + this.gapOf(2);
        const visibleLines = Math.ceil(viewSize / stride) + 2;
        let need = visibleLines * this.lineCount;
        if (this._dataArr.length < need) {
            need = this._dataArr.length;
        }
        this.resizePool(need);

        this.stopAutoScroll();
        this.scrollToOffset(new Vec2(0, 0), 0);
        this.refreshVisible(true);

        if (this.autoSelectIndex > -1 && this.autoSelectIndex < this._dataArr.length && this._selectedDataIndex == -1) {
            this.setSelectedIndex(this.autoSelectIndex, this.autoScrollToSelected);
        }
    }

    private onScrolling() {
        this.refreshVisible(false);
    }

    /**按当前滚动偏移，把池子里的格子绑到对应数据。force 为真时整窗重刷*/
    private refreshVisible(force: boolean) {
        if (!this._dataArr || this._itemArr.length <= 0 || !this._itemSize) {
            return;
        }
        const stride = this._itemSize + this.gapOf(2);
        let offset = this.getScrollOffset().y;
        if (this._direction == SCROLL_HORIZONTAL) {
            offset = -this.getScrollOffset().x;
        }
        let firstRow = Math.floor((offset - this.gapOf(0)) / stride);
        const lineNum = Math.ceil(this._dataArr.length / this.lineCount);
        const poolLines = Math.ceil(this._itemArr.length / this.lineCount);
        const maxFirst = Math.max(0, lineNum - poolLines);
        if (firstRow < 0) {
            firstRow = 0;
        }
        if (firstRow > maxFirst) {
            firstRow = maxFirst;
        }
        const firstIndex = firstRow * this.lineCount;
        const windowEnd = Math.min(this._dataArr.length, firstIndex + this._itemArr.length);
        // 滚动未跨出当前数据范围时，不再遍历格子；数据刷新仍然强制重绑。
        if (!force && firstIndex === this._first_visible_index && windowEnd === this._visible_window_end) {
            return;
        }
        this._first_visible_index = firstIndex;
        this._visible_window_end = windowEnd;
        if (force) {
            this.bindWindow(firstIndex, windowEnd);
            return;
        }
        const covered = new Set<number>();
        const freeNodes: Node[] = [];
        for (let i = 0; i < this._itemArr.length; i++) {
            const node = this._itemArr[i];
            const dataIndex = this._indexOfNode.get(node);
            if (node.active && dataIndex != null && dataIndex >= firstIndex && dataIndex < windowEnd) {
                covered.add(dataIndex);
            } else {
                freeNodes.push(node);
            }
        }
        let freeIndex = 0;
        for (let dataIndex = firstIndex; dataIndex < windowEnd; dataIndex++) {
            if (covered.has(dataIndex)) {
                continue;
            }
            const node = freeNodes[freeIndex];
            freeIndex++;
            node.active = true;
            this._indexOfNode.set(node, dataIndex);
            this.itemRender(node, dataIndex);
        }
        for (let i = freeIndex; i < freeNodes.length; i++) {
            freeNodes[i].active = false;
            this._indexOfNode.delete(freeNodes[i]);
        }
    }

    /**整窗按池子顺序绑到 [firstIndex, windowEnd)。建表和数据刷新用*/
    private bindWindow(firstIndex: number, windowEnd: number) {
        for (let i = 0; i < this._itemArr.length; i++) {
            const node = this._itemArr[i];
            const dataIndex = firstIndex + i;
            if (dataIndex < windowEnd) {
                node.active = true;
                this._indexOfNode.set(node, dataIndex);
                this.itemRender(node, dataIndex);
            } else {
                node.active = false;
                this._indexOfNode.delete(node);
            }
        }
    }

    private itemRender(node: Node, index: number) {
        if (this.onItemRender) {
            this.onItemRender(node, index);
        } else {
            const item = node.getComponent(BaseRenderCell);
            item.setData(this._dataArr[index]);
            item.setSelected(index === this._selectedDataIndex);
        }
        this.setPos(node, index);
    }

    private setPos(node: Node, index: number) {
        const line = Math.floor(index / this.lineCount);
        const slot = index % this.lineCount;
        const pos = this.rowCenter(line);
        const lineCross = this.lineCount * this._itemCrossSize + (this.lineCount - 1) * this.crossGap;
        const stride = this._itemCrossSize + this.crossGap;
        if (this._direction == SCROLL_HORIZONTAL) {
            const cross = this.offSetPos + lineCross / 2 - this._itemCrossSize / 2 - slot * stride;
            node.setPosition(pos, cross);
        } else {
            const cross = this.offSetPos - lineCross / 2 + this._itemCrossSize / 2 + slot * stride;
            node.setPosition(cross, -pos);
        }
    }

    /**一行中心在滚动方向上的坐标*/
    private rowCenter(row: number): number {
        return (row + 0.5) * this._itemSize + this.gapOf(0) + this.gapOf(2) * row;
    }

    private applySelection() {
        for (let i = 0; i < this._itemArr.length; i++) {
            const node = this._itemArr[i];
            if (!node.active) {
                continue;
            }
            const cell = node.getComponent(BaseRenderCell);
            cell.setSelected(this._indexOfNode.get(node) === this._selectedDataIndex);
        }
    }

    private resizePool(need: number) {
        this._first_visible_index = -1;
        this._visible_window_end = -1;
        while (this._itemArr.length > need) {
            const node = this._itemArr.pop();
            this._indexOfNode.delete(node);
            node.off(Node.EventType.TOUCH_END, this.onItemClick, this);
            node.removeFromParent();
            AssetMgr.removeNode(node);
        }
        while (this._itemArr.length < need) {
            const node = AssetMgr.createPrefabFromPoolByPrefab(this.itemPrefab, this._itemClass);
            node.parent = this.content;
            node.active = true;
            this.bindClick(node);
            this._itemArr.push(node);
        }
    }

    private bindClick(node: Node) {
        node.off(Node.EventType.TOUCH_END, this.onItemClick, this);
        if (this._selectFunc) {
            node.on(Node.EventType.TOUCH_END, this.onItemClick, this);
        }
    }

    private onItemClick(event: EventTouch) {
        event.propagationImmediateStopped = true;
        const index = this._indexOfNode.get(event.currentTarget as Node);
        if (index == null) {
            return;
        }
        this.setSelectedIndex(index, this.autoScrollToSelected);
    }

    /**编辑器里按当前间距摆出 itemPrefab。返回 false 表示缺预制体或 content*/
    private buildEditorPreview(): boolean {
        this.clearEditorPreview();
        if (!this.itemPrefab || !this.content) {
            console.warn('GridScrollList 预览需要 itemPrefab 和 content');
            return false;
        }
        this.lineCount = Math.max(1, Math.floor(this.lineCount));
        this._direction = this.horizontal && !this.vertical ? SCROLL_HORIZONTAL : SCROLL_VERTICAL;
        this._gapNum = [0, 0, this.lineGap];

        const count = Math.max(0, Math.floor(this.previewCount));
        const sample = instantiate(this.itemPrefab);
        const uit = sample.getComponent(UITransform);
        this._itemWidth = uit.width;
        this._itemHeight = uit.height;
        if (this._direction == SCROLL_HORIZONTAL) {
            this._itemSize = this._itemWidth;
            this._itemCrossSize = this._itemHeight;
        } else {
            this._itemSize = this._itemHeight;
            this._itemCrossSize = this._itemWidth;
        }

        const lineNum = Math.ceil(count / this.lineCount);
        let contentSize = this._itemSize * lineNum + this.gapOf(0) + this.gapOf(1);
        if (lineNum > 1) {
            contentSize += this.gapOf(2) * (lineNum - 1);
        }
        const contentUIT = this.content.getComponent(UITransform);
        this._previewContentWidth = contentUIT.width;
        this._previewContentHeight = contentUIT.height;
        this._previewContentSaved = true;
        if (this._direction == SCROLL_HORIZONTAL) {
            contentUIT.width = contentSize;
        } else {
            contentUIT.height = contentSize;
        }

        if (count <= 0) {
            sample.destroy();
            return true;
        }
        this.placePreviewNode(sample, 0);
        for (let i = 1; i < count; i++) {
            this.placePreviewNode(instantiate(this.itemPrefab), i);
        }
        return true;
    }

    private placePreviewNode(node: Node, index: number) {
        node.name = GRID_PREVIEW_NAME;
        node._objFlags |= CCObject.Flags.DontSave;
        node.parent = this.content;
        this.setPos(node, index);
        this._previewNodes.push(node);
    }

    private clearEditorPreview() {
        this._previewNodes.length = 0;
        const content = this.content;
        if (content) {
            const children = content.children;
            for (let i = children.length - 1; i >= 0; i--) {
                const child = children[i];
                if (child.name == GRID_PREVIEW_NAME) {
                    child.removeFromParent();
                    child.destroy();
                }
            }
        }
        if (!this._previewContentSaved || !content) {
            this._previewContentSaved = false;
            return;
        }
        const contentUIT = content.getComponent(UITransform);
        contentUIT.width = this._previewContentWidth;
        contentUIT.height = this._previewContentHeight;
        this._previewContentSaved = false;
    }

    private measureItem() {
        if (this._itemWidth == null) {
            const node = AssetMgr.createPrefabFromPoolByPrefab(this.itemPrefab);
            const uit = node.getComponent(UITransform);
            this._itemWidth = uit.width;
            this._itemHeight = uit.height;
            AssetMgr.removeNode(node);
        }
        if (this._direction == SCROLL_HORIZONTAL) {
            this._itemSize = this._itemWidth;
            this._itemCrossSize = this._itemHeight;
        } else {
            this._itemSize = this._itemHeight;
            this._itemCrossSize = this._itemWidth;
        }
    }

    private viewLength(): number {
        const trans = this.view || this.node.getComponent(UITransform);
        return this._direction == SCROLL_HORIZONTAL ? trans.width : trans.height;
    }

    private gapOf(index: number): number {
        if (!this._gapNum || !this._gapNum[index]) {
            return 0;
        }
        return this._gapNum[index];
    }
}

if (EDITOR_NOT_IN_PREVIEW) {
    const editor_context = globalThis as any;
    const node_manager = editor_context.cce?.Node;
    if (node_manager) {
        const previous_guard = node_manager[GRID_COMPONENT_GUARD];
        if (previous_guard) {
            node_manager.removeListener('before-add-component', previous_guard);
        }
        const before_add_component = (component_id: string, node: Node): void => {
            const component_class = js.getClassById(component_id) || js.getClassByName(component_id);
            if (component_class !== GridScrollList) {
                return;
            }
            const scroll_view = node.getComponent(ScrollView);
            if (scroll_view) {
                void editor_context.Editor.Dialog.warn('无法添加 GridScrollList', {
                    detail: `节点“${node.name}”已挂载 ${js.getClassName(scroll_view)}。\n同一节点只能保留一个滚动组件，请先移除已有的滚动组件。`,
                    buttons: ['知道了'],
                });
            }
        };
        node_manager[GRID_COMPONENT_GUARD] = before_add_component;
        node_manager.on('before-add-component', before_add_component);
    }
}
