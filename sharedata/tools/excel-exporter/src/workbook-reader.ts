import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { ConfigExportAggregateError, ConfigExportError } from './errors.js';
import type { ConfigField, ConfigRow, ConfigTable, ExportProgressEvent, SourceLocation } from './model.js';
import { SHEET_LAYOUT } from './model.js';
import { ParseFieldName, ParseFieldRules, ParseFieldType, ParseTableName } from './schema-parser.js';
import { IsBlankValue, ParseFieldValue } from './value-parser.js';

export async function FindWorkbookFiles(_inputDirectory: string): Promise<string[]> {
    const files: string[] = [];
    await WalkDirectory(path.resolve(_inputDirectory), files);
    files.sort((_left, _right) => _left.localeCompare(_right, 'en'));
    return files;
}

export async function ReadConfigWorkbooks(
    _inputDirectory: string,
    _onProgress?: (_event: ExportProgressEvent) => void,
): Promise<{
    workbookFiles: string[];
    tables: Map<string, ConfigTable>;
}> {
    const inputDirectory = path.resolve(_inputDirectory);
    const workbookFiles = await FindWorkbookFiles(inputDirectory);
    if (workbookFiles.length <= 0) {
        throw new ConfigExportError(`输入目录中没有找到 .xlsx 文件：${inputDirectory}`);
    }

    const tables = new Map<string, ConfigTable>();
    const errors: ConfigExportError[] = [];
    for (const workbookPath of workbookFiles) {
        await ReadWorkbook(inputDirectory, workbookPath, tables, errors, _onProgress);
    }
    ValidateTables(tables, errors, _onProgress);
    if (errors.length > 0) {
        throw new ConfigExportAggregateError(errors);
    }
    return { workbookFiles, tables };
}

async function WalkDirectory(_directory: string, _files: string[]): Promise<void> {
    let entries;
    try {
        entries = await fs.readdir(_directory, { withFileTypes: true });
    } catch (_error: unknown) {
        throw new ConfigExportError(`无法读取输入目录：${_directory}`);
    }

    for (const entry of entries) {
        const entryPath = path.join(_directory, entry.name);
        if (entry.isDirectory()) {
            await WalkDirectory(entryPath, _files);
            continue;
        }
        if (entry.isFile() && !entry.name.startsWith('~$') && entry.name.toLowerCase().endsWith('.xlsx')) {
            _files.push(entryPath);
        }
    }
}

async function ReadWorkbook(
    _inputDirectory: string,
    _workbookPath: string,
    _tables: Map<string, ConfigTable>,
    _errors: ConfigExportError[],
    _onProgress?: (_event: ExportProgressEvent) => void,
): Promise<void> {
    _onProgress?.({ stage: 'workbook', status: 'checking', workbookPath: _workbookPath });
    const workbook = new ExcelJS.Workbook();
    try {
        await LoadWorkbook(workbook, _workbookPath);
    } catch (_error: unknown) {
        const error = new ConfigExportError(
            `无法读取 Excel：${_workbookPath}；${_error instanceof Error ? _error.message : String(_error)}`,
        );
        _errors.push(error);
        _onProgress?.({ stage: 'workbook', status: 'failed', workbookPath: _workbookPath, message: error.message });
        return;
    }
    _onProgress?.({ stage: 'workbook', status: 'passed', workbookPath: _workbookPath });

    for (const worksheet of workbook.worksheets) {
        if (worksheet.name.startsWith('#')) {
            _onProgress?.({ stage: 'worksheet', status: 'skipped', workbookPath: _workbookPath, sheetName: worksheet.name });
            continue;
        }
        if (worksheet.getCell(SHEET_LAYOUT.fieldNameRow, SHEET_LAYOUT.tableNameColumn).text.trim().length <= 0) {
            _onProgress?.({ stage: 'worksheet', status: 'skipped', workbookPath: _workbookPath, sheetName: worksheet.name });
            continue;
        }
        _onProgress?.({ stage: 'worksheet', status: 'checking', workbookPath: _workbookPath, sheetName: worksheet.name });
        try {
            const result = ReadWorksheet(_inputDirectory, _workbookPath, worksheet, _tables);
            _onProgress?.({
                stage: 'worksheet',
                status: 'passed',
                workbookPath: _workbookPath,
                sheetName: worksheet.name,
                logicalPath: result.logicalPath,
                rowCount: result.rowCount,
            });
        } catch (_error: unknown) {
            const error = NormalizeConfigError(_error, _workbookPath, worksheet.name);
            _errors.push(error);
            _onProgress?.({
                stage: 'worksheet',
                status: 'failed',
                workbookPath: _workbookPath,
                sheetName: worksheet.name,
                message: error.message,
            });
        }
    }
}

