import { Component, Node } from 'cc';
import { refreshNodeList } from './NodeList';
import { SelectCmp, SelectMode } from './SelectCmp';

/** 页签格子。数据、选中和点击都由格子自己处理 */
interface TabCell<T> extends Component {
    setData(data: T): void;
    getData(): T;
    setSelected(selected: boolean): void;
    clickFunc: (() => void) | null;
}

/**
 * 用模板格子建一组单选页签。
 * 绑定过程中会选中第一项，并立刻调用 on_select。
 */
export function bindTabList<T, C extends TabCell<T>>(
    parent: Node,
    template_name: string,
    list: readonly T[],
    cell_ctor: new () => C,
    on_select: (data: T) => void,
): SelectCmp<Node> {
    const select = new SelectCmp<Node>(SelectMode.Single, (_key, is_select, node) => {
        const cell = node.getComponent(cell_ctor);
        cell.setSelected(is_select);
        if (is_select) {
            on_select(cell.getData());
        }
    });
    refreshNodeList(parent, template_name, list, (node, item) => {
        const cell = node.getComponent(cell_ctor) || node.addComponent(cell_ctor);
        cell.setData(item);
        cell.clickFunc = () => {
            select.setSelect(node, true);
        };
        select.addKey(node, node);
    });
    return select;
}
