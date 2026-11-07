'use strict';

const VALID_ROLES = new Set(['request', 'server', 'both', 'data']);
const CONFIG_FIELDS = new Set(['testOnly', 'defaultModuleId', 'routes', 'roles']);
const ROUTE_FIELDS = new Set(['commandId', 'moduleId']);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const compareNames = (left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
const compareFullNames = (left, right) => left.fullName < right.fullName ? -1 : left.fullName > right.fullName ? 1 : 0;

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateFields(value, allowedFields, label) {
    const unknown = Object.keys(value).filter(key => !allowedFields.has(key)).sort();
    if (unknown.length) {
        throw new Error(`${label} 包含未知字段：${unknown.join(', ')}。`);
    }
}

function isMessage(object) {
    return isRecord(object) && (
        object.constructor?.className === 'Type'
        || object.constructor?.name === 'Type'
        || isRecord(object.fields)
    );
}

function inferRole(name) {
    if (name.endsWith('Req')) return 'request';
    if (name.endsWith('Resp') || name.startsWith('Ntf')) return 'server';
    return 'data';
}

function validateModuleId(value, label) {
    if (!Number.isInteger(value) || value < 0 || value > 255) {
        throw new Error(`${label} 必须是 0~255 的整数。`);
    }
}

function generateEnumSource(requestMessages, serverMessages) {
    const lines = [
        '/** 协议消息类型枚举，由 proto 工具自动生成，请勿手动修改。 */',
        '',
        '/** 请求消息类型。 */',
        'export enum ProtoRequestType {',
        ...requestMessages.map(({ enumName, eventName }) => `    ${enumName} = '${eventName}',`),
        '}',
        '',
        '/** 服务器消息类型（响应和通知）。 */',
        'export enum ProtoServerMessageType {',
        ...serverMessages.map(({ enumName, eventName }) => `    ${enumName} = '${eventName}',`),
        '}',
        '',
        '/** 所有网络消息类型。 */',
        'export type ProtoMessageType = ProtoRequestType | ProtoServerMessageType;',
        '',
    ];
    return lines.join('\n');
}

function generateRoutesSource(networkMessages, routes, testOnly) {
    const lines = [
        '/** 协议路由，由 proto/routes.json 自动生成，请勿手动修改。 */',
        "import type { ProtoMessageType } from './ProtoMessageType';",
        '',
        '/** 指令 ID 为 int32，模块号为 0~255 的单字节整数。 */',
        'export interface IProtoRoute {',
        '    commandId: number;',
        '    moduleId: number;',
        '}',
        '',
        'export const PROTO_ROUTES: Record<ProtoMessageType, IProtoRoute | null> = {',
        ...networkMessages.map(({ fullName, eventName }) => {
            const route = routes.get(fullName);
            const value = route === null
                ? 'null'
                : `{ commandId: ${route.commandId}, moduleId: ${route.moduleId} }`;
            return `    '${eventName}': ${value},`;
        }),
        '};',
        '',
        '/** true 表示当前路由仅用于本地测试，尚未经服务端确认。 */',
        `export const PROTO_ROUTES_TEST_ONLY = ${testOnly};`,
        '',
    ];
    return lines.join('\n');
}

/**
 * 分析已 resolveAll 的 protobufjs Root，生成消息枚举和路由源码。
 * 只读取解析树和配置，不修改文件或为协议自动分配指令 ID。
 * roles 和 routes 使用完整消息名；兼容 package pb 顶层消息的旧简名。
 * 无 package 消息的事件名保留前导点，明确从生成的根对象寻址。
 */
function analyzeSchema(root, routesConfig = {}) {
    if (!isRecord(root) || typeof root.lookupType !== 'function') {
        throw new Error('analyzeSchema 需要已解析并 resolveAll 的 protobufjs Root。');
    }
    if (!isRecord(routesConfig)) {
        throw new Error('协议路由配置必须是 JSON 对象。');
    }
    validateFields(routesConfig, CONFIG_FIELDS, '协议路由配置');

    const roles = own(routesConfig, 'roles') ? routesConfig.roles : {};
    const configuredRoutes = own(routesConfig, 'routes') ? routesConfig.routes : {};
    if (!isRecord(roles)) throw new Error('roles 必须是对象。');
    if (!isRecord(configuredRoutes)) throw new Error('routes 必须是对象。');
    if (own(routesConfig, 'testOnly') && typeof routesConfig.testOnly !== 'boolean') {
        throw new Error('testOnly 必须是布尔值。');
    }
    if (own(routesConfig, 'defaultModuleId')) {
        validateModuleId(routesConfig.defaultModuleId, 'defaultModuleId');
    }

    const collected = [];
    function visit(object, segments, insideMessage) {
        const message = isMessage(object);
        if (message) {
            const fullName = segments.join('.');
            if (insideMessage) {
                if (inferRole(object.name) !== 'data') {
                    throw new Error(`网络消息 ${fullName} 必须直接定义在 package 下；暂不支持嵌套网络消息。`);
                }
            } else {
                const legacy = segments.length === 2 && segments[0] === 'pb';
                collected.push({
                    name: object.name,
                    fullName,
                    eventName: legacy ? object.name : segments.length === 1 ? `.${fullName}` : fullName,
                    role: inferRole(object.name),
                });
            }
        }
        for (const child of Object.values(object.nested || {}).sort(compareNames)) {
            visit(child, [...segments, child.name], insideMessage || message);
        }
    }
    visit(root, [], false);
    collected.sort(compareFullNames);

    const byFullName = new Map(collected.map(message => [message.fullName, message]));
    const legacyByName = new Map(collected
        .filter(message => message.fullName === `pb.${message.name}`)
        .map(message => [message.name, message]));

    function normalizeConfigKeys(config, label) {
        const normalized = new Map();
        const originalKeys = new Map();
        for (const key of Object.keys(config).sort()) {
            if (key !== key.trim()) {
                throw new Error(`${label} 的消息名 ${JSON.stringify(key)} 包含首尾空白，请改为 ${JSON.stringify(key.trim())}。`);
            }
            const explicitRoot = key.startsWith('.');
            const canonicalKey = explicitRoot ? key.slice(1) : key;
            const canonical = byFullName.get(canonicalKey);
            const legacy = explicitRoot ? null : legacyByName.get(key);
            if (canonical && legacy && canonical !== legacy) {
                throw new Error(`${label}.${key} 存在歧义，请使用 .${canonical.fullName} 或 ${legacy.fullName} 明确指定消息。`);
            }
            const target = canonical || legacy;
            if (!target) {
                const candidates = collected.filter(message => message.name === canonicalKey);
                if (candidates.length) {
                    throw new Error(`${label}.${key} 必须使用完整消息名：${candidates.map(message => message.fullName).join(', ')}。`);
                }
                throw new Error(`${label} 包含未知的顶层消息：${key}。`);
            }
            if (normalized.has(target.fullName)) {
                throw new Error(`${label} 对消息 ${target.fullName} 重复配置了别名：${originalKeys.get(target.fullName)} 与 ${key}。`);
            }
            normalized.set(target.fullName, config[key]);
            originalKeys.set(target.fullName, key);
        }
        return normalized;
    }

    const normalizedRoles = normalizeConfigKeys(roles, 'roles');
    const routeInputs = normalizeConfigKeys(configuredRoutes, 'routes');
    for (const [fullName, role] of normalizedRoles) {
        if (!VALID_ROLES.has(role)) {
            throw new Error(`roles.${fullName} 必须是 request、server、both 或 data。`);
        }
    }

    const shortNameCounts = new Map();
    for (const { name } of collected) shortNameCounts.set(name, (shortNameCounts.get(name) || 0) + 1);
    const messages = collected.map(message => ({
        ...message,
        enumName: shortNameCounts.get(message.name) === 1 || message.fullName === `pb.${message.name}`
            ? message.name
            : message.eventName.replace(/\./g, '_'),
        role: normalizedRoles.has(message.fullName) ? normalizedRoles.get(message.fullName) : message.role,
    }));
    const requestMessages = messages.filter(message => message.role === 'request' || message.role === 'both');
    const serverMessages = messages.filter(message => message.role === 'server' || message.role === 'both');
    const networkMessages = messages.filter(message => message.role !== 'data');
    const enumNames = new Map();
    const eventNames = new Map();
    for (const message of networkMessages) {
        const existingEnum = enumNames.get(message.enumName);
        if (existingEnum) {
            throw new Error(`枚举成员别名冲突：${existingEnum} 与 ${message.fullName} 均使用 ${message.enumName}，请调整协议命名。`);
        }
        const existingEvent = eventNames.get(message.eventName);
        if (existingEvent) {
            throw new Error(`消息事件名冲突：${existingEvent} 与 ${message.fullName} 均使用 ${message.eventName}。`);
        }
        enumNames.set(message.enumName, message.fullName);
        eventNames.set(message.eventName, message.fullName);
    }
    const messagesByFullName = new Map(messages.map(message => [message.fullName, message]));
    for (const fullName of routeInputs.keys()) {
        if (messagesByFullName.get(fullName).role === 'data') {
            throw new Error(`routes.${fullName} 是数据结构，不能配置网络路由。`);
        }
    }

    const warnings = [];
    const normalizedRoutes = new Map();
    const directionalRoutes = {
        request: new Map(),
        server: new Map(),
    };
    for (const message of networkMessages) {
        const { fullName, role } = message;
        const route = routeInputs.has(fullName) ? routeInputs.get(fullName) : null;
        if (route === null) {
            normalizedRoutes.set(fullName, null);
            warnings.push(`${fullName} 未配置路由，将生成为 null；请在 proto/routes.json 中填写服务端确认的 commandId/moduleId。`);
            continue;
        }
        if (!isRecord(route)) {
            throw new Error(`routes.${fullName} 必须为 null 或 { commandId, moduleId } 对象。`);
        }
        validateFields(route, ROUTE_FIELDS, `routes.${fullName}`);
        if (!own(route, 'commandId') || !Number.isInteger(route.commandId)
            || route.commandId < -0x80000000 || route.commandId > 0x7FFFFFFF) {
            throw new Error(`routes.${fullName}.commandId 必须是 int32 整数。`);
        }
        const moduleId = own(route, 'moduleId') ? route.moduleId : routesConfig.defaultModuleId;
        validateModuleId(moduleId, `routes.${fullName}.moduleId（或 defaultModuleId）`);
        normalizedRoutes.set(fullName, { commandId: route.commandId, moduleId });

        // 同方向消息必须可由路由唯一识别；请求与响应可以复用同一组 ID。
        const key = `${moduleId}/${route.commandId}`;
        for (const directionRole of role === 'both' ? ['request', 'server'] : [role]) {
            const sameDirection = directionalRoutes[directionRole];
            const existing = sameDirection.get(key);
            if (existing) {
                const direction = directionRole === 'request' ? '请求' : '服务器消息';
                throw new Error(`${direction}路由重复：${existing} 与 ${fullName} 均使用 moduleId/commandId = ${key}。`);
            }
            sameDirection.set(key, fullName);
        }
    }

    return {
        messages,
        requestMessages,
        serverMessages,
        warnings,
        enumSource: generateEnumSource(requestMessages, serverMessages),
        routesSource: generateRoutesSource(networkMessages, normalizedRoutes, routesConfig.testOnly === true),
    };
}

module.exports = { analyzeSchema };
