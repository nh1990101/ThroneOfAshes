import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { ConfigExportAggregateError, ConfigExportError } from './errors.js';
import { SHEET_LAYOUT } from './model.js';
import { EnsureSvnLock } from './svn-lock.js';
import type { ConfigField, ConfigRow, ConfigTable } from './model.js';

const GAME_LANG_TABLE = 'GameLangData';
const COMMON_LANG_TABLE = 'CommonLangData';

export function IsLangPackTable(_tableName: string): boolean {
    return _tableName === GAME_LANG_TABLE || _tableName === COMMON_LANG_TABLE;
}
const LANG_PREFIX = '$Lang$';
const LANG_TOKEN = /\$Lang\$[^<]+/g;
const GAME_LANG_ID_START = 100001;

export interface AddedLangRow {
    id: number;
    raw: string;
}

/** 把各表 lang 字段里的原文换成 GameLangData 的 id。 */
export function ResolveLangFieldIds(_tables: ReadonlyMap<string, ConfigTable>): void {
    const gameLang = FindTable(_tables, GAME_LANG_TABLE);
    const commonLang = FindTable(_tables, COMMON_LANG_TABLE);
    if (gameLang !== undefined && commonLang !== undefined) {
        AssertLangIdsDisjoint(gameLang, commonLang);
    }
    const langTables = LangTables(_tables);
    if (langTables.length === 0) {
        return;
    }
    if (gameLang === undefined) {
        throw new ConfigExportError('存在多语言字段，但没有 GameLangData 表。');
    }

    const rawToId = ReadGameLangIds(gameLang);
    const errors: ConfigExportError[] = [];
    for (const table of langTables) {
        const langFields = LangFields(table);
        for (const row of table.rows) {
            for (const field of langFields) {
                const value = row.values[field.name];
                if (value === undefined || value === null) {
                    continue;
                }
                try {
                    row.values[field.name] = ResolveLangValue(value, field, row, rawToId);
                } catch (_error: unknown) {
                    if (_error instanceof ConfigExportError) {
                        errors.push(_error);
                        continue;
                    }
                    throw _error;
                }
            }
        }
    }
    if (errors.length > 0) {
        throw new ConfigExportAggregateError(errors);
    }
}

/** 按预制体和 lang 字段重写 GameLangData。已有原文保留 id 和语言列，新原文往后编号。 */
export async function RewriteGameLangEntries(
    _tables: ReadonlyMap<string, ConfigTable>,
    _assetsDirectory: string,
    _writeWorkbook: boolean,
): Promise<AddedLangRow[]> {
    const gameLang = FindTable(_tables, GAME_LANG_TABLE);
    const texts = CollectLangTexts(_tables, await CollectPrefabTexts(_assetsDirectory));
    if (gameLang === undefined) {
        if (texts.length === 0) {
            return [];
        }
        throw new ConfigExportError('存在多语言字段，但没有 GameLangData 表。');
    }
    const idField = gameLang.fields.find((_field) => _field.name === 'id');
    const rawField = gameLang.fields.find((_field) => _field.name === 'raw');
    if (idField === undefined || rawField === undefined) {
        throw new ConfigExportError('GameLangData 必须包含 id 和 raw 字段。');
    }
    if (gameLang.sources.length !== 1) {
        throw new ConfigExportError('GameLangData 只能来自一张工作表。');
    }

    const previous = ReadPreviousLangValues(gameLang);
    const commonIds = ReadIdSet(FindTable(_tables, COMMON_LANG_TABLE));
    const written = AssignStableLangIds(texts, previous, gameLang.rows, commonIds);
    if (_writeWorkbook) {
        const source = gameLang.sources[0];
        await WriteGameLangRows(source.workbookPath, source.sheetName, gameLang, written, previous);
    }
    return written;
}

