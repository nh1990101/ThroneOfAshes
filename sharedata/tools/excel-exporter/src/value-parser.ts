import { ConfigExportError } from './errors.js';
import type { ConfigField, ScalarFieldType, SourceLocation } from './model.js';

export function IsBlankValue(_value: unknown): boolean {
    if (_value === null || _value === undefined) {
        return true;
    }
    if (typeof _value !== 'string') {
        return false;
    }

    const value = _value.trim();
    return value.length <= 0 || value === '待配置';
}

export function ParseFieldValue(_rawValue: unknown, _field: ConfigField, _location: SourceLocation): unknown {
    if (IsBlankValue(_rawValue)) {
        if (_field.rules.has('required') || _field.rules.has('key')) {
            throw new ConfigExportError(`字段 ${_field.name} 不能为空。`, _location);
        }
        if (_field.type.isNullable) {
            return null;
        }
        return undefined;
    }

    if (_field.type.isArray) {
        return ParseArrayValue(_rawValue, _field.type.scalarType, _field.name, _location);
    }
    return ParseScalarValue(_rawValue, _field.type.scalarType, _field.name, _location);
}

function ParseArrayValue(
    _rawValue: unknown,
    _scalarType: ScalarFieldType,
    _fieldName: string,
    _location: SourceLocation,
): unknown[] {
    if (_scalarType === 'json') {
        const parsedJson = ParseJson(_rawValue, _fieldName, _location);
        if (!Array.isArray(parsedJson)) {
            throw new ConfigExportError(`字段 ${_fieldName} 必须是 JSON 数组。`, _location);
        }
        return parsedJson;
    }

    const elements = typeof _rawValue === 'string' && _rawValue.trim().startsWith('[')
        ? ParseJsonArray(_rawValue, _fieldName, _location)
        : String(_rawValue).split('//').map((_item) => _item.trim());

    return elements.map((_item) => ParseScalarValue(_item, _scalarType, _fieldName, _location));
}

function ParseScalarValue(
    _rawValue: unknown,
    _scalarType: ScalarFieldType,
    _fieldName: string,
    _location: SourceLocation,
): unknown {
    switch (_scalarType) {
        case 'string':
            return ParseString(_rawValue, _fieldName, _location);
        case 'lang':
            return `lang-${ParseString(_rawValue, _fieldName, _location)}`;
        case 'int':
            return ParseInteger(_rawValue, _fieldName, _location);
        case 'float':
            return ParseFloat(_rawValue, _fieldName, _location);
        case 'bool':
            return ParseBoolean(_rawValue, _fieldName, _location);
        case 'json':
            return ParseJson(_rawValue, _fieldName, _location);
    }
}

function ParseString(_value: unknown, _fieldName: string, _location: SourceLocation): string {
    if (typeof _value === 'string' || typeof _value === 'number' || typeof _value === 'boolean') {
        return String(_value).trim();
    }
    throw new ConfigExportError(`字段 ${_fieldName} 无法转换为 string。`, _location);
}

function ParseInteger(_value: unknown, _fieldName: string, _location: SourceLocation): number {
    const value = typeof _value === 'number' ? _value : Number(String(_value).trim());
    if (!Number.isSafeInteger(value)) {
        throw new ConfigExportError(`字段 ${_fieldName} 不是安全整数：${String(_value)}`, _location);
    }
    return value;
}

function ParseFloat(_value: unknown, _fieldName: string, _location: SourceLocation): number {
    const value = typeof _value === 'number' ? _value : Number(String(_value).trim());
    if (!Number.isFinite(value)) {
        throw new ConfigExportError(`字段 ${_fieldName} 不是有限数字：${String(_value)}`, _location);
    }
    return value;
}

function ParseBoolean(_value: unknown, _fieldName: string, _location: SourceLocation): boolean {
    if (typeof _value === 'boolean') {
        return _value;
    }
    if (_value === 1 || String(_value).trim().toLowerCase() === 'true' || String(_value).trim() === '1') {
        return true;
    }
    if (_value === 0 || String(_value).trim().toLowerCase() === 'false' || String(_value).trim() === '0') {
        return false;
    }
    throw new ConfigExportError(`字段 ${_fieldName} 不是布尔值：${String(_value)}`, _location);
}

function ParseJson(_value: unknown, _fieldName: string, _location: SourceLocation): unknown {
    if (typeof _value !== 'string') {
        throw new ConfigExportError(`字段 ${_fieldName} 的 JSON 值必须以文本填写。`, _location);
    }
    try {
        return JSON.parse(_value);
    } catch (_error: unknown) {
        throw new ConfigExportError(`字段 ${_fieldName} 不是合法 JSON。`, _location);
    }
}

function ParseJsonArray(_value: string, _fieldName: string, _location: SourceLocation): unknown[] {
    const parsedJson = ParseJson(_value, _fieldName, _location);
    if (!Array.isArray(parsedJson)) {
        throw new ConfigExportError(`字段 ${_fieldName} 必须是数组。`, _location);
    }
    return parsedJson;
}
