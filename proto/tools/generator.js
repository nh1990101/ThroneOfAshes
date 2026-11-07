'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { analyzeSchema } = require('./schema');
const { flattenNamespace } = require('./namespace');

function getDependencies() {
    try {
        return { protobuf: require('protobufjs'), cli: require('protobufjs-cli') };
    } catch (error) {
        throw new Error('缺少 Proto 工具依赖，请在项目根目录运行 npm install。原始错误：' + error.message);
    }
}

function findProtoFiles(directory) {
    const files = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...findProtoFiles(filename));
        else if (entry.isFile() && entry.name.endsWith('.proto')) files.push(filename);
    }
    return files.sort();
}

function runTool(tool, args) {
    return new Promise((resolve, reject) => {
        tool.main(args, (error, result) => error ? reject(error) : resolve(result));
    });
}

function normalize(source) {
    return source.replace(/\r\n/g, '\n').trimEnd() + '\n';
}

function readIfPresent(filename) {
    return fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : null;
}

// 所有编译与校验先完成；落盘失败时尽量恢复此前文件，已有 .meta 不参与写入。
function writeOutputs(outputs, changed) {
    const previous = new Map();
    const pending = [];
    const written = [];
    try {
        for (const filename of changed) {
            fs.mkdirSync(path.dirname(filename), { recursive: true });
            previous.set(filename, readIfPresent(filename));
            const temporary = filename + '.proto-' + crypto.randomUUID() + '.tmp';
            pending.push(temporary);
            fs.writeFileSync(temporary, outputs.get(filename), 'utf8');
        }
        for (let index = 0; index < changed.length; index++) {
            fs.renameSync(pending[index], changed[index]);
            written.push(changed[index]);
        }
    } catch (error) {
        for (const filename of written.reverse()) {
            const original = previous.get(filename);
            if (original === null) fs.unlinkSync(filename);
            else fs.writeFileSync(filename, original, 'utf8');
        }
        throw error;
    } finally {
        for (const temporary of pending) {
            if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
        }
    }
}

