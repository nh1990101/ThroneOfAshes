import { ConfigExportError } from './errors.js';
import type { ConfigField, ConfigRow, ConfigTable, SourceLocation, TableIndex } from './model.js';
import { SHEET_LAYOUT } from './model.js';

const INDEX_RULE = /^(index_dict|index_array)\(([^()]*)\)$/;
const INDEX_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function BuildTableIndexes(_table: ConfigTable): void {
    const keyField = _table.fields.find((_field) => _field.rules.has('key'));
    if (keyField === undefined) {
        throw new ConfigExportError(`逻辑表 ${_table.logicalPath} 没有可导出的主键。`);
    }

    const indexes: TableIndex[] = [];
    const names = new Set<string>();
    for (const field of _table.fields) {
        for (const rule of field.rules) {
            const match = INDEX_RULE.exec(rule);
            if (match === null) {
                continue;
            }
            const index = ParseIndex(_table, match[1] === 'index_dict' ? 'dict' : 'array', match[2].split(','));
            if (names.has(index.name)) {
                throw new ConfigExportError(`逻辑表 ${_table.logicalPath} 的索引名 ${index.name} 重复。`, RuleLocation(_table, field));
            }
            names.add(index.name);
            indexes.push(index);
        }
    }

    const data: Record<string, unknown> = {};
    for (const index of indexes) {
        data[index.name] = index.kind === 'dict'
            ? BuildDictIndex(_table, index, keyField)
            : BuildArrayIndex(_table, index, keyField);
    }
    _table.indexes = indexes;
    _table.indexData = indexes.length > 0 ? data : null;
}

function ParseIndex(_table: ConfigTable, _kind: TableIndex['kind'], _args: string[]): TableIndex {
    const ruleName = _kind === 'dict' ? 'index_dict' : 'index_array';
    const indexName = _args[0] ?? '';
    if (!INDEX_NAME_PATTERN.test(indexName)) {
        throw new ConfigExportError(`逻辑表 ${_table.logicalPath} 的索引名不合法：${indexName || '<空>'}`);
    }
    if (_kind === 'dict' && _args.length < 2) {
        throw new ConfigExportError(`逻辑表 ${_table.logicalPath} 的 $${ruleName}(${indexName}) 至少要有一个索引字段。`);
    }
    if (_kind === 'array' && _args.length < 3) {
        throw new ConfigExportError(`逻辑表 ${_table.logicalPath} 的 $${ruleName}(${indexName}) 至少要有一个分组字段和排序字段。`);
    }

    const fieldNames = _kind === 'dict' ? _args.slice(1) : _args.slice(1, -1);
    const sortFieldName = _kind === 'array' ? _args[_args.length - 1] : undefined;
    for (const fieldName of fieldNames) {
        AssertIndexField(_table, indexName, fieldName, '索引');
    }
    if (sortFieldName !== undefined) {
        AssertIndexField(_table, indexName, sortFieldName, '排序');
    }
    return {
        name: indexName,
        kind: _kind,
        fields: fieldNames,
        sortField: sortFieldName,
    };
}

function AssertIndexField(_table: ConfigTable, _indexName: string, _fieldName: string, _role: string): ConfigField {
    const field = _table.fields.find((_field) => _field.name === _fieldName);
    if (field === undefined) {
        throw new ConfigExportError(`逻辑表 ${_table.logicalPath} 的索引 ${_indexName} 引用了不存在的字段：${_fieldName}`);
    }
    if (field.name === 'ch_key') {
        throw new ConfigExportError(`逻辑表 ${_table.logicalPath} 的索引 ${_indexName} 不能使用 ch_key。`);
    }
    if (field.rules.has('ignore')) {
        throw new ConfigExportError(`逻辑表 ${_table.logicalPath} 的索引 ${_indexName} 不能使用 $ignore 字段：${_fieldName}`);
    }
    if (field.type.scalarType === 'lang') {
        throw new ConfigExportError(`逻辑表 ${_table.logicalPath} 的索引 ${_indexName} 不能使用多语言字段：${_fieldName}`);
    }
    if (field.type.isArray || field.type.scalarType === 'json') {
        throw new ConfigExportError(`逻辑表 ${_table.logicalPath} 的索引 ${_indexName} 的${_role}字段必须是标量：${_fieldName}`);
    }
    return field;
}

function BuildDictIndex(_table: ConfigTable, _index: TableIndex, _keyField: ConfigField): Record<string, unknown> {
    const root: Record<string, unknown> = {};
    for (const row of _table.rows) {
        const path = ReadPath(_table, _index, row);
        if (path === null) {
            continue;
        }
        let node = root;
        for (let index = 0; index < path.length - 1; index += 1) {
            const key = path[index];
            const child = node[key];
            if (child === undefined) {
                const next: Record<string, unknown> = {};
                node[key] = next;
                node = next;
                continue;
            }
            if (!IsRecord(child)) {
                throw new ConfigExportError(`逻辑表 ${_table.logicalPath} 的索引 ${_index.name} 结构冲突。`, RowLocation(row, _index.fields[index], _table));
            }
            node = child;
        }
        node[path[path.length - 1]] = row.values[_keyField.name];
    }
    return root;
}