async function LoadWorkbook(_workbook: ExcelJS.Workbook, _workbookPath: string): Promise<void> {
    try {
        await _workbook.xlsx.readFile(_workbookPath);
        return;
    } catch {
        // 部分由轻量表格库生成的文件会给 SpreadsheetML 标签加 x: 前缀；Excel 可打开，
        // 但 ExcelJS 无法直接解析。仅在内存中规范化 XML，不改动策划源文件。
    }

    const archive = await JSZip.loadAsync(await fs.readFile(_workbookPath));
    for (const [entryName, entry] of Object.entries(archive.files)) {
        if (entry.dir || !entryName.endsWith('.xml')) {
            continue;
        }
        const xml = await entry.async('string');
        archive.file(entryName, xml.replace(/(<\/?)(?:x):/g, '$1'));
    }
    const normalizedWorkbook = await archive.generateAsync({ type: 'nodebuffer' });
    const loadInput = normalizedWorkbook as unknown as Parameters<typeof _workbook.xlsx.load>[0];
    await _workbook.xlsx.load(loadInput);
}

function ReadWorksheet(
    _inputDirectory: string,
    _workbookPath: string,
    _worksheet: ExcelJS.Worksheet,
    _tables: Map<string, ConfigTable>,
): { logicalPath: string; rowCount: number } {
    const tableLocation = CreateLocation(_workbookPath, _worksheet.name, SHEET_LAYOUT.fieldNameRow, SHEET_LAYOUT.tableNameColumn);
    const tableName = ParseTableName(ReadCellValue(_worksheet.getCell(tableLocation.row, tableLocation.column), tableLocation), tableLocation);
    const logicalPath = BuildLogicalPath(_inputDirectory, _workbookPath, tableName);
    const fields = ReadFields(_workbookPath, _worksheet);
    const rows = ReadRows(_workbookPath, _worksheet, fields);
    const existingTable = _tables.get(logicalPath);

    if (existingTable === undefined) {
        _tables.set(logicalPath, {
            logicalPath,
            tableName,
            fields,
            rows,
            sources: [{ workbookPath: _workbookPath, sheetName: _worksheet.name }],
        });
        return { logicalPath, rowCount: rows.length };
    }

    MergeSchema(existingTable, fields, tableLocation);
    existingTable.rows.push(...rows);
    existingTable.sources.push({ workbookPath: _workbookPath, sheetName: _worksheet.name });
    return { logicalPath, rowCount: rows.length };
}

