import { instantiate, Layout, Node } from 'cc';

/** 父节点 -> 模板子节点。复制出来的节点同名，不能再按名字查找 */
const templates = new WeakMap<Node, Node>();

/**
 * 用父节点下的模板子节点，按数据生成少量列表。
 * 多出来的藏起来，下次复用。模板保持隐藏，不参与排版。
 * 长列表单列用 ScrollList，一行多个用 GridScrollList。
 */
export function refreshNodeList<T>(
    parent: Node,
    templateName: string,
    list: readonly T[],
    bind: (node: Node, item: T, index: number) => void,
): void {
    const template = getTemplate(parent, templateName);
    const clones = parent.children.filter(node => node !== template);
    for (let i = clones.length; i < list.length; i++) {
        const node = instantiate(template);
        node.parent = parent;
        clones.push(node);
    }
    for (let i = 0; i < clones.length; i++) {
        const node = clones[i];
        const visible = i < list.length;
        node.active = visible;
        if (visible) {
            bind(node, list[i], i);
        }
    }
    const layout = parent.getComponent(Layout);
    if (layout) {
        layout.updateLayout();
    }
}

function getTemplate(parent: Node, templateName: string): Node {
    const cached = templates.get(parent);
    if (cached && cached.isValid) {
        cached.active = false;
        return cached;
    }
    const template = parent.getChildByName(templateName);
    if (!template) {
        throw new Error(`refreshNodeList 找不到模板：${templateName}`);
    }
    template.active = false;
    templates.set(parent, template);
    return template;
}