async function build(options = {}) {
    const projectRoot = path.resolve(options.projectRoot || path.join(__dirname, '../..'));
    const protoDirectory = path.join(projectRoot, 'proto');
    const routeFile = path.join(protoDirectory, 'routes.json');
    // CLI 与 Creator 共用锁，避免两个入口同时写入一组产物。
    const lockName = 'rpgcore-proto-' + crypto.createHash('sha256').update(projectRoot.toLowerCase()).digest('hex').slice(0, 20) + '.lock';
    const lockFile = path.join(os.tmpdir(), lockName);
    let lock;
    try {
        lock = fs.openSync(lockFile, 'wx');
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const busy = new Error('已有 Proto 编译正在执行，请稍后重试。锁文件：' + lockFile);
        busy.code = 'PROTO_BUSY';
        // 不自动删除其他进程的锁，避免回收过程中误删新取得的锁。
        let owner;
        try { owner = Number(fs.readFileSync(lockFile, 'utf8')); } catch (_) { /* 另一进程正在创建锁。 */ }
        if (Number.isInteger(owner) && owner > 0) {
            try { process.kill(owner, 0); } catch (probeError) {
                if (probeError.code === 'ESRCH') {
                    busy.code = 'PROTO_STALE_LOCK';
                    busy.message = '检测到上次编译遗留的锁，确认没有编译进程后删除此文件再重试：' + lockFile;
                }
            }
        }
        throw busy;
    }
    let stage;
    try {
        fs.writeFileSync(lock, String(process.pid));
        const { protobuf, cli } = getDependencies();
        const files = findProtoFiles(protoDirectory);
        if (!files.length) throw new Error('proto 目录中没有 .proto 文件。');
        const routesConfig = JSON.parse(fs.readFileSync(routeFile, 'utf8').replace(/^\uFEFF/, ''));
        const root = new protobuf.Root();
        const resolvePath = root.resolvePath.bind(root);
        root.resolvePath = (origin, target) => {
            const resolved = resolvePath(origin, target);
            if (fs.existsSync(resolved)) return resolved;
            const fromProtoRoot = path.resolve(protoDirectory, target);
            return fs.existsSync(fromProtoRoot) ? fromProtoRoot : resolved;
        };
        root.loadSync(files, { keepCase: true }).resolveAll();
        const schema = analyzeSchema(root, routesConfig);
        if (options.strict && schema.warnings.length) {
            throw new Error('严格检查失败：\n' + schema.warnings.join('\n'));
        }
        const { descriptor, typeUrls } = flattenNamespace(root, protobuf);

        stage = fs.mkdtempSync(path.join(os.tmpdir(), 'rpgcore-proto-'));
        const jsFile = path.join(stage, 'ProtoDefined.js');
        const descriptorFile = path.join(stage, 'ProtoDefined.json');
        fs.writeFileSync(descriptorFile, JSON.stringify(descriptor), 'utf8');
        let js = await runTool(cli.pbjs, [
            '-t', 'static-module', '-w', 'es6', '-l', 'eslint-disable',
            '--es6', '--keep-case', descriptorFile,
        ]);
        // 客户端统一 pbType 命名空间，Any 的服务器类型标识仍使用原始 proto 全名。
        for (const [clientName, serverName] of typeUrls) {
            js = js.split(`return typeUrlPrefix + "/${clientName}";`)
                .join(`return typeUrlPrefix + "/${serverName}";`);
        }
        fs.writeFileSync(jsFile, js, 'utf8');
        const declarations = await runTool(cli.pbts, [jsFile]);

        const importLine = 'import * as $protobuf from "protobufjs/minimal";';
        if (!js.includes(importLine) || !/const \$root = [^\n]+;/.test(js)) {
            throw new Error('protobufjs 输出格式已变化，无法应用 Cocos 兼容处理。');
        }
        // 在变为 TS 前验证生成 JS 的语法，防止不完整产物进入 assets。
        new vm.Script(js.replace(importLine, '')
            .replace(/export const /g, 'const ')
            .replace(/export \{ \$root as default \};?/, ''));
        const runtimeImport = fs.existsSync(path.join(projectRoot, 'assets/@protobufjs'))
            ? 'const $protobuf = globalThis.protobuf;'
            : 'import $protobuf from "protobufjs/minimal.js";';
        const implementation = '// @ts-nocheck\n// 自动生成，请修改 proto 源文件后运行 npm run proto。\n'
            + js.replace(importLine, runtimeImport)
                .replace(/const \$root = [^\n]+;/, 'const $root: typeof import("./ProtoDefined.d") = {};')
                .replace(/export const (\w+) = (\$root\.\w+) =/g, 'export const $1: typeof $2 = $2 =');
        const types = '// 自动生成，请修改 proto 源文件后运行 npm run proto。\n'
            + declarations.replace('import * as $protobuf', 'import type * as $protobuf')
                .replace('import Long = require("long");', 'import type Long from "long";');
        const networkDirectory = path.join(projectRoot, 'assets/script/WebSocket');
        const outputs = new Map([
            [path.join(networkDirectory, 'proto/ProtoDefined.ts'), normalize(implementation)],
            [path.join(networkDirectory, 'proto/ProtoDefined.d.ts'), normalize(types)],
            [path.join(networkDirectory, 'ProtoMessageType.ts'), normalize(schema.enumSource)],
            [path.join(networkDirectory, 'ProtoRoutes.ts'), normalize(schema.routesSource)],
        ]);
        const changed = [...outputs.keys()].filter(filename => {
            const old = readIfPresent(filename);
            return old === null || normalize(old) !== outputs.get(filename);
        });
        const result = {
            changed,
            warnings: schema.warnings,
            dependencies: [...new Set([...files, ...root.files.filter(filename => fs.existsSync(filename)).map(filename => path.resolve(filename)), routeFile])],
            outputs,
            messages: schema.messages,
            testOnly: routesConfig.testOnly === true,
        };
        if (options.check && changed.length) {
            throw new Error('生成文件已过期，请运行 npm run proto：\n' + changed.map(filename => path.relative(projectRoot, filename)).join('\n'));
        }
        if (!options.check) writeOutputs(outputs, changed);
        if (!options.quiet) {
            console.log(`[Proto] ${options.check ? '检查通过' : '生成完成'}：${schema.messages.length} 个数据类型，更新 ${changed.length} 个文件。`);
            if (result.testOnly) console.warn('[Proto] 当前使用测试路由；与服务端联调前请替换 proto/routes.json 中的 ID。');
            for (const warning of schema.warnings) console.warn('[Proto] ' + warning);
        }
        return result;
    } finally {
        try {
            if (stage) {
                const resolvedStage = path.resolve(stage);
                if (path.dirname(resolvedStage) !== path.resolve(os.tmpdir()) || !path.basename(resolvedStage).startsWith('rpgcore-proto-')) {
                    throw new Error('拒绝清理非 Proto 临时目录：' + resolvedStage);
                }
                fs.rmSync(resolvedStage, { recursive: true, force: true });
            }
        } finally {
            try { fs.closeSync(lock); }
            finally { fs.unlinkSync(lockFile); }
        }
    }
}

module.exports = { build, findProtoFiles };