function AssignStableLangIds(
    _texts: readonly string[],
    _previous: ReadonlyMap<string, Record<string, unknown>>,
    _previousRows: readonly ConfigRow[],
    _commonIds: ReadonlySet<number>,
): AddedLangRow[] {
    const occupied = new Set<number>(_commonIds);
    let highestId = GAME_LANG_ID_START - 1;
    for (const row of _previousRows) {
        const id = row.values.id;
        if (typeof id === 'number' && Number.isSafeInteger(id) && id > highestId) {
            highestId = id;
        }
    }

    const written: AddedLangRow[] = [];
    const pending: number[] = [];
    for (const raw of _texts) {
        const oldId = _previous.get(NormalizeLangText(raw))?.id;
        if (typeof oldId === 'number' && Number.isSafeInteger(oldId) && !occupied.has(oldId)) {
            occupied.add(oldId);
            written.push({ id: oldId, raw });
            continue;
        }
        pending.push(written.length);
        written.push({ id: 0, raw });
    }

    let nextId = Math.max(GAME_LANG_ID_START, highestId + 1);
    for (const index of pending) {
        while (occupied.has(nextId)) {
            nextId += 1;
        }
        occupied.add(nextId);
        written[index] = { id: nextId, raw: written[index].raw };
        nextId += 1;
    }
    return written;
}

function FindTable(_tables: ReadonlyMap<string, ConfigTable>, _tableName: string): ConfigTable | undefined {
    return _tables.get(_tableName) ?? [..._tables.values()].find((_table) => _table.tableName === _tableName);
}

function LangTables(_tables: ReadonlyMap<string, ConfigTable>): ConfigTable[] {
    return [..._tables.values()]
        .filter((_table) => _table.tableName !== GAME_LANG_TABLE && _table.tableName !== COMMON_LANG_TABLE && HasLangField(_table))
        .sort((_left, _right) => _left.tableName.localeCompare(_right.tableName, 'en'));
}

function HasLangField(_table: ConfigTable): boolean {
    return LangFields(_table).length > 0;
}

function LangFields(_table: ConfigTable): ConfigField[] {
    return _table.fields.filter((_field) => _field.type.scalarType === 'lang' && !_field.rules.has('ignore'));
}

function CollectLangTexts(_tables: ReadonlyMap<string, ConfigTable>, _prefabTexts: readonly string[]): string[] {
    const texts: string[] = [];
    const seen = new Set<string>();
    const add = (_raw: string) => {
        const text = NormalizeLangText(_raw);
        if (text.length === 0 || seen.has(text)) {
            return;
        }
        seen.add(text);
        texts.push(LANG_PREFIX + text);
    };
    for (const table of LangTables(_tables)) {
        for (const row of table.rows) {
            for (const field of LangFields(table)) {
                const value = row.values[field.name];
                if (typeof value === 'string') {
                    add(value);
                } else if (Array.isArray(value)) {
                    for (const item of value) {
                        if (typeof item === 'string') {
                            add(item);
                        }
                    }
                }
            }
        }
    }
    for (const raw of _prefabTexts) {
        add(raw);
    }
    texts.sort((_left, _right) => _left.localeCompare(_right, 'zh-CN'));
    return texts;
}

async function CollectPrefabTexts(_assetsDirectory: string): Promise<string[]> {
    const texts: string[] = [];
    const seen = new Set<string>();
    try {
        await fs.access(_assetsDirectory);
    } catch (_error: unknown) {
        if ((_error as NodeJS.ErrnoException).code === 'ENOENT') {
            return texts;
        }
        throw _error;
    }
    await WalkPrefabs(_assetsDirectory, texts, seen);
    return texts;
}

