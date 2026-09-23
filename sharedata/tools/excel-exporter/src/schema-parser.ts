import { ConfigExportError } from './errors.js';
import type { FieldRuleName, FieldTypeDefinition, SourceLocation } from './model.js';

const FIELD_NAME_PATTERN: RegExp = /^[A-Za-z_][A-Za-z0-9_]*$/;
const TABLE_NAME_PATTERN: RegExp = /^[A-Za-z][A-Za-z0-9_.-]*$/;
const SUPPORTED_SCALAR_TYPES: ReadonlySet<string> = new Set(['string', 'lang', 'int', 'float', 'bool', 'json']);
const SIMPLE_RULE_ALIASES: Readonly<Record<string, FieldRuleName>> = Object.freeze({
    key: 'key',
    uniq: 'unique',
    unique: 'unique',
    no_empty: 'required',
    required: 'required',
    ignore: 'ignore',
});
const PARAMETER_RULE_PATTERN: RegExp = /^(ref|ref_group|ref_count|ref_args|ref_args_str|size)\(([^()]*)\)$/;

export function ParseTableName(_value: unknown, _location: SourceLocation): string {
    const tableName = ToTrimmedText(_value);
    if (tableName.length <= 0) {
        throw new ConfigExportError('逻辑表名不能为空。', _location);
    }
    if (!TABLE_NAME_PATTERN.test(tableName)) {
        throw new ConfigExportError(`逻辑表名不合法：${tableName}`, _location);
    }
    return tableName;
}

export function ParseFieldName(_value: unknown, _location: SourceLocation): string {
    const fieldName = ToTrimmedText(_value);
    if (!FIELD_NAME_PATTERN.test(fieldName)) {
        throw new ConfigExportError(`字段名不合法：${fieldName || '<空>'}`, _location);
    }
    return fieldName;
}

export function ParseFieldType(_value: unknown, _location: SourceLocation): FieldTypeDefinition {
    const sourceText = ToTrimmedText(_value);
    let typeText = sourceText;
    let isNullable = false;
    let isArray = false;

    if (typeText.endsWith('?')) {
        isNullable = true;
        typeText = typeText.slice(0, -1);
    }
    if (typeText.endsWith('[]')) {
        isArray = true;
        typeText = typeText.slice(0, -2);
    } else if (typeText.endsWith('_list')) {
        isArray = true;
        typeText = typeText.slice(0, -5);
    }
    if (!SUPPORTED_SCALAR_TYPES.has(typeText)) {
        throw new ConfigExportError(`不支持的字段类型：${sourceText || '<空>'}`, _location);
    }
    if (isArray && isNullable) {
        throw new ConfigExportError('数组类型不支持可空标记；空单元格会导出为空数组。', _location);
    }

    return {
        scalarType: typeText as FieldTypeDefinition['scalarType'],
        isArray,
        isNullable,
        sourceText,
    };
}

export function ParseFieldRules(_value: unknown, _location: SourceLocation): ReadonlySet<FieldRuleName> {
    const sourceText = ToTrimmedText(_value);
    if (sourceText.length <= 0) {
        return new Set<FieldRuleName>();
    }

    const rules = new Set<FieldRuleName>();
    for (const rawRule of sourceText.split(/[$;]/)) {
        const rule = rawRule.trim();
        if (rule.length <= 0) {
            continue;
        }
        const simpleRule = SIMPLE_RULE_ALIASES[rule];
        if (simpleRule !== undefined) {
            rules.add(simpleRule);
            continue;
        }
        const parameterRule = PARAMETER_RULE_PATTERN.exec(rule);
        if (parameterRule === null || parameterRule[2].trim().length <= 0) {
            throw new ConfigExportError(`不支持的校验规则：$${rule}`, _location);
        }
        rules.add(`${parameterRule[1]}(${parameterRule[2].trim()})`);
    }
    return rules;
}

function ToTrimmedText(_value: unknown): string {
    if (_value === null || _value === undefined) {
        return '';
    }
    return String(_value).trim();
}