function ReadFields(_workbookPath: string, _worksheet: ExcelJS.Worksheet): ConfigField[] {
    const fields: ConfigField[] = [];
    const seenNames = new Set<string>();
    for (let column = SHEET_LAYOUT.fieldStartColumn; column <= _worksheet.columnCount + 1; column += 1) {
        const nameLocation = CreateLocation(_workbookPath, _worksheet.name, SHEET_LAYOUT.fieldNameRow, column);
        const rawName = ReadCellValue(_worksheet.getCell(nameLocation.row, nameLocation.column), nameLocation);
        if (IsBlankValue(rawName)) {
            break;
        }

        const name = ParseFieldName(rawName, nameLocation);
        if (seenNames.has(name)) {
            throw new ConfigExportError(`字段名重复：${name}`, nameLocation);
        }
        seenNames.add(name);

        const typeLocation = CreateLocation(_workbookPath, _worksheet.name, SHEET_LAYOUT.fieldTypeRow, column);
        const ruleLocation = CreateLocation(_workbookPath, _worksheet.name, SHEET_LAYOUT.fieldRuleRow, column);
        fields.push({
            name,
            description: String(_worksheet.getCell(SHEET_LAYOUT.descriptionRow, column).text ?? '').trim(),
            type: ParseFieldType(ReadCellValue(_worksheet.getCell(typeLocation.row, typeLocation.column), typeLocation), typeLocation),
            rules: ParseFieldRules(ReadCellValue(_worksheet.getCell(ruleLocation.row, ruleLocation.column), ruleLocation), ruleLocation),
            column,
        });
    }

    if (fields.length <= 0) {
        throw new ConfigExportError('配置表没有字段。', CreateLocation(_workbookPath, _worksheet.name, SHEET_LAYOUT.fieldNameRow, SHEET_LAYOUT.fieldStartColumn));
    }
    return fields;
}

function ReadRows(_workbookPath: string, _worksheet: ExcelJS.Worksheet, _fields: ConfigField[]): ConfigRow[] {
    const rows: ConfigRow[] = [];
    for (let row = SHEET_LAYOUT.dataStartRow; row <= _worksheet.rowCount; row += 1) {
        const rawValues = _fields.map((_field) => {
            const location = CreateLocation(_workbookPath, _worksheet.name, row, _field.column);
            return ReadCellValue(_worksheet.getCell(row, _field.column), location);
        });
        if (rawValues.every(IsBlankValue)) {
            continue;
        }

        const values: Record<string, unknown> = {};
        for (let index = 0; index < _fields.length; index += 1) {
            const field = _fields[index];
            const location = CreateLocation(_workbookPath, _worksheet.name, row, field.column);
            const value = ParseFieldValue(rawValues[index], field, location);
            if (value !== undefined && !field.rules.has('ignore')) {
                values[field.name] = value;
            }
        }
        rows.push({
            values,
            location: CreateLocation(_workbookPath, _worksheet.name, row, _fields[0].column),
        });
    }
    return rows;
}

function ReadCellValue(_cell: ExcelJS.Cell, _location: SourceLocation): unknown {
    const value = _cell.value;
    if (value !== null && typeof value === 'object') {
        if (value instanceof Date) {
            throw new ConfigExportError('配置单元格不支持日期值，请明确填写 string。', _location);
        }
        if ('formula' in value || 'sharedFormula' in value) {
            if ('result' in value && value.result !== undefined && value.result !== null) {
                return value.result;
            }
            throw new ConfigExportError('公式没有缓存计算结果，请用 Excel 打开并保存后重试。', _location);
        }
        if ('richText' in value) {
            return value.richText.map((_part) => _part.text).join('');
        }
        if ('text' in value) {
            return value.text;
        }
        if ('error' in value) {
            throw new ConfigExportError(`单元格包含 Excel 错误：${value.error}`, _location);
        }
    }
    return value;
}

function BuildLogicalPath(_inputDirectory: string, _workbookPath: string, _tableName: string): string {
    const relativeDirectory = path.dirname(path.relative(_inputDirectory, _workbookPath));
    const segments = relativeDirectory === '.' ? [] : relativeDirectory.split(path.sep);
    return [...segments, _tableName].join('/');
}

