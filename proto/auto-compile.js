#!/usr/bin/env node

/**
 * Proto 自动编译工具
 * 功能：
 * 1. 监听 proto 文件变化，自动编译
 * 2. 自动更新 ProtoConfig.ts 中的消息 ID 和映射
 * 3. 自动更新 ProtoNetworkMgr.ts 中的编解码逻辑
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROTO_DIR = __dirname; // proto 源文件目录
const OUTPUT_DIR = path.join(__dirname, '../assets/script/WebSocket/proto'); // 生成文件输出目录
const ASSETS_DIR = path.join(__dirname, '../assets/script/WebSocket');
const CONFIG_FILE = path.join(ASSETS_DIR, 'ProtoConfig.ts');
const NETWORK_MGR_FILE = path.join(ASSETS_DIR, 'ProtoNetworkMgr.ts');

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

// 编译 proto 文件
function compileProto() {
    log('\n========================================', 'cyan');
    log('开始编译 Proto 文件...', 'cyan');
    log('========================================', 'cyan');

    try {
        // 确保输出目录存在
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
            log(`✓ 创建输出目录: ${OUTPUT_DIR}`, 'green');
        }

        // 编译 proto 到 JS（使用 ES6 模块格式，兼容 Cocos Creator）
        log('\n[1/3] 编译 proto 文件到 JavaScript...', 'yellow');
        const outputJsPath = path.join(OUTPUT_DIR, 'proto.js');
        execSync(`npx pbjs -t static-module -w es6 -o "${outputJsPath}" *.proto`, {
            cwd: PROTO_DIR,
            stdio: 'inherit'
        });
        log('✓ proto.js 生成成功', 'green');

        // 生成 TypeScript 类型定义
        log('\n[2/3] 生成 TypeScript 类型定义...', 'yellow');
        const outputDtsPath = path.join(OUTPUT_DIR, 'proto.d.ts');
        execSync(`npx pbts -o "${outputDtsPath}" "${outputJsPath}"`, {
            cwd: PROTO_DIR,
            stdio: 'inherit'
        });
        log('✓ proto.d.ts 生成成功', 'green');

        // 解析消息类型
        log('\n[3/3] 解析消息类型...', 'yellow');
        const messages = parseProtoMessages();
        log(`✓ 找到 ${messages.length} 个消息类型`, 'green');

        return messages;

    } catch (error) {
        log(`✗ 编译失败: ${error.message}`, 'red');
        throw error;
    }
}

// 解析 proto 文件中的所有消息类型
function parseProtoMessages() {
    const protoFiles = fs.readdirSync(PROTO_DIR).filter(f => f.endsWith('.proto'));
    const messages = [];

    protoFiles.forEach(file => {
        const content = fs.readFileSync(path.join(PROTO_DIR, file), 'utf-8');
        const lines = content.split('\n');

        lines.forEach(line => {
            // 匹配 message 定义
            const match = line.match(/^\s*message\s+(\w+)\s*\{/);
            if (match) {
                const msgName = match[1];
                messages.push({
                    name: msgName,
                    file: file,
                    fullName: `pb.${msgName}`
                });
            }
        });
    });

    return messages;
}

// 更新 ProtoConfig.ts
function updateProtoConfig(messages) {
    log('\n========================================', 'cyan');
    log('更新 ProtoConfig.ts...', 'cyan');
    log('========================================', 'cyan');

    // 读取现有配置，保留已有的消息ID
    let existingIds = {};
    if (fs.existsSync(CONFIG_FILE)) {
        const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const idMatch = content.match(/export enum ProtoMsgId\s*\{([^}]+)\}/s);
        if (idMatch) {
            const enumContent = idMatch[1];
            const lines = enumContent.split('\n');
            lines.forEach(line => {
                const match = line.match(/(\w+)\s*=\s*(\d+)/);
                if (match) {
                    existingIds[match[1]] = parseInt(match[2]);
                }
            });
        }
    }

    // 生成消息ID枚举
    let nextId = Math.max(1000, ...Object.values(existingIds)) + 1;
    const enumLines = [];
    const mapLines = [];

    messages.forEach((msg, index) => {
        const msgId = existingIds[msg.name] || nextId++;

        // 添加注释分组
        if (index === 0 || messages[index - 1].file !== msg.file) {
            enumLines.push(`\n    // ========== ${msg.file} ==========`);
        }

        enumLines.push(`    ${msg.name} = ${msgId},`);
        mapLines.push(`    [ProtoMsgId.${msg.name}]: '${msg.fullName}',`);
    });

    // 生成新的配置文件内容
    const configContent = `/**
 * Proto 消息配置
 * 自动生成，请勿手动修改
 * 生成时间: ${new Date().toLocaleString('zh-CN')}
 */

// 消息ID枚举
export enum ProtoMsgId {${enumLines.join('\n')}
}

