"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCreateMenu = void 0;
const fs = require('fs');
const path = require('path');
function onCreateMenu(assetInfo) {
    return [
        {
            label: '本项目基础组件',
            submenu: getBaseComponentMenuItems()
        }
    ];
}
exports.onCreateMenu = onCreateMenu;
function getBaseComponentMenuItems() {
    const baseCompPath = path.join(Editor.Project.path, 'assets/script/Component/BaseComp');
    try {
        if (!fs.existsSync(baseCompPath)) {
            console.warn('BaseComp 目录不存在:', baseCompPath);
            return [];
        }
        const files = fs.readdirSync(baseCompPath);
        const tsFiles = files.filter((f) => f.endsWith('.ts') && !f.endsWith('.meta'));
        const menuItems = tsFiles.map((file) => {
            const componentName = path.basename(file, '.ts');
            return {
                label: componentName,
                async click() {
                    await createComponentNode(componentName);
                }
            };
        });
        return menuItems.length > 0 ? menuItems : [{ label: '(无可用组件)', enabled: false }];
    }
    catch (err) {
        console.error('读取 BaseComp 目录失败:', err);
        return [{ label: '(读取失败)', enabled: false }];
    }
}
async function createComponentNode(componentName) {
    try {
        // 获取当前选中的节点
        const type = Editor.Selection.getLastSelectedType();
        const uuids = Editor.Selection.getSelected(type);
        let parentUuid = null;
        if (uuids && uuids.length > 0) {
            parentUuid = uuids[0];
        }
        // 获取组件脚本的 UUID
        const scriptPath = `db://assets/script/Component/BaseComp/${componentName}.ts`;
        const scriptUuid = await Editor.Message.request('asset-db', 'query-uuid', scriptPath);
        if (!scriptUuid) {
            console.error(`找不到脚本: ${scriptPath}`);
            return;
        }
        console.log(`脚本UUID: ${scriptUuid}`);
        // 获取脚本的资源信息，从中提取组件类名
        const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', scriptUuid);
        console.log(`脚本资源信息:`, assetInfo);
        // 创建节点
        const nodeUuid = await Editor.Message.request('scene', 'create-node', {
            parent: parentUuid,
            unlinkPrefab: true,
        });
        if (!nodeUuid) {
            console.error('创建节点失败');
            return;
        }
        console.log(`节点UUID: ${nodeUuid}`);
        // 使用组件类名而不是UUID
        const result = await Editor.Message.request('scene', 'create-component', {
            uuid: nodeUuid,
            component: componentName,
        });
        console.log(`添加组件结果:`, result);
        // 重命名节点
        await Editor.Message.request('scene', 'set-property', {
            uuid: nodeUuid,
            path: 'name',
            dump: {
                type: 'String',
                value: componentName,
            },
        });
        console.log(`成功创建节点: ${componentName}`);
    }
    catch (err) {
        console.error('创建组件节点失败:', err);
    }
}