function MergeSchema(_table: ConfigTable, _fields: ConfigField[], _location: SourceLocation): void {
    const existingFields = new Map(_table.fields.map((_field) => [_field.name, _field]));
    for (const field of _fields) {
        const existingField = existingFields.get(field.name);
        if (existingField === undefined) {
            _table.fields.push(field);
            existingFields.set(field.name, field);
            continue;
        }
        if (existingField.type.sourceText !== field.type.sourceText) {
            throw new ConfigExportError(
                `逻辑表 ${_table.logicalPath} 的字段 ${field.name} 类型冲突：${existingField.type.sourceText} / ${field.type.sourceText}。`,
                { ..._location, column: field.column },
            );
        }
        existingField.rules = new Set([...existingField.rules, ...field.rules]);
    }
}

function ValidateTables(
    _tables: Map<string, ConfigTable>,
    _errors: ConfigExportError[],
    _onProgress?: (_event: ExportProgressEvent) => void,
): void {
    const tablesByName = new Map<string, ConfigTable>();
    for (const table of _tables.values()) {
        const existingTable = tablesByName.get(table.tableName);
        if (existingTable !== undefined && existingTable !== table) {
            _errors.push(new ConfigExportError(`逻辑表名重复：${table.tableName}（${existingTable.logicalPath} / ${table.logicalPath}）`));
            continue;
        }
        tablesByName.set(table.tableName, table);
    }

    for (const table of _tables.values()) {
        _onProgress?.({ stage: 'table', status: 'checking', logicalPath: table.logicalPath });
        try {
            ValidateTable(table, tablesByName);
            _onProgress?.({ stage: 'table', status: 'passed', logicalPath: table.logicalPath, rowCount: table.rows.length });
        } catch (_error: unknown) {
            const error = NormalizeConfigError(_error);
            _errors.push(error);
            _onProgress?.({ stage: 'table', status: 'failed', logicalPath: table.logicalPath, message: error.message });
        }
    }
}

function ValidateTable(_table: ConfigTable, _tablesByName: ReadonlyMap<string, ConfigTable>): void {
    const keyFields = _table.fields.filter((_field) => _field.rules.has('key'));
    if (keyFields.length !== 1) {
        throw new ConfigExportError(`逻辑表 ${_table.logicalPath} 必须且只能声明一个 $key，当前数量：${keyFields.length}`);
    }
    if (keyFields[0].rules.has('ignore')) {
        throw new ConfigExportError(`逻辑表 ${_table.logicalPath} 的主键不能声明 $ignore。`);
    }

    for (const field of _table.fields) {
        if (field.rules.has('key') || field.rules.has('required')) {
            for (const row of _table.rows) {
                if (row.values[field.name] === undefined || row.values[field.name] === null) {
                    throw new ConfigExportError(
                        `字段 ${field.name} 不能为空。`,
                        { ...row.location, column: field.column },
                    );
                }
            }
        }
        if (field.rules.has('key') || field.rules.has('unique')) {
            ValidateUniqueField(_table, field);
        }
        for (const rule of field.rules) {
            const match = /^(ref|ref_group|ref_count|ref_args|ref_args_str|size)\(([^()]*)\)$/.exec(rule);
            if (match === null) {
                continue;
            }
            if (match[1] === 'size') {
                ValidateSameSize(_table, field, match[2].trim());
            } else {
                ValidateReference(_table, field, match[1], match[2].trim(), _tablesByName);
            }
        }
    }
}

function ValidateUniqueField(_table: ConfigTable, _field: ConfigField): void {
    const seenValues = new Map<string, ConfigRow>();
    for (const row of _table.rows) {
        const value = row.values[_field.name];
        if (value === undefined) {
            continue;
        }
        const identity = ValueIdentity(value);
        const previousRow = seenValues.get(identity);
        if (previousRow !== undefined) {
            throw new ConfigExportError(
                `逻辑表 ${_table.logicalPath} 的字段 ${_field.name} 出现重复值 ${JSON.stringify(value)}；首次位于 ${previousRow.location.workbookPath} [${previousRow.location.sheetName}] R${previousRow.location.row}。`,
                { ...row.location, column: _field.column },
            );
        }
        seenValues.set(identity, row);
    }
}

