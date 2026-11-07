import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ConfigExportError, FormatWorkbookLabel } from './errors.js';

interface SvnOutput {
    code: number;
    stdout: string;
    stderr: string;
}

interface SvnInfo {
    url: string;
    token?: string;
    owner?: string;
}

/** 写版本化表格前取得锁；只复用当前工作副本实际持有的锁，不抢锁、不自动更新。 */
export async function EnsureSvnLock(_filePath: string): Promise<void> {
    const filePath = path.resolve(_filePath);
    // 普通副本（例如导表测试的数据）不需要 SVN，不能用文件的可写属性判断是否持锁。
    if (!await IsInWorkingCopy(filePath)) {
        return;
    }
    const executable = await FindSvn(filePath);
    const local = await ReadInfo(executable, filePath, filePath, true);
    if (local === null) {
        return;
    }
    if (local.token !== undefined) {
        const remote = await ReadInfo(executable, local.url, filePath, false);
        if (remote?.token === local.token) {
            return;
        }
        const owner = remote?.owner;
        throw new ConfigExportError(
            `本地 SVN 锁已失效${owner === undefined ? '' : `，服务器上的锁属于 ${owner}`}。请先检查锁状态并更新后再收集：${filePath}`,
        );
    }

    const locked = await RunSvn(executable, ['lock', '-m', '收集多语言', '--', PegSafe(filePath)]);
    if (locked.code !== 0) {
        throw SvnFailure('无法锁定表格', filePath, locked);
    }
    // SVN 部分命令会给出警告；只有本工作副本实际取得 token 才能继续写入。
    const acquired = await ReadInfo(executable, filePath, filePath, false);
    if (acquired?.token === undefined) {
        throw new ConfigExportError(`SVN 未返回当前工作副本的锁，已停止写表：${filePath}`);
    }
    console.log(`已锁定表格：${FormatWorkbookLabel(filePath)}`);
}

async function IsInWorkingCopy(_filePath: string): Promise<boolean> {
    let directory = path.dirname(_filePath);
    while (true) {
        try {
            if ((await fs.stat(path.join(directory, '.svn'))).isDirectory()) {
                return true;
            }
        } catch (_error: unknown) {
            const code = (_error as NodeJS.ErrnoException).code;
            if (code !== 'ENOENT' && code !== 'ENOTDIR') {
                throw new ConfigExportError(`无法检查 SVN 工作副本：${directory}\n${String(_error)}`);
            }
        }
        const parent = path.dirname(directory);
        if (parent === directory) {
            return false;
        }
        directory = parent;
    }
}

async function FindSvn(_filePath: string): Promise<string> {
    const override = process.env.SVN_EXECUTABLE?.trim();
    const candidates = override ? [override] : [
        // 批处理原本就使用项目自带 Node；优先读取它旁边的 SVN，无需修改系统 PATH。
        path.join(path.dirname(process.execPath), 'svn', 'svn.exe'),
        path.resolve('sharedata/tools/runtime/svn/svn.exe'),
        'svn',
        ...[process.env.ProgramW6432, process.env.ProgramFiles, process.env['ProgramFiles(x86)']]
            .filter((_root): _root is string => Boolean(_root))
            .map((_root) => path.join(_root, 'TortoiseSVN', 'bin', 'svn.exe')),
    ];
    for (const candidate of new Set(candidates)) {
        try {
            const version = await RunProcess(candidate, ['--version', '--quiet']);
            if (version.code !== 0 || !/^\d+\.\d+\.\d+/m.test(version.stdout)) {
                throw new ConfigExportError(`SVN 命令行组件无法运行：${candidate}\n${version.stderr || version.stdout}`);
            }
            return candidate;
        } catch (_error: unknown) {
            if ((_error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw _error;
            }
        }
    }
    throw new ConfigExportError(
        `找不到 SVN 命令行组件，已停止写表：${_filePath}\n` +
        (override
            ? `请检查 SVN_EXECUTABLE 指定的文件：${override}`
            : '请同步 sharedata/tools/runtime/svn 整个目录；或在 TortoiseSVN 安装器中添加 command line client tools。仅有右键菜单不包含 svn.exe。'),
    );
}

async function ReadInfo(
    _executable: string,
    _target: string,
    _filePath: string,
    _allowUnversioned: boolean,
): Promise<SvnInfo | null> {
    const result = await RunSvn(_executable, ['info', '--xml', '--', PegSafe(_target)]);
    if (result.code !== 0) {
        // 已确认存在 .svn，仅明确的“此节点未版本化”可以跳过；损坏/超时等错误必须终止。
        const codes = `${result.stderr}\n${result.stdout}`.match(/\b[EW]\d{6}\b/g) ?? [];
        if (_allowUnversioned && codes.some((_code) => _code === 'W155010' || _code === 'E155010')
            && codes.every((_code) => ['W155010', 'E155010', 'E200009'].includes(_code))) {
            return null;
        }
        throw SvnFailure('无法查询 SVN 状态', _filePath, result);
    }
    const xml = result.stdout;
    const entry = /<entry\b[^>]*>([\s\S]*?)<\/entry>/.exec(xml)?.[1];
    const url = entry === undefined ? undefined : XmlValue(entry, 'url');
    if (url === undefined || !xml.includes('</info>')) {
        throw new ConfigExportError(`SVN 返回的状态信息不完整，已停止写表：${_filePath}`);
    }
    const lock = /<lock>([\s\S]*?)<\/lock>/.exec(entry ?? '')?.[1];
    const token = lock === undefined ? undefined : XmlValue(lock, 'token');
    if (lock !== undefined && token === undefined) {
        throw new ConfigExportError(`SVN 返回的锁信息不完整，已停止写表：${_filePath}`);
    }
    return { url, token, owner: lock === undefined ? undefined : XmlValue(lock, 'owner') };
}

function XmlValue(_xml: string, _tag: string): string | undefined {
    const value = new RegExp(`<${_tag}>([^<]*)</${_tag}>`).exec(_xml)?.[1];
    if (value === undefined || value.length === 0) {
        return undefined;
    }
    // 仅读取 svn info --xml 的叶节点。单遍解码，避免把原文中的 &amp;lt; 再解码一次。
    return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_match, _entity: string) => {
        const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
        if (_entity.startsWith('#')) {
            return String.fromCodePoint(_entity[1].toLowerCase() === 'x'
                ? Number.parseInt(_entity.slice(2), 16) : Number.parseInt(_entity.slice(1), 10));
        }
        return named[_entity];
    });
}