async function WalkPrefabs(_directory: string, _texts: string[], _seen: Set<string>): Promise<void> {
    const entries = await fs.readdir(_directory, { withFileTypes: true });
    for (const entry of entries) {
        const entryPath = path.join(_directory, entry.name);
        if (entry.isDirectory()) {
            await WalkPrefabs(entryPath, _texts, _seen);
            continue;
        }
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.prefab')) {
            continue;
        }
        let parsed: unknown;
        try {
            parsed = JSON.parse(await fs.readFile(entryPath, 'utf8'));
        } catch {
            continue;
        }
        VisitStrings(parsed, (_text) => {
            for (const match of _text.matchAll(LANG_TOKEN)) {
                const raw = NormalizeLangText(match[0]);
                if (raw.length === 0 || _seen.has(raw)) {
                    continue;
                }
                _seen.add(raw);
                _texts.push(raw);
            }
        });
    }
}

function VisitStrings(_value: unknown, _visit: (_text: string) => void): void {
    if (typeof _value === 'string') {
        _visit(_value);
        return;
    }
    if (Array.isArray(_value)) {
        for (const item of _value) {
            VisitStrings(item, _visit);
        }
        return;
    }
    if (_value !== null && typeof _value === 'object') {
        for (const item of Object.values(_value)) {
            VisitStrings(item, _visit);
        }
    }
}

function NormalizeLangText(_raw: string): string {
    const trimmed = _raw.trim();
    if (!trimmed.startsWith(LANG_PREFIX)) {
        return trimmed;
    }
    return trimmed.slice(LANG_PREFIX.length).trim();
}

function ReadPreviousLangValues(_table: ConfigTable): Map<string, Record<string, unknown>> {
    const previous = new Map<string, Record<string, unknown>>();
    for (const row of _table.rows) {
        const raw = row.values.raw;
        if (typeof raw !== 'string') {
            continue;
        }
        const key = NormalizeLangText(raw);
        if (key.length === 0) {
            continue;
        }
        const existing = previous.get(key);
        if (existing === undefined) {
            previous.set(key, { ...row.values });
            continue;
        }
        for (const [name, value] of Object.entries(row.values)) {
            if (name === 'id' || name === 'raw') {
                continue;
            }
            if (!HasText(existing[name]) && HasText(value)) {
                existing[name] = value;
            }
        }
    }
    return previous;
}

function HasText(_value: unknown): _value is string {
    return typeof _value === 'string' && _value.length > 0;
}

function ReadIdSet(_table: ConfigTable | undefined): Set<number> {
    const ids = new Set<number>();
    if (_table === undefined) {
        return ids;
    }
    for (const row of _table.rows) {
        const id = row.values.id;
        if (typeof id === 'number') {
            ids.add(id);
        }
    }
    return ids;
}

async function WriteGameLangRows(
    _workbookPath: string,
    _sheetName: string,
    _table: ConfigTable,
    _written: readonly AddedLangRow[],
    _previous: ReadonlyMap<string, Record<string, unknown>>,
): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(_workbookPath);
    const worksheet = workbook.getWorksheet(_sheetName);
    if (worksheet === undefined) {
        throw new ConfigExportError(`翻译表工作表不存在：${_sheetName}`);
    }
    const lastRow = Math.max(LastUsedRow(worksheet, _table.fields), SHEET_LAYOUT.dataStartRow + _written.length - 1);
    for (let row = SHEET_LAYOUT.dataStartRow; row <= lastRow; row += 1) {
        for (const field of _table.fields) {
            worksheet.getCell(row, field.column).value = null;
        }
    }
    for (let index = 0; index < _written.length; index += 1) {
        const item = _written[index];
        const rowNumber = SHEET_LAYOUT.dataStartRow + index;
        const oldValues = _previous.get(NormalizeLangText(item.raw));
        for (const field of _table.fields) {
            const value = CellValue(field.name, item, oldValues);
            if (value === undefined) {
                continue;
            }
            worksheet.getCell(rowNumber, field.column).value = value;
        }
    }
    await EnsureSvnLock(_workbookPath);
    try {
        await workbook.xlsx.writeFile(_workbookPath);
    } catch (_error: unknown) {
        const code = (_error as NodeJS.ErrnoException).code;
        if (code === 'EBUSY' || code === 'EPERM' || code === 'EACCES') {
            throw new ConfigExportError(`翻译表 Excel 正在被打开，请先关掉后再收集：${_workbookPath}`);
        }
        throw _error;
    }
}