function ValidateSameSize(_table: ConfigTable, _field: ConfigField, _targetFieldName: string): void {
    if (!_table.fields.some((_field) => _field.name === _targetFieldName)) {
        throw new ConfigExportError(`逻辑表 ${_table.logicalPath} 的 $size 引用了不存在的字段：${_targetFieldName}`);
    }
    for (const row of _table.rows) {
        const value = row.values[_field.name];
        const targetValue = row.values[_targetFieldName];
        if (value === undefined && targetValue === undefined) {
            continue;
        }
        if (!Array.isArray(value) || !Array.isArray(targetValue) || value.length !== targetValue.length) {
            throw new ConfigExportError(
                `字段 ${_field.name} 与 ${_targetFieldName} 的列表长度不一致。`,
                { ...row.location, column: _field.column },
            );
        }
    }
}

function ValidateReference(
    _table: ConfigTable,
    _field: ConfigField,
    _ruleName: string,
    _targetTableName: string,
    _tablesByName: ReadonlyMap<string, ConfigTable>,
): void {
    const targetTable = _tablesByName.get(_targetTableName);
    if (targetTable === undefined) {
        throw new ConfigExportError(`逻辑表 ${_table.logicalPath} 的字段 ${_field.name} 引用了不存在的表：${_targetTableName}`);
    }
    const referenceMap = BuildReferenceMap(targetTable, _ruleName === 'ref_group');
    for (const row of _table.rows) {
        const value = row.values[_field.name];
        if (value === undefined) {
            continue;
        }
        const location = { ...row.location, column: _field.column };
        if (_ruleName === 'ref_count') {
            row.values[_field.name] = ConvertReferenceCount(value, referenceMap, _table, _field, _targetTableName, location);
        } else if (_ruleName === 'ref_args' || _ruleName === 'ref_args_str') {
            row.values[_field.name] = ConvertReferenceArgs(
                value,
                referenceMap,
                _ruleName === 'ref_args_str',
                _table,
                _field,
                _targetTableName,
                location,
            );
        } else {
            row.values[_field.name] = ConvertReferenceValue(value, referenceMap, _table, _field, _targetTableName, location);
        }
    }
}

function BuildReferenceMap(_targetTable: ConfigTable, _useGroup: boolean): Map<string, unknown> {
    const result = new Map<string, unknown>();
    const keyField = _targetTable.fields.find((_field) => _field.rules.has('key'));
    if (keyField === undefined) {
        throw new ConfigExportError(`被引用表 ${_targetTable.logicalPath} 没有 $key。`);
    }
    for (const row of _targetTable.rows) {
        const key = row.values[keyField.name];
        if (key === undefined) {
            continue;
        }
        result.set(ValueIdentity(key), key);
        const lookupFieldName = _useGroup ? 'group_key' : 'ch_key';
        const lookupValue = row.values[lookupFieldName];
        const outputValue = _useGroup ? row.values.group_id : key;
        if (lookupValue !== undefined && outputValue !== undefined) {
            result.set(ValueIdentity(lookupValue), outputValue);
        }
    }
    return result;
}

function ConvertReferenceValue(
    _value: unknown,
    _referenceMap: ReadonlyMap<string, unknown>,
    _table: ConfigTable,
    _field: ConfigField,
    _targetTableName: string,
    _location: SourceLocation,
): unknown {
    if (Array.isArray(_value)) {
        return _value.map((_item) => ResolveReference(_item, _referenceMap, _table, _field, _targetTableName, _location));
    }
    return ResolveReference(_value, _referenceMap, _table, _field, _targetTableName, _location);
}