function PegSafe(_target: string): string {
    // 空 peg revision 防止文件名里的 @ 被 SVN 当成版本号。
    return `${_target}@`;
}

function SvnFailure(_action: string, _filePath: string, _result: SvnOutput): ConfigExportError {
    const detail = (_result.stderr || _result.stdout).trim();
    const owner = /already locked by user ['"]([^'"]+)['"]/.exec(detail)?.[1];
    if (owner !== undefined || /\b[EW]160035\b/.test(detail)) {
        return new ConfigExportError(
            `表格已被${owner === undefined ? '其他工作副本' : ` ${owner}`}锁定，请等对方解锁后再收集：${_filePath}\n${detail}`,
        );
    }
    if (/\b[EW]160042\b/.test(detail)) {
        return new ConfigExportError(`表格在服务器上有更新的版本，请先更新后再收集：${_filePath}\n${detail}`);
    }
    if (/\b[EW](215004|170001)\b/.test(detail)) {
        return new ConfigExportError(
            `没有可用的 SVN 登录信息，请先用 TortoiseSVN 打开一次仓库并保存登录信息：${_filePath}\n${detail}`,
        );
    }
    return new ConfigExportError(`${_action}，已停止写表：${_filePath}${detail.length === 0 ? '' : `\n${detail}`}`);
}

function RunSvn(_executable: string, _args: readonly string[]): Promise<SvnOutput> {
    const appData = process.env.APPDATA ?? path.join(process.env.USERPROFILE ?? '', 'AppData', 'Roaming');
    return RunProcess(_executable, [
        '--config-dir', path.join(appData, 'Subversion'),
        '--non-interactive', '--trust-server-cert-failures=unknown-ca,cn-mismatch', ..._args,
    ]);
}

function RunProcess(_executable: string, _args: readonly string[]): Promise<SvnOutput> {
    return new Promise((_resolve, _reject) => {
        execFile(_executable, _args, {
            encoding: 'utf8',
            windowsHide: true,
            timeout: 60_000,
            maxBuffer: 1024 * 1024,
        }, (_error, _stdout, _stderr) => {
            if (_error === null) {
                _resolve({ code: 0, stdout: _stdout, stderr: _stderr });
                return;
            }
            const failed = _error as NodeJS.ErrnoException & { killed?: boolean };
            if (failed.code === 'ENOENT') {
                _reject(_error);
                return;
            }
            if (failed.killed || typeof failed.code !== 'number') {
                _reject(new ConfigExportError(`SVN 命令执行失败或超时，已停止写表：${failed.message}`));
                return;
            }
            _resolve({ code: failed.code, stdout: _stdout, stderr: _stderr });
        });
    });
}