function CellValue(
    _fieldName: string,
    _item: AddedLangRow,
    _oldValues: Record<string, unknown> | undefined,
): string | number | undefined {
    if (_fieldName === 'id') {
        return _item.id;
    }
    if (_fieldName === 'raw') {
        return _item.raw;
    }
    const oldValue = _oldValues?.[_fieldName];
    if (HasText(oldValue)) {
        return oldValue;
    }
    if (_fieldName === 'chs') {
        return NormalizeLangText(_item.raw);
    }
    return undefined;
}

function LastUsedRow(_worksheet: ExcelJS.Worksheet, _fields: readonly ConfigField[]): number {
    let last = SHEET_LAYOUT.dataStartRow - 1;
    for (let row = SHEET_LAYOUT.dataStartRow; row <= _worksheet.rowCount; row += 1) {
        const used = _fields.some((_field) => !IsCellEmpty(_worksheet.getCell(row, _field.column).value));
        if (used) {
            last = row;
        }
    }
    return last;
}

function IsCellEmpty(_value: ExcelJS.CellValue): boolean {
    return _value === null || _value === undefined || (typeof _value === 'string' && _value.trim().length === 0);
}

function AssertLangIdsDisjoint(_gameLang: ConfigTable, _commonLang: ConfigTable): void {
    const commonIds = ReadIdSet(_commonLang);
    for (const row of _gameLang.rows) {
        const id = row.values.id;
        if (typeof id === 'number' && commonIds.has(id)) {
            throw new ConfigExportError(`GameLangData 与 CommonLangData 的 id 重复：${id}`, row.location);
        }
    }
}

function ReadGameLangIds(_table: ConfigTable): Map<string, number> {
    const idField = _table.fields.find((_field) => _field.name === 'id');
    const rawField = _table.fields.find((_field) => _field.name === 'raw');
    if (idField === undefined || rawField === undefined) {
        throw new ConfigExportError('GameLangData 必须包含 id 和 raw 字段。');
    }
    const rawToId = new Map<string, number>();
    for (const row of _table.rows) {
        const id = row.values.id;
        const raw = row.values.raw;
        if (typeof id !== 'number' || typeof raw !== 'string' || raw.length === 0) {
            continue;
        }
        const key = NormalizeLangText(raw);
        if (key.length === 0) {
            continue;
        }
        if (rawToId.has(key)) {
            throw new ConfigExportError(`GameLangData 的 raw 重复：${key}`, { ...row.location, column: rawField.column });
        }
        rawToId.set(key, id);
    }
    return rawToId;
}

function ResolveLangValue(
    _value: unknown,
    _field: ConfigField,
    _row: ConfigRow,
    _rawToId: ReadonlyMap<string, number>,
): number | number[] {
    if (Array.isArray(_value)) {
        return _value.map((_item) => ResolveOneLang(_item, _field, _row, _rawToId));
    }
    return ResolveOneLang(_value, _field, _row, _rawToId);
}

function ResolveOneLang(
    _value: unknown,
    _field: ConfigField,
    _row: ConfigRow,
    _rawToId: ReadonlyMap<string, number>,
): number {
    const location = { ..._row.location, column: _field.column };
    if (typeof _value !== 'string') {
        throw new ConfigExportError(`字段 ${_field.name} 应填写多语言原文。`, location);
    }
    const text = NormalizeLangText(_value);
    if (text.length === 0) {
        throw new ConfigExportError(`字段 ${_field.name} 应填写多语言原文。`, location);
    }
    const id = _rawToId.get(text);
    if (id === undefined) {
        throw new ConfigExportError(`翻译表中找不到原文：${text}。请先收集多语言。`, location);
    }
    return id;
}
