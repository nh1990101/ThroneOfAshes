'use strict';

const compareNames = (left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0;

// Descriptor 会经过 JSON 文件传给 pbjs，不能把非有限默认值静默变成 null。
function cloneDescriptor(value, origin) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
        throw new Error(`${origin} 包含无法无损保存到 JSON descriptor 的非有限数值默认值或选项。`);
    }
    if (Array.isArray(value)) return value.map(item => cloneDescriptor(item, origin));
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneDescriptor(item, origin)]));
    }
    if (typeof value === 'bigint') {
        throw new Error(`${origin} 包含无法保存到 JSON descriptor 的 BigInt 选项。`);
    }
    return value;
}

/**
 * 将源协议的 package 仅在生成阶段统一为 pbType，保留消息内部的嵌套声明。
 * root 必须已 resolveAll；protobuf 为加载该 root 所用的 protobufjs 模块。
 * 不修改原 root 或 .proto，typeUrls 记录生成后的路径到原始消息全名的映射。
 */
function flattenNamespace(root, protobuf) {
    if (!protobuf || typeof protobuf.Root !== 'function' || !(root instanceof protobuf.Root)) {
        throw new Error('flattenNamespace 需要 protobufjs Root 及其对应的 protobufjs 模块。');
    }

    const isType = object => object instanceof protobuf.Type;
    const isEnum = object => object instanceof protobuf.Enum;
    const isService = object => object instanceof protobuf.Service;
    const isField = object => object instanceof protobuf.Field;
    const isNamespace = object => object instanceof protobuf.Namespace;
    const fullName = object => object.fullName.replace(/^\./, '');
    const nested = object => Object.values(object.nested || {}).sort(compareNames);
    const declarations = new Map();
    const placements = new Map();
    const typeUrls = new Map();

    function rejectExtension(object) {
        if (isField(object) && (object.extend || object.extensionField || object.declaringField)) {
            throw new Error(`暂不支持统一命名空间中的 extension 字段：${fullName(object)}。`);
        }
    }

    function collect(object, enclosingPath) {
        rejectExtension(object);
        const declaration = isType(object) || isEnum(object) || isService(object);
        let targetPath = enclosingPath;
        if (declaration) {
            if (!enclosingPath) {
                const existing = declarations.get(object.name);
                if (existing) {
                    throw new Error(`统一 pbType 时存在顶层类型同名冲突：${fullName(existing)} 与 ${fullName(object)} 均名为 ${object.name}。`);
                }
                declarations.set(object.name, object);
                targetPath = `.pbType.${object.name}`;
            } else {
                targetPath = `${enclosingPath}.${object.name}`;
            }
            placements.set(object, targetPath);
            if (isType(object)) {
                typeUrls.set(targetPath.slice(1), fullName(object));
                for (const field of object.fieldsArray) rejectExtension(field);
            }
        } else if (isNamespace(object)) {
            // 仅移除 package 层级；message 内部若有子命名空间，则保留其相对路径。
            if (enclosingPath) targetPath = `${enclosingPath}.${object.name}`;
        } else {
            throw new Error(`无法无损转换协议声明：${fullName(object)}（${object.constructor?.name || 'unknown'}）。`);
        }
        for (const child of nested(object)) collect(child, targetPath);
    }

    for (const object of nested(root)) collect(object, null);

    function checkInterfaceNames(objects) {
        const names = new Map(objects.map(object => [object.name, object]));
        for (const object of objects) {
            if (isType(object)) {
                const interfaceName = `I${object.name}`;
                const conflicting = names.get(interfaceName);
                if (conflicting) {
                    throw new Error(`生成接口命名冲突：${fullName(object)} 的 ${interfaceName} 接口与 ${fullName(conflicting)} 声明同名。`);
                }
            }
            if (isNamespace(object)) checkInterfaceNames(nested(object));
        }
    }
    const topLevel = [...declarations.values()].sort(compareNames);
    checkInterfaceNames(topLevel);

    function mappedType(object, origin) {
        const target = placements.get(object);
        if (!target) {
            throw new Error(`${origin} 引用了无法映射到 pbType 的类型：${object ? fullName(object) : '(unresolved)'}。`);
        }
        return target;
    }

    function rewrite(object, descriptor) {
        if (isType(object)) {
            for (const field of object.fieldsArray) {
                if (!field.resolved) {
                    throw new Error(`字段 ${fullName(field)} 尚未解析，请先调用 root.resolveAll()。`);
                }
                const fieldDescriptor = descriptor.fields[field.name];
                if (!fieldDescriptor) {
                    throw new Error(`转换 descriptor 时丢失字段：${fullName(field)}。`);
                }
                if (field.resolvedType) {
                    // 普通字段、repeated 和 map 的值类型使用同一 resolvedType。
                    fieldDescriptor.type = mappedType(field.resolvedType, fullName(field));
                }
                if (field.map && field.resolvedKeyType) {
                    throw new Error(`暂不支持非标量 map key：${fullName(field)}。`);
                }
            }
        } else if (isService(object)) {
            for (const method of object.methodsArray) {
                if (!method.resolvedRequestType || !method.resolvedResponseType) {
                    throw new Error(`服务方法 ${fullName(method)} 尚未解析，请先调用 root.resolveAll()。`);
                }
                const methodDescriptor = descriptor.methods[method.name];
                methodDescriptor.requestType = mappedType(method.resolvedRequestType, fullName(method));
                methodDescriptor.responseType = mappedType(method.resolvedResponseType, fullName(method));
            }
        }
        for (const child of nested(object)) {
            if (!descriptor.nested || !Object.prototype.hasOwnProperty.call(descriptor.nested, child.name)) {
                throw new Error(`转换 descriptor 时丢失嵌套声明：${fullName(child)}。`);
            }
            rewrite(child, descriptor.nested[child.name]);
        }
    }

    const flattened = Object.fromEntries(topLevel.map(object => {
        const descriptor = cloneDescriptor(object.toJSON({ keepComments: true }), fullName(object));
        rewrite(object, descriptor);
        return [object.name, descriptor];
    }));
    const descriptor = { nested: { pbType: { nested: flattened } } };
    if (root.options) descriptor.options = cloneDescriptor(root.options, 'root.options');
    return { descriptor, typeUrls };
}

module.exports = { flattenNamespace };
