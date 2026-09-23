import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { ConfigExportError } from './errors.js';
import type { ConfigTable, ExportOptions, ExportResult } from './model.js';
import { GenerateConfigTypes, GenerateTypeMeta } from './type-generator.js';
import { ReadConfigWorkbooks } from './workbook-reader.js';

const ZIP_ENTRY_DATE = new Date('1980-01-01T00:00:00.000Z');

export async function ExportExcelConfigs(_options: ExportOptions): Promise<ExportResult> {
    const inputDirectory = path.resolve(_options.inputDirectory);
    const outputZipPath = path.resolve(_options.outputZipPath);
    const typesOutputDirectory = path.resolve(_options.typesOutputDirectory);
    if (outputZipPath.toLowerCase().startsWith(typesOutputDirectory.toLowerCase() + path.sep)) {
        throw new ConfigExportError('ZIP 不能输出到类型文件目录内。');
    }

    const { workbookFiles, tables } = await ReadConfigWorkbooks(inputDirectory, _options.onProgress);
    const typeFiles = GenerateConfigTypes(tables);
    const zipContent = await BuildConfigZip(tables);
    if (!_options.checkOnly) {
        const outputs: PendingOutput[] = [{ filePath: outputZipPath, content: zipContent }];
        for (const [fileName, content] of typeFiles) {
            const filePath = path.join(typesOutputDirectory, fileName);
            await AssertOwnedTypeFile(filePath);
            outputs.push({ filePath, content: Buffer.from(content, 'utf8') });
            const metaPath = filePath + '.meta';
            if (!(await FileExists(metaPath))) {
                outputs.push({
                    filePath: metaPath,
                    content: Buffer.from(GenerateTypeMeta(fileName.slice(0, -3)), 'utf8'),
                });
            }
        }
        await WriteOutputs(outputs);
        await RemoveStaleTypes(typesOutputDirectory, new Set(typeFiles.keys()));
    }

    return {
        workbookCount: workbookFiles.length,
        tableCount: tables.size,
        rowCount: [...tables.values()].reduce((_sum, _table) => _sum + _table.rows.length, 0),
        outputFiles: [outputZipPath, ...[...typeFiles.keys()].map((_name) => path.join(typesOutputDirectory, _name))],
    };
}

async function FileExists(_path: string): Promise<boolean> {
    try {
        await fs.access(_path);
        return true;
    } catch (_error: unknown) {
        if ((_error as NodeJS.ErrnoException).code === 'ENOENT') {
            return false;
        }
        throw _error;
    }
}

async function AssertOwnedTypeFile(_filePath: string): Promise<void> {
    if (!(await FileExists(_filePath))) {
        return;
    }
    const firstLine = (await fs.readFile(_filePath, 'utf8')).split(/\r?\n/, 1)[0];
    if (!firstLine.includes('by sharedata/tools/excel-exporter.')) {
        throw new ConfigExportError('类型文件已存在且不属于导表工具：' + _filePath);
    }
}

async function RemoveStaleTypes(_directory: string, _currentFiles: ReadonlySet<string>): Promise<void> {
    for (const entry of await fs.readdir(_directory, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.ts') || _currentFiles.has(entry.name)) {
            continue;
        }
        const filePath = path.join(_directory, entry.name);
        const firstLine = (await fs.readFile(filePath, 'utf8')).split(/\r?\n/, 1)[0];
        if (!firstLine.includes('by sharedata/tools/excel-exporter.')) {
            continue;
        }
        await fs.rm(filePath);
        await fs.rm(filePath + '.meta', { force: true });
    }
}

async function BuildConfigZip(_tables: ReadonlyMap<string, ConfigTable>): Promise<Buffer> {
    const archive = new JSZip();
    const tableNames = new Set<string>();
    const tables = [..._tables.values()].sort((_left, _right) => _left.tableName.localeCompare(_right.tableName, 'en'));
    for (const table of tables) {
        const entryName = table.tableName + '.json';
        const comparisonName = entryName.toLowerCase();
        if (entryName.includes('/') || entryName.includes('\\') || tableNames.has(comparisonName)) {
            throw new ConfigExportError('ZIP 内表名冲突或包含目录分隔符：' + table.tableName);
        }
        tableNames.add(comparisonName);
        archive.file(entryName, JSON.stringify(table.rows.map((_row) => _row.values), null, 4) + '\n', {
            date: ZIP_ENTRY_DATE,
            createFolders: false,
        });
    }
    return archive.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
        platform: 'DOS',
    });
}

interface PendingOutput {
    filePath: string;
    content: Buffer;
}

async function WriteOutputs(_outputs: PendingOutput[]): Promise<void> {
    const pending: Array<PendingOutput & { previous: Buffer | null; temporaryPath: string }> = [];
    const replaced: typeof pending = [];
    try {
        for (const output of _outputs) {
            await fs.mkdir(path.dirname(output.filePath), { recursive: true });
            const previous = await fs.readFile(output.filePath).catch((_error: NodeJS.ErrnoException) => {
                if (_error.code === 'ENOENT') {
                    return null;
                }
                throw _error;
            });
            if (previous !== null && previous.equals(output.content)) {
                continue;
            }
            const temporaryPath = output.filePath + '.tmp-' + randomUUID();
            await fs.writeFile(temporaryPath, output.content);
            pending.push({ ...output, previous, temporaryPath });
        }
        for (const output of pending) {
            await fs.rename(output.temporaryPath, output.filePath);
            replaced.push(output);
        }
    } catch (_error: unknown) {
        for (const output of replaced.reverse()) {
            if (output.previous === null) {
                await fs.rm(output.filePath, { force: true });
            } else {
                await fs.writeFile(output.filePath, output.previous);
            }
        }
        throw new ConfigExportError('写入配置产物失败：' + (_error instanceof Error ? _error.message : String(_error)));
    } finally {
        for (const output of pending) {
            await fs.rm(output.temporaryPath, { force: true });
        }
    }
}
