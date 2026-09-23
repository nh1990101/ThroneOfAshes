import type { SourceLocation } from './model.js';

export class ConfigExportError extends Error {
    public readonly location?: SourceLocation;

    public constructor(_message: string, _location?: SourceLocation) {
        super(_location === undefined ? _message : `${FormatLocation(_location)} ${_message}`);
        this.name = 'ConfigExportError';
        this.location = _location;
    }
}

export class ConfigExportAggregateError extends Error {
    public readonly errors: readonly ConfigExportError[];

    public constructor(_errors: readonly ConfigExportError[]) {
        super(`配置表检查失败，共 ${_errors.length} 个错误：\n${_errors.map((_error, _index) => `${_index + 1}. ${_error.message}`).join('\n')}`);
        this.name = 'ConfigExportAggregateError';
        this.errors = _errors;
    }
}

export function FormatLocation(_location: SourceLocation): string {
    return `${_location.workbookPath} [${_location.sheetName}] R${_location.row}C${_location.column}:`;
}
