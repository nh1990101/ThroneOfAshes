import { AssetInfo } from "../@types/packages/asset-db/@types/public";
const fs = require("fs");

export function onCreateMenu(assetInfo: AssetInfo) {
    return [
        {
            label: '生成脚本绑定',
            async click() {
                const type = Editor.Selection.getLastSelectedType();
                const uuids = Editor.Selection.getSelected(type);
                if (uuids && uuids[0]) {
                    const uuid = uuids[0];
                    const node = await Editor.Message.request('scene', 'query-node', uuid);
                    if (node) {
                        const nodeName = node.name.value;
                        const scriptText = `
import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;


@ccclass('${nodeName}')
export class ${nodeName} extends Component {

    start() {

    }

    // update (deltaTime: number) {

    // }
}`;

                        let scriptPath = '';
                        const createPath = await Editor.Profile.getProject("menu-test", "script_create_path");
                        if (createPath) {
                            scriptPath = `db://assets/${createPath}/${nodeName}.ts`;
                        } else {
                            scriptPath = `db://assets/${nodeName}.ts`;
                        }

                        Editor.Message.request("asset-db", 'create-asset', scriptPath, scriptText, {}).then(() => {
                            setTimeout(async () => {
                                const component = nodeName;
                                await Editor.Message.request('scene', 'create-component', { uuid, component });
                            }, 1000);
                        })
                    }
                } else {
                    console.warn('请选中一个节点');
                }
            },
        },
        {
            label: '绑定组件属性',
            submenu: [
                {
                    label: '绑定节点',
                    async click() {
                        const type = Editor.Selection.getLastSelectedType();
                        const uuids = Editor.Selection.getSelected(type);
                        if (uuids && uuids.length > 0) {
                            // 收集所有节点的信息
                            const nodesInfo = [];
                            let parentScriptInfo: any = null;

                            for (const uuid of uuids) {
                                const node = await Editor.Message.request('scene', 'query-node', uuid);
                                const nodeName = node.name.value;
                                const comps = node?.__comps__;
                                if (comps && nodeName) {
                                    nodesInfo.push({ uuid, nodeName, node });
                                }
                            }

                            if (nodesInfo.length === 0) {
                                console.warn('没有有效的节点');
                                return;
                            }

                            //获取脚本url；
                            function getParentComponentURL(uuid: string, depth = 0): Promise<any> {
                                return new Promise(async resolve => {
                                    console.log(`${'  '.repeat(depth)}[查找脚本] 层级 ${depth}, uuid: ${uuid}`);
                                    const parentNode = await Editor.Message.request('scene', 'query-node', uuid);
                                    if (parentNode) {
                                        const nodeName = parentNode.name.value;
                                        console.log(`${'  '.repeat(depth)}[查找脚本] 节点名称: ${nodeName}`);
                                        //是否有脚本组件;
                                        const isScriptComponent = await Editor.Message.request('scene', 'query-component-has-script', nodeName);
                                        console.log(`${'  '.repeat(depth)}[查找脚本] 是否有脚本组件: ${isScriptComponent}`);
                                        if (isScriptComponent) {
                                            const comps = parentNode.__comps__;
                                            console.log(`${'  '.repeat(depth)}[查找脚本] 组件数量: ${comps?.length || 0}`);
                                            if (comps && comps.length > 1) {
                                                for (let i = 0, len = comps.length; i < len; i++) {
                                                    const type = comps[i].type;
                                                    console.log(`${'  '.repeat(depth)}[查找脚本]   组件 ${i}: ${type}, 查找类型: ${nodeName}`);
                                                    if (type === nodeName) {
                                                        const scriptUuid = comps[i].value.__scriptAsset.value.uuid;
                                                        const componentPath = await Editor.Message.request('asset-db', 'query-path', scriptUuid);
                                                        const uuid = parentNode.uuid.value;
                                                        console.log(`${'  '.repeat(depth)}[查找脚本] ✓ 找到脚本: ${componentPath}`);
                                                        resolve({ path: componentPath, scriptUuid, uuid, index: i });
                                                        return;
                                                    }
                                                }
                                                console.log(`${'  '.repeat(depth)}[查找脚本] ✗ 没有匹配的组件类型`);
                                                resolve(null);
                                            } else {
                                                console.log(`${'  '.repeat(depth)}[查找脚本] ✗ 组件数量不足 (${comps?.length || 0})`);
                                                resolve(null);
                                            }
                                        } else {
                                            const parentUUID = parentNode.parent?.value?.uuid;
                                            console.log(`${'  '.repeat(depth)}[查找脚本] 继续向上查找父节点, parentUUID: ${parentUUID || 'null'}`);
                                            if (parentUUID) {
                                                resolve(getParentComponentURL(parentUUID, depth + 1));
                                            } else {
                                                console.log(`${'  '.repeat(depth)}[查找脚本] ✗ 已到达根节点`);
                                                resolve(null);
                                            }
                                        }
                                    } else {
                                        console.log(`${'  '.repeat(depth)}[查找脚本] ✗ 无法查询节点`);
                                        resolve(null);
                                    }
                                });
                            }

                            // 找到有脚本的父节点（使用第一个节点来查找）
                            console.log('=== 开始查找父节点脚本 ===');
                            console.log('第一个节点信息:', nodesInfo[0].nodeName);
                            const parent_uuid = nodesInfo[0].node.parent.value.uuid;
                            console.log('父节点 UUID:', parent_uuid);
                            parentScriptInfo = await getParentComponentURL(parent_uuid);
                            console.log('=== 查找结果 ===', parentScriptInfo);

                            if (!parentScriptInfo) {
                                console.warn('找不到脚本路径 - 请确保选中节点的父节点或祖先节点上有脚本组件');
                                return;
                            }

                            const { path, scriptUuid, index, uuid: parentUuid } = parentScriptInfo;
                            let text = fs.readFileSync(path, "utf-8");

                            // 批量添加所有属性
                            let allPropsStr = '';
                            const importTypes = new Set<string>();
                            const propertySettings: any[] = [];

                            for (const { uuid, nodeName } of nodesInfo) {
                                const propStr = `

    @property(Node)
    ${nodeName}: Node = null!;`;
                                allPropsStr += propStr;
                                importTypes.add('Node');

                                propertySettings.push({
                                    uuid: parentUuid,
                                    path: `__comps__.${index}.${nodeName}`,
                                    dump: {
                                        type: 'cc.Node',
                                        value: {
                                            uuid: uuid
                                        }
                                    }
                                });
                            }

                            // 添加属性到类定义
                            const reg = text.match(/ extends .*?{/);
                            if (!reg) {
                                console.log("do not match script");
                                return;
                            }
                            text = text.replace(reg[0], reg[0] + allPropsStr);

                            // 添加需要的导入
                            const imReg = text.match(/import .*?}/);
                            if (imReg) {
                                for (const imType of importTypes) {
                                    if (!imReg[0].includes(imType)) {
                                        const newStr = imReg[0].substring(0, imReg[0].length - 1) + `,${imType} }`;
                                        text = text.replace(imReg[0], newStr);
                                    }
                                }
                            }

                            fs.writeFileSync(path, text, "utf-8");
                            // 刷新资源
                            Editor.Message.request('asset-db', 'refresh-asset', scriptUuid);

                            // 批量设置属性
                            setTimeout(() => {
                                for (const obj of propertySettings) {
                                    console.log('设置属性:', obj);
                                    Editor.Message.request('scene', 'set-property', obj);
                                }
                            }, 1000);

                            console.log(`成功绑定 ${nodesInfo.length} 个节点`);
                        } else {
                            console.warn('请至少选中一个节点');
                        }
                    },
                },
                {
                    label: '绑定组件',
                    async click() {
                        const type = Editor.Selection.getLastSelectedType();
                        const uuids = Editor.Selection.getSelected(type);
                        if (uuids && uuids.length > 0) {
                            // 收集所有节点的信息
                            const nodesInfo = [];
                            let parentScriptInfo: any = null;

                            for (const uuid of uuids) {
                                const node = await Editor.Message.request('scene', 'query-node', uuid);
                                const nodeName = node.name.value;
                                const comps = node?.__comps__;
                                if (comps && nodeName) {
                                    nodesInfo.push({ uuid, nodeName, node, comps });
                                }
                            }

                            if (nodesInfo.length === 0) {
                                console.warn('没有有效的节点');
                                return;
                            }

                            //获取属性需要添加的具体内容;
                            function getPropText(comps: any, nodeName: any, nodeUuid: string) {
                                //绑定属性内容的text；
                                let propStr = null;
                                //当前属性的类型；
                                let pType = null;
                                //当前组件的uuid；
                                let componentUuid = null;
                                //导入时的类型;
                                let importType = null;
                                const len = comps.length;
                                if (len === 1 && comps[0].type === 'cc.UITransform') {
                                    propStr = `

    @property(Node)
    ${nodeName}: Node = null!;`;
                                    return { propStr, type: 'cc.Node', pUuid: nodeUuid, imType: 'Node' };
                                }

                                for (let i = 0; i < len; i++) {
                                    const type = comps[i].type;
                                    if (type != 'cc.UITransform') {
                                        switch (type) {
                                            case 'cc.Label':
                                            case 'cc.Sprite':
                                            case 'cc.ProgressBar':
                                            case 'cc.Button':
                                            case 'cc.Mask':
                                            case 'cc.ScrollView':
                                            case 'cc.Camera':
                                                const proType = type.substring(3, type.length);
                                                propStr = `

    @property(${proType})
    ${nodeName}: ${proType} = null!;`;
                                                pType = type;
                                                componentUuid = comps[i].value.uuid.value;
                                                importType = proType;
                                                break;
                                            case 'sp.Skeleton':
                                                propStr = `

    @property(sp.Skeleton)
    ${nodeName}: sp.Skeleton = null!;`;
                                                pType = type;
                                                componentUuid = comps[i].value.uuid.value;
                                                importType = type.split('.')[0];
                                                break;
                                            case 'dragonBones.ArmatureDisplay':
                                                propStr = `

    @property(dragonBones.ArmatureDisplay)
    ${nodeName}: dragonBones.ArmatureDisplay = null!;`;
                                                pType = type;
                                                componentUuid = comps[i].value.uuid.value;
                                                importType = type.split('.')[0];
                                                break;

                                        }
                                    }
                                }
                                return { propStr, type: pType, pUuid: componentUuid, imType: importType };
                            }

                            //获取脚本url；
                            function getParentComponentURL(uuid: string, depth = 0): Promise<any> {
                                return new Promise(async resolve => {
                                    console.log(`${'  '.repeat(depth)}[查找脚本] 层级 ${depth}, uuid: ${uuid}`);
                                    const parentNode = await Editor.Message.request('scene', 'query-node', uuid);
                                    if (parentNode) {
                                        const nodeName = parentNode.name.value;
                                        console.log(`${'  '.repeat(depth)}[查找脚本] 节点名称: ${nodeName}`);
                                        //是否有脚本组件;
                                        const isScriptComponent = await Editor.Message.request('scene', 'query-component-has-script', nodeName);
                                        console.log(`${'  '.repeat(depth)}[查找脚本] 是否有脚本组件: ${isScriptComponent}`);
                                        if (isScriptComponent) {
                                            const comps = parentNode.__comps__;
                                            console.log(`${'  '.repeat(depth)}[查找脚本] 组件数量: ${comps?.length || 0}`);
                                            if (comps && comps.length > 1) {
                                                for (let i = 0, len = comps.length; i < len; i++) {
                                                    const type = comps[i].type;
                                                    console.log(`${'  '.repeat(depth)}[查找脚本]   组件 ${i}: ${type}, 查找类型: ${nodeName}`);
                                                    if (type === nodeName) {
                                                        const scriptUuid = comps[i].value.__scriptAsset.value.uuid;
                                                        const componentPath = await Editor.Message.request('asset-db', 'query-path', scriptUuid);
                                                        const uuid = parentNode.uuid.value;
                                                        console.log(`${'  '.repeat(depth)}[查找脚本] ✓ 找到脚本: ${componentPath}`);
                                                        resolve({ path: componentPath, scriptUuid, uuid, index: i });
                                                        return;
                                                    }
                                                }
                                                console.log(`${'  '.repeat(depth)}[查找脚本] ✗ 没有匹配的组件类型`);
                                                resolve(null);
                                            } else {
                                                console.log(`${'  '.repeat(depth)}[查找脚本] ✗ 组件数量不足 (${comps?.length || 0})`);
                                                resolve(null);
                                            }
                                        } else {
                                            const parentUUID = parentNode.parent?.value?.uuid;
                                            console.log(`${'  '.repeat(depth)}[查找脚本] 继续向上查找父节点, parentUUID: ${parentUUID || 'null'}`);
                                            if (parentUUID) {
                                                resolve(getParentComponentURL(parentUUID, depth + 1));
                                            } else {
                                                console.log(`${'  '.repeat(depth)}[查找脚本] ✗ 已到达根节点`);
                                                resolve(null);
                                            }
                                        }
                                    } else {
                                        console.log(`${'  '.repeat(depth)}[查找脚本] ✗ 无法查询节点`);
                                        resolve(null);
                                    }
                                });
                            }

                            // 找到有脚本的父节点（使用第一个节点来查找）
                            console.log('=== 开始查找父节点脚本 ===');
                            console.log('第一个节点信息:', nodesInfo[0].nodeName);
                            const parent_uuid = nodesInfo[0].node.parent.value.uuid;
                            console.log('父节点 UUID:', parent_uuid);
                            parentScriptInfo = await getParentComponentURL(parent_uuid);
                            console.log('=== 查找结果 ===', parentScriptInfo);

                            if (!parentScriptInfo) {
                                console.warn('找不到脚本路径 - 请确保选中节点的父节点或祖先节点上有脚本组件');
                                return;
                            }

                            const { path, scriptUuid, index, uuid: parentUuid } = parentScriptInfo;
                            let text = fs.readFileSync(path, "utf-8");

                            // 批量添加所有属性
                            let allPropsStr = '';
                            const importTypes = new Set<string>();
                            const propertySettings: any[] = [];

                            for (const { uuid, nodeName, comps } of nodesInfo) {
                                const prop = getPropText(comps, nodeName, uuid) as any;
                                const { propStr, type, pUuid, imType } = prop;

                                if (propStr) {
                                    allPropsStr += propStr;
                                    if (imType) {
                                        importTypes.add(imType);
                                    }

                                    propertySettings.push({
                                        uuid: parentUuid,
                                        path: `__comps__.${index}.${nodeName}`,
                                        dump: {
                                            type,
                                            value: {
                                                uuid: pUuid
                                            }
                                        }
                                    });
                                }
                            }

                            // 添加属性到类定义
                            const reg = text.match(/ extends .*?{/);
                            if (!reg) {
                                console.log("do not match script");
                                return;
                            }
                            text = text.replace(reg[0], reg[0] + allPropsStr);

                            // 添加需要的导入
                            const imReg = text.match(/import .*?}/);
                            if (imReg) {
                                let currentImport = imReg[0];
                                for (const imType of importTypes) {
                                    if (!currentImport.includes(imType)) {
                                        currentImport = currentImport.substring(0, currentImport.length - 1) + `,${imType} }`;
                                    }
                                }
                                text = text.replace(imReg[0], currentImport);
                            }

                            fs.writeFileSync(path, text, "utf-8");
                            // 刷新资源
                            Editor.Message.request('asset-db', 'refresh-asset', scriptUuid);

                            // 批量设置属性
                            setTimeout(() => {
                                for (const obj of propertySettings) {
                                    console.log('设置属性:', obj);
                                    Editor.Message.request('scene', 'set-property', obj);
                                }
                            }, 1000);

                            console.log(`成功绑定 ${nodesInfo.length} 个组件`);
                        } else {
                            console.warn('请至少选中一个节点');
                        }
                    },
                },
            ]
        },
        {
            label: '设置脚本生成路径',
            click() {
                Editor.Panel.open('menu-test.setPathPanel');
            },
        },
    ];
};
