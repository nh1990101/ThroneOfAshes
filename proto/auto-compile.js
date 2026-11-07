#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { build, findProtoFiles } = require('./tools/generator');

// 轮询内容变化，兼容编辑器以替换文件方式保存，以及新增/删除子目录。
function snapshot(protoDirectory, dependencies) {
    const files = [...new Set([...findProtoFiles(protoDirectory), path.join(protoDirectory, 'routes.json'), ...dependencies])].sort();
    return files.map(filename => {
        try { return filename + '\0' + fs.readFileSync(filename, 'utf8'); }
        catch (error) { if (error.code === 'ENOENT') return filename + '\0missing'; throw error; }
    }).join('\0');
}

async function main(args = process.argv.slice(2)) {
    const flags = new Set(args);
    if (flags.has('--help') || flags.has('-h')) {
        console.log('用法：node proto/auto-compile.js [--watch | --check] [--strict]\n--watch 监听协议和路由变更\n--check 只检查产物是否最新\n--strict 要求所有网络消息均已配置路由');
        return;
    }
    for (const argument of flags) {
        if (!['--watch', '--check', '--strict'].includes(argument)) throw new Error('未知参数：' + argument);
    }
    if (flags.has('--watch') && flags.has('--check')) throw new Error('--watch 与 --check 不能同时使用。');
    const projectRoot = path.resolve(__dirname, '..');
    const options = { projectRoot, check: flags.has('--check'), strict: flags.has('--strict') };
    if (!flags.has('--watch')) return build(options);

    let dependencies = [];
    let observed = snapshot(__dirname, dependencies);
    let busyReported = false;
    async function compile() {
        try {
            const result = await build(options);
            dependencies = result.dependencies;
            busyReported = false;
        } catch (error) {
            if (error.code === 'PROTO_BUSY') {
                if (!busyReported) console.error('[Proto] ' + error.message);
                busyReported = true;
                return false;
            }
            console.error('[Proto] ' + error.message);
        }
        return true;
    }
    if (!await compile()) observed = null;
    console.log('[Proto] 正在监听 .proto 和 routes.json，按 Ctrl+C 退出。');
    let running = false;
    const timer = setInterval(async () => {
        if (running) return;
        running = true;
        try {
            const current = snapshot(__dirname, dependencies);
            if (current !== observed) {
                if (await compile()) observed = current;
            }
        } catch (error) {
            console.error('[Proto] ' + error.message);
        } finally {
            running = false;
        }
    }, 500);
    const stop = () => { clearInterval(timer); process.exitCode = 0; };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
}

if (require.main === module) main().catch(error => {
    console.error('[Proto] ' + error.message);
    process.exitCode = 1;
});

module.exports = { main, snapshot };
