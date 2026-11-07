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

/** 相对 excel 目录的文件名，例如 `Y-英雄表(HeroData).xlsx` 或 `UI/Page.xlsx`。 */
export function FormatWorkbookLabel(_workbookPath: string): string {
    const normalized = _workbookPath.replaceAll('\\', '/');
    const marker = '/excel/';
    const index = normalized.toLowerCase().lastIndexOf(marker);
    if (index >= 0) {
        return normalized.slice(index + marker.length);
    }
    const slash = normalized.lastIndexOf('/');
    return slash < 0 ? normalized : normalized.slice(slash + 1);
}

export function FormatLocation(_location: SourceLocation): string {
    return `Excel：${FormatWorkbookLabel(_location.workbookPath)} [${_location.sheetName}] R${_location.row}C${_location.column}:`;
}

export function DescribeTableSources(_sources: ReadonlyArray<{ workbookPath: string; sheetName: string }>): string {
    const labels = _sources.map((_source) => `${FormatWorkbookLabel(_source.workbookPath)} [${_source.sheetName}]`);
    return labels.length <= 0 ? '' : `Excel：${labels.join('、')}`;
}
