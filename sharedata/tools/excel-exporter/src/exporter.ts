import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { ConfigExportError } from './errors.js';
import type { ConfigTable, ExportOptions, ExportResult } from './model.js';
import { GenerateConfigTypes, GenerateTypeMeta } from './type-generator.js';
import { ReadConfigWorkbooks } from './workbook-reader.js';
import { IsLangPackTable, ResolveLangFieldIds } from './lang-ids.js';

const ZIP_ENTRY_DATE = new Date('1980-01-01T00:00:00.000Z');

export async function ExportExcelConfigs(_options: ExportOptions): Promise<ExportResult> {
    const inputDirectory = path.resolve(_options.inputDirectory);
    const outputZipPath = path.resolve(_options.outputZipPath);
    const typesOutputDirectory = path.resolve(_options.typesOutputDirectory);
    const jsonOutputDirectory = path.resolve(_options.jsonOutputDirectory);
    if (outputZipPath.toLowerCase().startsWith(typesOutputDirectory.toLowerCase() + path.sep)) {
        throw new ConfigExportError('ZIP 不能输出到类型文件目录内。');
    }

    const { workbookFiles, tables } = await ReadConfigWorkbooks(inputDirectory, _options.onProgress);
    ResolveLangFieldIds(tables);
    const typeFiles = GenerateConfigTypes(tables);
    const jsonFiles = BuildConfigJsonFiles(tables);
    const zipContent = await BuildConfigZip(jsonFiles);
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
        for (const [fileName, content] of jsonFiles) {
            outputs.push({
                filePath: path.join(jsonOutputDirectory, fileName),
                content: Buffer.from(content, 'utf8'),
            });
        }
        await WriteOutputs(outputs);
        await RemoveStaleTypes(typesOutputDirectory, new Set(typeFiles.keys()));
        await RemoveStaleJson(jsonOutputDirectory, new Set(jsonFiles.keys()));
    }

    return {
        workbookCount: workbookFiles.length,
        tableCount: tables.size,
        rowCount: [...tables.values()].reduce((_sum, _table) => _sum + _table.rows.length, 0),
        outputFiles: [
            outputZipPath,
            ...[...typeFiles.keys()].map((_name) => path.join(typesOutputDirectory, _name)),
            ...[...jsonFiles.keys()].map((_name) => path.join(jsonOutputDirectory, _name)),
        ],
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

function AddJsonFile(_files: Map<string, string>, _tableNames: Set<string>, _entryName: string, _content: string): void {
    const comparisonName = _entryName.toLowerCase();
    if (_entryName.includes('/') || _entryName.includes('\\') || _tableNames.has(comparisonName)) {
        throw new ConfigExportError('ZIP 内表名冲突或包含目录分隔符：' + _entryName);
    }
    _tableNames.add(comparisonName);
    _files.set(_entryName, _content);
}

function BuildConfigJsonFiles(_tables: ReadonlyMap<string, ConfigTable>): Map<string, string> {
    const files = new Map<string, string>();
    const tableNames = new Set<string>();
    const tables = [..._tables.values()].sort((_left, _right) => _left.tableName.localeCompare(_right.tableName, 'en'));
    for (const table of tables) {
        if (IsLangPackTable(table.tableName)) {
            AppendLangPacks(files, tableNames, table);
            continue;
        }
        AddJsonFile(files, tableNames, table.tableName + '.json', JSON.stringify(table.rows.map((_row) => _row.values), null, 4) + '\n');
        if (table.indexData !== null) {
            AddJsonFile(files, tableNames, table.tableName + 'Index.json', JSON.stringify(table.indexData, null, 4) + '\n');
        }
    }
    return files;
}

function AppendLangPacks(
    _files: Map<string, string>,
    _tableNames: Set<string>,
    _table: ConfigTable,
): void {
    const languages = _table.fields.filter((_field) =>
        _field.name !== 'id'
        && _field.name !== 'raw'
        && _field.type.scalarType === 'string'
        && !_field.type.isArray
        && !_field.rules.has('ignore'));
    for (const field of languages) {
        const rows: Array<Record<string, unknown>> = [];
        for (const row of _table.rows) {
            const id = row.values.id;
            if (typeof id !== 'number') {
                continue;
            }
            const value = row.values[field.name];
            const text = typeof value === 'string' && value.length > 0 ? value : undefined;
            if (field.name !== 'chs' && text === undefined) {
                continue;
            }
            const packed: Record<string, unknown> = { id };
            if (field.name === 'chs') {
                const raw = row.values.raw;
                if (typeof raw === 'string' && raw.length > 0) {
                    packed.raw = raw;
                }
            }
            if (text !== undefined) {
                packed.text = text;
            }
            rows.push(packed);
        }
        AddJsonFile(_files, _tableNames, _table.tableName + '_' + field.name + '.json', JSON.stringify(rows, null, 4) + '\n');
    }
}

async function BuildConfigZip(_jsonFiles: ReadonlyMap<string, string>): Promise<Buffer> {
    const archive = new JSZip();
    for (const [entryName, content] of _jsonFiles) {
        archive.file(entryName, content, {
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

async function RemoveStaleJson(_directory: string, _currentFiles: ReadonlySet<string>): Promise<void> {
    let entries;
    try {
        entries = await fs.readdir(_directory, { withFileTypes: true });
    } catch (_error: unknown) {
        if ((_error as NodeJS.ErrnoException).code === 'ENOENT') {
            return;
        }
        throw _error;
    }
    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.json') || _currentFiles.has(entry.name)) {
            continue;
        }
        await fs.rm(path.join(_directory, entry.name));
    }
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