function BuildArrayIndex(_table: ConfigTable, _index: TableIndex, _keyField: ConfigField): Record<string, unknown> {
    const sortFieldName = _index.sortField ?? '';
    const groups = new Map<string, ArrayEntry[]>();
    const groupOrder: string[] = [];
    for (const row of _table.rows) {
        const path = ReadPath(_table, _index, row);
        if (path === null) {
            continue;
        }
        const sortValue = row.values[sortFieldName];
        if (sortValue === undefined || sortValue === null) {
            throw new ConfigExportError(
                `索引 ${_index.name} 的排序字段 ${sortFieldName} 不能为空。`,
                RowLocation(row, sortFieldName, _table),
            );
        }
        if (!IsComparable(sortValue)) {
            throw new ConfigExportError(
                `索引 ${_index.name} 的排序字段 ${sortFieldName} 必须是可比较的标量。`,
                RowLocation(row, sortFieldName, _table),
            );
        }
        const groupId = path.join('\u0000');
        let group = groups.get(groupId);
        if (group === undefined) {
            group = [];
            groups.set(groupId, group);
            groupOrder.push(groupId);
        }
        group.push({
            path,
            primaryKey: row.values[_keyField.name],
            sortValue,
            row,
        });
    }

    const root: Record<string, unknown> = {};
    for (const groupId of groupOrder) {
        const group = groups.get(groupId) ?? [];
        const sortType = typeof group[0].sortValue;
        for (const entry of group) {
            if (typeof entry.sortValue !== sortType) {
                throw new ConfigExportError(
                    `索引 ${_index.name} 的排序字段 ${sortFieldName} 类型不一致。`,
                    RowLocation(entry.row, sortFieldName, _table),
                );
            }
        }
        group.sort((_left, _right) => CompareSortValues(_left.sortValue, _right.sortValue));
        let node = root;
        const path = group[0].path;
        for (let index = 0; index < path.length - 1; index += 1) {
            const key = path[index];
            const child = node[key];
            if (child === undefined) {
                const next: Record<string, unknown> = {};
                node[key] = next;
                node = next;
                continue;
            }
            if (!IsRecord(child)) {
                throw new ConfigExportError(`逻辑表 ${_table.logicalPath} 的索引 ${_index.name} 结构冲突。`, RowLocation(group[0].row, _index.fields[index], _table));
            }
            node = child;
        }
        node[path[path.length - 1]] = group.map((_entry) => _entry.primaryKey);
    }
    return root;
}

interface ArrayEntry {
    path: string[];
    primaryKey: unknown;
    sortValue: unknown;
    row: ConfigRow;
}

function ReadPath(_table: ConfigTable, _index: TableIndex, _row: ConfigRow): string[] | null {
    const path: string[] = [];
    for (const fieldName of _index.fields) {
        const value = _row.values[fieldName];
        if (value === undefined || value === null) {
            return null;
        }
        path.push(IndexKey(_table, _index, _row, fieldName, value));
    }
    return path;
}

function IndexKey(_table: ConfigTable, _index: TableIndex, _row: ConfigRow, _fieldName: string, _value: unknown): string {
    if (typeof _value === 'number' && !Number.isFinite(_value)) {
        throw new ConfigExportError(
            `索引 ${_index.name} 的字段 ${_fieldName} 必须是可比较的标量。`,
            RowLocation(_row, _fieldName, _table),
        );
    }
    if (typeof _value === 'string' || typeof _value === 'number' || typeof _value === 'boolean') {
        return String(_value);
    }
    throw new ConfigExportError(
        `索引 ${_index.name} 的字段 ${_fieldName} 必须是标量。`,
        RowLocation(_row, _fieldName, _table),
    );
}

function IsComparable(_value: unknown): boolean {
    if (typeof _value === 'number') {
        return Number.isFinite(_value);
    }
    return typeof _value === 'string' || typeof _value === 'boolean';
}

function CompareSortValues(_left: unknown, _right: unknown): number {
    if (typeof _left === 'number' && typeof _right === 'number') {
        return _left - _right;
    }
    if (typeof _left === 'string' && typeof _right === 'string') {
        if (_left < _right) {
            return -1;
        }
        if (_left > _right) {
            return 1;
        }
        return 0;
    }
    if (typeof _left === 'boolean' && typeof _right === 'boolean') {
        return Number(_left) - Number(_right);
    }
    return 0;
}

function IsRecord(_value: unknown): _value is Record<string, unknown> {
    return typeof _value === 'object' && _value !== null && !Array.isArray(_value);
}

function RuleLocation(_table: ConfigTable, _field: ConfigField): SourceLocation {
    const source = _table.sources[0];
    return {
        workbookPath: source.workbookPath,
        sheetName: source.sheetName,
        row: SHEET_LAYOUT.fieldRuleRow,
        column: _field.column,
    };
}

function RowLocation(_row: ConfigRow, _fieldName: string, _table: ConfigTable): SourceLocation {
    const field = _table.fields.find((_item) => _item.name === _fieldName);
    return { ..._row.location, column: field === undefined ? _row.location.column : field.column };
}
