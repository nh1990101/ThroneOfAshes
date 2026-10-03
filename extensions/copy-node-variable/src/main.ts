import { readFileSync } from 'fs';

/**
 * @en Registration method for the main process of Extension
 * @zh 为扩展的主进程的注册方法
 */
export const methods: { [key: string]: (...any: any) => any } = {
    async copyVariable() {
        console.log('[copy-node-variable] 开始执行 copyVariable');

        // 获取当前选中的节点
        const selected = await Editor.Selection.getSelected('node');
        console.log('[copy-node-variable] 选中的节点 UUID:', selected);

        if (!selected || selected.length === 0) {
            console.warn('[copy-node-variable] 请先选择节点');
            Editor.Dialog.info('请先在场景编辑器中选择节点');
            return;
        }

        const nodeUuids = selected as string[];
        let codeLines: string[] = [];

        for (const uuid of nodeUuids) {
            try {
                // 查询节点信息
                const nodeInfo: any = await Editor.Message.request('scene', 'query-node', uuid);
                console.log('[copy-node-variable] 节点信息:', nodeInfo);

                if (!nodeInfo) {
                    console.warn('[copy-node-variable] 无法获取节点信息:', uuid);
                    continue;
                }

                // 节点名称可能是对象，需要提取 value 属性
                let nodeName = 'node';
                if (typeof nodeInfo.name === 'string') {
                    nodeName = nodeInfo.name;
                } else if (nodeInfo.name && typeof nodeInfo.name === 'object') {
                    nodeName = nodeInfo.name.value || nodeInfo.name.name || 'node';
                }

                const components = (nodeInfo.__comps__ || []) as any[];

                console.log('[copy-node-variable] 节点名称:', nodeName);
                console.log('[copy-node-variable] 组件列表:', components);

                // 分析组件类型
                let componentType = 'Node';
                let decoratorType = 'child';

                // 收集所有组件
                const customComponents: string[] = [];
                const builtinComponents: string[] = [];

                // Cocos Creator 内置组件前缀
                const builtinPrefixes = ['cc.'];

                for (const comp of components) {
                    const compType = String(comp.type || '');
                    console.log('[copy-node-variable] 检查组件:', compType);

                    // 跳过内置基础组件
                    if (compType === 'cc.UITransform') continue;

                    // 判断是否是内置组件（以 cc. 开头）
                    const isBuiltin = builtinPrefixes.some(prefix => compType.startsWith(prefix));

                    if (compType.startsWith('db://')) {
                        // 自定义组件（db:// 路径）
                        const className = await getComponentClassName(compType);
                        customComponents.push(className);
                        console.log('[copy-node-variable] 找到自定义组件(db://):', className);
                    } else if (!isBuiltin) {
                        // 自定义组件（直接类名，不带前缀）
                        customComponents.push(compType);
                        console.log('[copy-node-variable] 找到自定义组件:', compType);
                    } else {
                        // 内置组件（cc. 开头）
                        const className = compType.replace('cc.', '');
                        builtinComponents.push(className);
                        console.log('[copy-node-variable] 找到内置组件:', className);
                    }
                }

                console.log('[copy-node-variable] 所有自定义组件:', customComponents);
                console.log('[copy-node-variable] 所有内置组件:', builtinComponents);

                // 优先级1：查找 BaseBtn 或包含 Btn/Button 的自定义组件
                const btnComponent = customComponents.find(c =>
                    c === 'BaseBtn' || c.includes('Btn') || c.includes('Button')
                );
                if (btnComponent) {
                    componentType = btnComponent;
                    decoratorType = 'comp';
                    console.log('[copy-node-variable] 使用按钮组件:', componentType);
                }
                // 优先级2：使用第一个自定义组件（非 Sprite）
                else {
                    const nonSpriteCustom = customComponents.find(c =>
                        !c.includes('Sprite') && !c.includes('sprite')
                    );
                    if (nonSpriteCustom) {
                        componentType = nonSpriteCustom;
                        decoratorType = 'comp';
                        console.log('[copy-node-variable] 使用非Sprite自定义组件:', componentType);
                    }
                    // 优先级3：使用第一个自定义组件（包括 Sprite）
                    else if (customComponents.length > 0) {
                        componentType = customComponents[0];
                        decoratorType = 'comp';
                        console.log('[copy-node-variable] 使用自定义组件:', componentType);
                    }
                    // 优先级4：使用内置组件
                    else if (builtinComponents.length > 0) {
                        // 内置组件优先级顺序
                        const builtinPriority = [
                            'Button', 'EditBox', 'Toggle', 'Slider',
                            'ProgressBar', 'ScrollView', 'Label', 'RichText',
                            'Sprite', 'Layout', 'Mask'
                        ];

                        for (const priority of builtinPriority) {
                            if (builtinComponents.includes(priority)) {
                                componentType = priority;
                                decoratorType = 'comp';
                                console.log('[copy-node-variable] 使用内置组件:', componentType);
                                break;
                            }
                        }
                    }
                }

                // 处理节点名称为合法的变量名
                const nodeNameStr = String(nodeName);
                const varName = toVariableName(nodeNameStr);

                console.log('[copy-node-variable] 变量名:', varName);
                console.log('[copy-node-variable] 装饰器类型:', decoratorType);
                console.log('[copy-node-variable] 组件类型:', componentType);

                // 生成代码
                if (decoratorType === 'child') {
                    if (varName === nodeNameStr) {
                        codeLines.push(`@child()`);
                    } else {
                        codeLines.push(`@child({ name: "${nodeNameStr}" })`);
                    }
                    codeLines.push(`${varName}: Node = null!;`);
                } else {
                    if (varName === nodeNameStr) {
                        codeLines.push(`@comp(${componentType})`);
                    } else {
                        codeLines.push(`@comp(${componentType}, "${nodeNameStr}")`);
                    }
                    codeLines.push(`${varName}: ${componentType} = null!;`);
                }
                codeLines.push('');
            } catch (error) {
                console.error('[copy-node-variable] 处理节点出错:', error);
            }
        }

        const code = codeLines.join('\n');

        if (!code.trim()) {
            console.warn('[copy-node-variable] 没有生成任何代码');
            Editor.Dialog.warn('无法生成代码，请检查是否选中了有效的节点');
            return;
        }

        // 复制到剪贴板
        await Editor.Clipboard.write('text', code);

        console.log('[copy-node-variable] 已复制变量文本到剪贴板：');
        console.log(code);

        // 显示提示
        Editor.Dialog.info(`已复制 ${nodeUuids.length} 个节点的变量代码到剪贴板`, {
            buttons: ['确定'],
            title: '复制成功'
        });
    },
};

