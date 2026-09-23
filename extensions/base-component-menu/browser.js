const { readdir } = require('fs/promises');
const { join, basename } = require('path');

let baseCompPath = '';

exports.methods = {
    async showSubmenu() {
        // 获取 BaseComp 目录路径
        baseCompPath = join(Editor.Project.path, 'assets/script/Component/BaseComp');

        try {
            // 读取目录中的所有 .ts 文件
            const files = await readdir(baseCompPath);
            const tsFiles = files.filter(f => f.endsWith('.ts') && !f.endsWith('.meta'));

            // 构建子菜单项
            const menuItems = tsFiles.map(file => {
                const componentName = basename(file, '.ts');
                return {
                    label: componentName,
                    click() {
                        Editor.Message.send('base-component-menu', 'create-component-node', componentName);
                    }
                };
            });

            // 显示上下文菜单
            if (menuItems.length > 0) {
                Editor.Menu.popup(menuItems);
            } else {
                console.warn('BaseComp 目录中没有找到组件脚本');
            }
        } catch (err) {
            console.error('读取 BaseComp 目录失败:', err);
        }
    },

    async createComponentNode(componentName) {
        // 获取当前选中的节点
        const selection = Editor.Selection.getSelected('node');
        let parentUuid = null;

        if (selection && selection.length > 0) {
            parentUuid = selection[0];
        }

        // 创建节点
        const nodeUuid = await Editor.Message.request('scene', 'create-node', {
            parent: parentUuid,
            unlinkPrefab: true,
        });

        if (!nodeUuid) {
            console.error('创建节点失败');
            return;
        }

        // 重命名节点
        await Editor.Message.request('scene', 'set-property', {
            uuid: nodeUuid,
            path: 'name',
            dump: {
                type: 'String',
                value: componentName,
            },
        });

        // 获取组件脚本的 UUID
        const scriptPath = `db://assets/script/Component/BaseComp/${componentName}.ts`;
        const scriptUuid = await Editor.Message.request('asset-db', 'query-uuid', scriptPath);

        if (!scriptUuid) {
            console.error(`找不到脚本: ${scriptPath}`);
            return;
        }

        // 添加组件到节点
        await Editor.Message.request('scene', 'create-component', {
            uuid: nodeUuid,
            component: scriptUuid,
        });

        console.log(`成功创建节点: ${componentName}`);
    }
};
