'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let running = false;

function runTool(title, args, doneDetail, afterSuccess) {
    if (running) {
        Editor.Dialog.warn('上一个配置工具还在运行，请等它结束。');
        return;
    }
    const root = Editor.Project.path;
    const nodePath = path.join(root, 'sharedata', 'tools', 'runtime', 'node.exe');
    const scriptPath = path.join(root, 'sharedata', 'tools', 'excel-exporter', 'dist', 'excel-exporter.cjs');
    if (!fs.existsSync(nodePath) || !fs.existsSync(scriptPath)) {
        Editor.Dialog.warn('找不到导表工具。请确认 sharedata/tools/runtime/node.exe 和 excel-exporter.cjs 都在。');
        return;
    }

    running = true;
    let finished = false;
    let output = '';
    console.log(`[配置表] ${title} 开始`);
    const child = spawn(nodePath, [scriptPath, ...args], {
        cwd: root,
        windowsHide: true,
    });

    const take = (chunk) => {
        const text = chunk.toString('utf8');
        output += text;
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
            if (line.length > 0) {
                console.log(`[配置表] ${line}`);
            }
        }
    };
    child.stdout.on('data', take);
    child.stderr.on('data', take);

    const finish = async (code, startError) => {
        if (finished) {
            return;
        }
        finished = true;
        running = false;
        if (startError) {
            console.error(`[配置表] ${title} 无法启动：${startError}`);
            Editor.Dialog.warn(`${title} 无法启动`, { detail: startError });
            return;
        }
        if (code === 0) {
            console.log(`[配置表] ${title} 完成`);
            if (afterSuccess) {
                await afterSuccess();
            }
            Editor.Dialog.info(`${title} 完成`, { detail: doneDetail });
            return;
        }
        console.error(`[配置表] ${title} 失败`);
        const detail = output.trim().slice(-2000) || `退出码 ${code}`;
        Editor.Dialog.warn(`${title} 失败`, { detail });
    };

    child.on('error', (error) => {
        void finish(-1, error.message);
    });
    child.on('close', (code) => {
        void finish(code ?? 1);
    });
}

async function refreshExportedAssets() {
    await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets/resources/ConfigForClient.zip');
    await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets/script/Config/Typings');
}

exports.methods = {
    exportConfig() {
        runTool('导出配置表', [], '配置、JSON 和类型文件已更新。', refreshExportedAssets);
    },
    collectLang() {
        runTool(
            '收集多语言',
            ['--collect-lang'],
            'GameLangData 已更新，已有原文的 id 保持不变。翻译表已锁定。请再点一次「导出配置表」。',
        );
    },
};

exports.load = function load() {};

exports.unload = function unload() {};