// 消息ID到消息名称的映射（用于日志输出）
export const ProtoMsgName: { [key: number]: string } = {
${mapLines.join('\n')}
};
`;

    fs.writeFileSync(CONFIG_FILE, configContent, 'utf-8');
    log(`✓ ProtoConfig.ts 更新成功 (${messages.length} 个消息)`, 'green');
}

// 更新 ProtoNetworkMgr.ts 的编解码逻辑
function updateProtoNetworkMgr(messages) {
    log('\n========================================', 'cyan');
    log('更新 ProtoNetworkMgr.ts...', 'cyan');
    log('========================================', 'cyan');

    if (!fs.existsSync(NETWORK_MGR_FILE)) {
        log('✗ ProtoNetworkMgr.ts 不存在，跳过更新', 'yellow');
        return;
    }

    let content = fs.readFileSync(NETWORK_MGR_FILE, 'utf-8');

    // 生成 encode 方法的 switch cases
    const encodeCases = messages.map(msg =>
        `            case ProtoMsgId.${msg.name}:\n` +
        `                return pb.${msg.name}.encode(data).finish();`
    ).join('\n\n');

    // 生成 decode 方法的 switch cases
    const decodeCases = messages.map(msg =>
        `            case ProtoMsgId.${msg.name}:\n` +
        `                return pb.${msg.name}.decode(protoData);`
    ).join('\n\n');

    // 替换 encode 方法
    const encodeRegex = /private encodeProtoMessage\(msgId: number, data: any\): Uint8Array \| null \{[\s\S]*?return null;\s*\}/;
    const newEncodeMethod = `private encodeProtoMessage(msgId: number, data: any): Uint8Array | null {
        try {
            switch (msgId) {
${encodeCases}

                default:
                    warn(\`未知的消息ID: \${msgId}\`);
                    return null;
            }
        } catch (error) {
            warn(\`Proto编码失败: MsgId=\${msgId}\`, error);
            return null;
        }
    }`;

    if (encodeRegex.test(content)) {
        content = content.replace(encodeRegex, newEncodeMethod);
        log('✓ encode 方法更新成功', 'green');
    } else {
        log('✗ 未找到 encodeProtoMessage 方法，跳过更新', 'yellow');
    }

    // 替换 decode 方法
    const decodeRegex = /private decodeProtoMessage\(msgId: number, protoData: Uint8Array\): any \| null \{[\s\S]*?return null;\s*\}/;
    const newDecodeMethod = `private decodeProtoMessage(msgId: number, protoData: Uint8Array): any | null {
        try {
            switch (msgId) {
${decodeCases}

                default:
                    warn(\`未知的消息ID: \${msgId}\`);
                    return null;
            }
        } catch (error) {
            warn(\`Proto解码失败: MsgId=\${msgId}\`, error);
            return null;
        }
    }`;

    if (decodeRegex.test(content)) {
        content = content.replace(decodeRegex, newDecodeMethod);
        log('✓ decode 方法更新成功', 'green');
    } else {
        log('✗ 未找到 decodeProtoMessage 方法，跳过更新', 'yellow');
    }

    fs.writeFileSync(NETWORK_MGR_FILE, content, 'utf-8');
    log('✓ ProtoNetworkMgr.ts 更新完成', 'green');
}

// 监听模式
function watchMode() {
    log('\n========================================', 'cyan');
    log('进入监听模式...', 'cyan');
    log('监听目录: ' + PROTO_DIR, 'cyan');
    log('按 Ctrl+C 退出', 'cyan');
    log('========================================\n', 'cyan');

    let isCompiling = false;

    fs.watch(PROTO_DIR, { recursive: false }, (eventType, filename) => {
        if (!filename || !filename.endsWith('.proto')) {
            return;
        }

        if (isCompiling) {
            return;
        }

        log(`\n检测到文件变化: ${filename}`, 'yellow');
        isCompiling = true;

        setTimeout(() => {
            try {
                const messages = compileProto();
                updateProtoConfig(messages);
                updateProtoNetworkMgr(messages);
                log('\n========================================', 'green');
                log('✓ 自动编译完成！', 'green');
                log('========================================\n', 'green');
            } catch (error) {
                log(`\n✗ 自动编译失败: ${error.message}`, 'red');
            } finally {
                isCompiling = false;
            }
        }, 500);
    });
}

// 主函数
function main() {
    const args = process.argv.slice(2);
    const isWatch = args.includes('--watch') || args.includes('-w');

    try {
        // 先执行一次编译
        const messages = compileProto();
        updateProtoConfig(messages);
        updateProtoNetworkMgr(messages);

        log('\n========================================', 'green');
        log('✓ 编译完成！', 'green');
        log('========================================', 'green');

        // 监听模式
        if (isWatch) {
            watchMode();
        } else {
            log('\n提示: 使用 --watch 参数可以启动监听模式', 'cyan');
        }

    } catch (error) {
        log(`\n✗ 执行失败: ${error.message}`, 'red');
        process.exit(1);
    }
}

// 执行
main();