function ConvertReferenceCount(
    _value: unknown,
    _referenceMap: ReadonlyMap<string, unknown>,
    _table: ConfigTable,
    _field: ConfigField,
    _targetTableName: string,
    _location: SourceLocation,
): unknown[] {
    if (!Array.isArray(_value) || _value.length % 2 !== 0) {
        throw new ConfigExportError(`字段 ${_field.name} 的 $ref_count 必须按“引用//数量”成对填写。`, _location);
    }
    const converted: unknown[] = [];
    for (let index = 0; index < _value.length; index += 2) {
        converted.push(ResolveReference(_value[index], _referenceMap, _table, _field, _targetTableName, _location));
        const count = Number(_value[index + 1]);
        if (!Number.isFinite(count)) {
            throw new ConfigExportError(`字段 ${_field.name} 的数量不是数字：${String(_value[index + 1])}`, _location);
        }
        converted.push(Number.isInteger(count) ? Math.trunc(count) : count);
    }
    return converted;
}

function ConvertReferenceArgs(
    _value: unknown,
    _referenceMap: ReadonlyMap<string, unknown>,
    _allowStringArguments: boolean,
    _table: ConfigTable,
    _field: ConfigField,
    _targetTableName: string,
    _location: SourceLocation,
): unknown {
    const convertOne = (_rawValue: unknown): { ref: unknown; args: unknown[] } => {
        const text = String(_rawValue).trim().replaceAll('，', ',');
        const match = /^([^()]+)(?:\((.*)\))?$/.exec(text);
        if (match === null) {
            throw new ConfigExportError(`字段 ${_field.name} 的 $ref_args 格式错误：${text}`, _location);
        }
        const args = match[2] === undefined || match[2].trim().length <= 0
            ? []
            : match[2].split(',').map((_argument) => ParseReferenceArgument(_argument, _allowStringArguments, _field, _location));
        return {
            ref: ResolveReference(match[1].trim(), _referenceMap, _table, _field, _targetTableName, _location),
            args,
        };
    };
    return Array.isArray(_value) ? _value.map(convertOne) : convertOne(_value);
}

function ParseReferenceArgument(
    _argument: string,
    _allowStringArguments: boolean,
    _field: ConfigField,
    _location: SourceLocation,
): unknown {
    const text = _argument.trim();
    if (text.startsWith('"') && text.endsWith('"')) {
        return text.slice(1, -1);
    }
    const numericValue = Number(text);
    if (Number.isFinite(numericValue)) {
        return Number.isInteger(numericValue) ? Math.trunc(numericValue) : numericValue;
    }
    if (_allowStringArguments) {
        return text;
    }
    throw new ConfigExportError(`字段 ${_field.name} 的 $ref_args 参数必须是数字：${text}`, _location);
}

function ResolveReference(
    _value: unknown,
    _referenceMap: ReadonlyMap<string, unknown>,
    _table: ConfigTable,
    _field: ConfigField,
    _targetTableName: string,
    _location: SourceLocation,
): unknown {
    const resolvedValue = _referenceMap.get(ValueIdentity(_value));
    if (resolvedValue === undefined) {
        throw new ConfigExportError(
            `逻辑表 ${_table.logicalPath} 的字段 ${_field.name} 引用了 ${_targetTableName} 中不存在的值：${JSON.stringify(_value)}`,
            _location,
        );
    }
    return resolvedValue;
}

function ValueIdentity(_value: unknown): string {
    return `${typeof _value}:${JSON.stringify(_value)}`;
}

function NormalizeConfigError(_error: unknown, _workbookPath?: string, _sheetName?: string): ConfigExportError {
    if (_error instanceof ConfigExportError) {
        return _error;
    }
    const context = _workbookPath === undefined ? '' : `${_workbookPath}${_sheetName === undefined ? '' : ` [${_sheetName}]`} `;
    return new ConfigExportError(`${context}未处理错误：${_error instanceof Error ? _error.message : String(_error)}`);
}

function CreateLocation(_workbookPath: string, _sheetName: string, _row: number, _column: number): SourceLocation {
    return { workbookPath: _workbookPath, sheetName: _sheetName, row: _row, column: _column };
}
