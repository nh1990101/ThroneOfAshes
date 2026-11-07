import { createHash } from 'node:crypto';
import { ConfigExportError, DescribeTableSources } from './errors.js';
import { IsLangPackTable } from './lang-ids.js';
import type { ConfigField, ConfigTable, ScalarFieldType, TableIndex } from './model.js';

const REFERENCE_RULE = /^(ref|ref_group|ref_count|ref_args|ref_args_str)\(([^()]*)\)$/;

export function GenerateConfigTypes(_tables: ReadonlyMap<string, ConfigTable>): Map<string, string> {
    const tables = [..._tables.values()].sort((_left, _right) => _left.tableName.localeCompare(_right.tableName, 'en'));
    const tablesByName = new Map(tables.map((_table) => [_table.tableName, _table]));
    const outputs = new Map<string, string>();
    for (const table of tables) {
        if (IsLangPackTable(table.tableName)) {
            continue;
        }
        const keyType = FieldOutputType(GetKeyField(table), tablesByName, table);
        if (keyType !== 'string' && keyType !== 'number') {
            throw new ConfigExportError(DescribeTableSources(table.sources) + ' 逻辑表 ' + table.tableName + ' 的主键类型必须导出为 string 或 number。');
        }
        const lines = [
            '// Auto-generated from ' + table.tableName + '.json by sharedata/tools/excel-exporter.',
            'export interface ' + InterfaceName(table.tableName) + ' {',
        ];
        for (const field of table.fields) {
            if (field.rules.has('ignore')) {
                continue;
            }
            const optional = !field.rules.has('key') && !field.rules.has('required');
            const type = FieldOutputType(field, tablesByName, table);
            lines.push('  ' + field.name + (optional ? '?' : '') + ': ' + type + ';');
        }
        lines.push('}', '');
        if (table.indexes.length > 0) {
            lines.push('export interface ' + InterfaceName(table.tableName) + 'Index {');
            for (const index of table.indexes) {
                lines.push('  ' + index.name + ': ' + IndexType(index, table, tablesByName) + ';');
            }
            lines.push('}', '');
        }
        outputs.set(table.tableName + '.ts', lines.join('\n'));
    }
    return outputs;
}

function InterfaceName(_tableName: string): string {
    return 'I' + _tableName.split(/[_.-]+/)
        .filter((_part) => _part.length > 0)
        .map((_part) => _part[0].toUpperCase() + _part.slice(1))
        .join('');
}

export function GenerateTypeMeta(_tableName: string): string {
    const bytes = createHash('sha1').update('ThroneOfAshes:ExcelTyping:' + _tableName).digest();
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.subarray(0, 16).toString('hex');
    const uuid = hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16)
        + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
    return JSON.stringify({
        ver: '4.0.24',
        importer: 'typescript',
        imported: true,
        uuid,
        files: [],
        subMetas: {},
        userData: {},
    }, null, 2) + '\n';
}

function GetKeyField(_table: ConfigTable): ConfigField {
    const keyField = _table.fields.find((_field) => _field.rules.has('key'));
    if (keyField === undefined || keyField.rules.has('ignore')) {
        throw new ConfigExportError(DescribeTableSources(_table.sources) + ' 逻辑表 ' + _table.tableName + ' 没有可导出的主键。');
    }
    return keyField;
}

function IndexType(_index: TableIndex, _table: ConfigTable, _tablesByName: ReadonlyMap<string, ConfigTable>): string {
    const keyType = FieldOutputType(GetKeyField(_table), _tablesByName, _table);
    let leaf = _index.kind === 'array' ? ArrayType(keyType) : keyType;
    for (let index = _index.fields.length - 1; index >= 0; index -= 1) {
        const fieldName = _index.fields[index];
        const field = _table.fields.find((_field) => _field.name === fieldName);
        if (field === undefined) {
            throw new ConfigExportError(DescribeTableSources(_table.sources) + ' 索引 ' + _index.name + ' 引用了不存在的字段：' + fieldName);
        }
        leaf = 'Record<' + IndexKeyType(field, _tablesByName, _table) + ', ' + leaf + '>';
    }
    return leaf;
}

function IndexKeyType(_field: ConfigField, _tablesByName: ReadonlyMap<string, ConfigTable>, _owner: ConfigTable): string {
    const type = FieldOutputType(_field, _tablesByName, _owner);
    return type.endsWith(' | null') ? type.slice(0, -' | null'.length) : type;
}

function FieldOutputType(_field: ConfigField, _tablesByName: ReadonlyMap<string, ConfigTable>, _owner: ConfigTable): string {
    let type = ScalarType(_field.type.scalarType);
    let isArray = _field.type.isArray;
    for (const rule of _field.rules) {
        const match = REFERENCE_RULE.exec(rule);
        if (match === null) {
            continue;
        }
        const target = _tablesByName.get(match[2]);
        if (target === undefined) {
            throw new ConfigExportError(DescribeTableSources(_owner.sources) + ' 字段 ' + _field.name + ' 引用了不存在的表：' + match[2]);
        }
        const keyType = ScalarType(GetKeyField(target).type.scalarType);
        if (match[1] === 'ref_group') {
            const groupField = target.fields.find((_field) => _field.name === 'group_id');
            type = groupField === undefined ? keyType : UnionType(keyType, ScalarType(groupField.type.scalarType));
        } else if (match[1] === 'ref_count') {
            type = ArrayType(UnionType(keyType, 'number'));
            isArray = false;
        } else if (match[1] === 'ref_args' || match[1] === 'ref_args_str') {
            type = '{ ref: ' + keyType + '; args: (number | string)[] }';
        } else {
            type = keyType;
        }
    }
    if (isArray) {
        type = ArrayType(type);
    }
    if (_field.type.isNullable && type !== 'unknown') {
        type += ' | null';
    }
    return type;
}

function ScalarType(_type: ScalarFieldType): string {
    switch (_type) {
        case 'string':
            return 'string';
        case 'lang':
            return 'number';
        case 'int':
        case 'float':
            return 'number';
        case 'bool':
            return 'boolean';
        case 'json':
            return 'unknown';
    }
}

function UnionType(_left: string, _right: string): string {
    return _left === _right ? _left : _left + ' | ' + _right;
}

function ArrayType(_type: string): string {
    return _type.includes(' | ') ? '(' + _type + ')[]' : _type + '[]';
}
