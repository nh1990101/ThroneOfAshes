'use strict';

// Creator 菜单与 npm 命令共用生成核心；协议与路由的监听请运行 npm run proto:watch。
module.exports = {
    proto_list: [{
        proto_ss: ['./proto/**/*.proto'],
        ts_output_path_s: './assets/script/WebSocket/proto/ProtoDefined.ts',
        dts_output_path_s: './assets/script/WebSocket/proto/ProtoDefined.d.ts',
    }],
    automatic_build_b: false,
    automatic_build_delay_s_n: 2,
    // 跳过插件原有的源文件备份/恢复和仅按 proto mtime 判断更新的流程。
    managed_build_b: true,
    async build_f() {
        try {
            // pbts 会用 process.execPath 启动 JSDoc；显式用 Node，避免启动 Creator/Electron。
            const { execFile } = require('child_process');
            const path = require('path');
            await new Promise((resolve, reject) => {
                execFile('node', [path.join(__dirname, 'proto/auto-compile.js')], {
                    cwd: __dirname,
                    windowsHide: true,
                }, (error, stdout, stderr) => {
                    if (stdout) console.log(stdout.trimEnd());
                    if (stderr) console.warn(stderr.trimEnd());
                    if (error) reject(error);
                    else resolve();
                });
            });
            if (typeof Editor !== 'undefined') {
                await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets/script/WebSocket');
            }
            return true;
        } catch (error) {
            console.error('[Proto] ' + error.message);
            return false;
        }
    },
};
