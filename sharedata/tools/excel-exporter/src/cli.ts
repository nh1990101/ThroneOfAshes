import path from 'node:path';
import process from 'node:process';
import { ConfigExportAggregateError, ConfigExportError } from './errors.js';
import { ExportExcelConfigs } from './exporter.js';
import type { ExportProgressEvent } from './model.js';

interface CliOptions {
    inputDirectory: string;
    outputZipPath: string;
    typesOutputDirectory: string;
    checkOnly: boolean;
}

async function Main(): Promise<void> {
    try {
        const options = ParseArguments(process.argv.slice(2));
        const result = await ExportExcelConfigs({ ...options, onProgress: PrintProgress });
        const action = options.checkOnly ? '校验完成' : '导出完成';
        console.log(`${action}：${result.workbookCount} 个工作簿，${result.tableCount} 张表，${result.rowCount} 行数据。`);
        if (!options.checkOnly) {
            console.log(path.relative(process.cwd(), result.outputFiles[0]));
            console.log(path.relative(process.cwd(), options.typesOutputDirectory) + '（' + result.tableCount + ' 个接口文件）');
        }
    } catch (_error: unknown) {
        const message = _error instanceof Error ? _error.message : String(_error);
        console.log('');
        console.log('='.repeat(72));
        console.log(_error instanceof ConfigExportError || _error instanceof ConfigExportAggregateError ? message : `未处理错误：${message}`);
        console.log('='.repeat(72));
        process.exitCode = 1;
    }
}

function PrintProgress(_event: ExportProgressEvent): void {
    const workbook = _event.workbookPath === undefined ? '' : path.relative(process.cwd(), _event.workbookPath);
    if (_event.stage === 'workbook') {
        if (_event.status === 'checking') {
            console.log(`\n[读取] ${workbook}`);
        } else if (_event.status === 'failed') {
            console.log(`[失败] ${workbook}`);
        }
        return;
    }

    if (_event.stage === 'worksheet') {
        const label = `${workbook} [${_event.sheetName ?? ''}]`;
        if (_event.status === 'checking') {
            console.log(`  [检查] ${label}`);
        } else if (_event.status === 'passed') {
            console.log(`  [通过] ${label} -> ${_event.logicalPath}（${_event.rowCount ?? 0} 行）`);
        } else if (_event.status === 'skipped') {
            console.log(`  [跳过] ${label}`);
        } else {
            console.log(`  [失败] ${label}\n         ${_event.message ?? ''}`);
        }
        return;
    }

    if (_event.status === 'checking') {
        console.log(`[校验] ${_event.logicalPath}`);
    } else if (_event.status === 'passed') {
        console.log(`[通过] ${_event.logicalPath}（共 ${_event.rowCount ?? 0} 行）`);
    } else if (_event.status === 'failed') {
        console.log(`[失败] ${_event.logicalPath}\n       ${_event.message ?? ''}`);
    }
}

function ParseArguments(_args: string[]): CliOptions {
    let inputDirectory = path.resolve('sharedata/excel');
    let outputZipPath = path.resolve('assets/resources/ConfigForClient.zip');
    let typesOutputDirectory = path.resolve('assets/script/Config/Typings');
    let checkOnly = false;

    for (let index = 0; index < _args.length; index += 1) {
        const argument = _args[index];
        if (argument === '--check') {
            checkOnly = true;
            continue;
        }
        if (argument === '--input' || argument === '--output-zip' || argument === '--types-output') {
            const value = _args[index + 1];
            if (value === undefined || value.startsWith('--')) {
                throw new ConfigExportError(`${argument} 缺少路径参数。`);
            }
            if (argument === '--input') {
                inputDirectory = path.resolve(value);
            } else if (argument === '--output-zip') {
                outputZipPath = path.resolve(value);
            } else {
                typesOutputDirectory = path.resolve(value);
            }
            index += 1;
            continue;
        }
        throw new ConfigExportError(`未知参数：${argument}`);
    }

    return { inputDirectory, outputZipPath, typesOutputDirectory, checkOnly };
}

void Main();