/**
 * 将节点名称转换为合法的变量名
 */
function toVariableName(name: string): string {
    // 移除特殊字符，保留字母、数字、下划线
    let varName = name.replace(/[^a-zA-Z0-9_]/g, '_');

    // 如果以数字开头，添加下划线前缀
    if (/^\d/.test(varName)) {
        varName = '_' + varName;
    }

    return varName;
}

/**
 * 从组件 UUID 获取类名
 */
async function getComponentClassName(uuid: string): Promise<string> {
    try {
        console.log('[copy-node-variable] 获取组件类名:', uuid);

        // 将 db:// 路径转换为实际文件路径
        const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
        console.log('[copy-node-variable] 资源信息:', assetInfo);

        if (!assetInfo) {
            console.warn('[copy-node-variable] 无法获取资源信息');
            return 'Component';
        }

        const filePath = assetInfo.file;
        console.log('[copy-node-variable] 文件路径:', filePath);

        const content = readFileSync(filePath, 'utf-8');

        // 使用正则提取类名
        const classMatch = content.match(/export\s+(?:default\s+)?class\s+(\w+)/);
        if (classMatch) {
            console.log('[copy-node-variable] 提取到类名:', classMatch[1]);
            return classMatch[1];
        }

        // 尝试从文件名提取
        const fileName = assetInfo.name;
        const className = fileName.charAt(0).toUpperCase() + fileName.slice(1);
        console.log('[copy-node-variable] 从文件名提取类名:', className);
        return className;
    } catch (e) {
        console.error('[copy-node-variable] 获取组件类名失败:', e);
        return 'Component';
    }
}

/**
 * @en Hooks triggered after extension loading is complete
 * @zh 扩展加载完成后触发的钩子
 */
export function load() {
    console.log('[copy-node-variable] 扩展已加载');
}

/**
 * @en Hooks triggered after extension uninstallation is complete
 * @zh 扩展卸载完成后触发的钩子
 */
export function unload() {
    console.log('[copy-node-variable] 扩展已卸载');
}
