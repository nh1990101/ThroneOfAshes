export const SHEET_LAYOUT = Object.freeze({
    fieldNameRow: 4,
    fieldTypeRow: 5,
    fieldRuleRow: 6,
    dataStartRow: 7,
    tableNameColumn: 1,
    fieldStartColumn: 2,
});

export type ScalarFieldType = 'string' | 'lang' | 'int' | 'float' | 'bool' | 'json';

export interface FieldTypeDefinition {
    scalarType: ScalarFieldType;
    isArray: boolean;
    isNullable: boolean;
    sourceText: string;
}

export type FieldRuleName = string;

export interface ConfigField {
    name: string;
    type: FieldTypeDefinition;
    rules: ReadonlySet<FieldRuleName>;
    column: number;
}

export interface SourceLocation {
    workbookPath: string;
    sheetName: string;
    row: number;
    column: number;
}

export interface ConfigRow {
    values: Record<string, unknown>;
    location: SourceLocation;
}

export interface TableIndex {
    name: string;
    kind: 'dict' | 'array';
    fields: string[];
    sortField?: string;
}

export interface ConfigTable {
    logicalPath: string;
    tableName: string;
    fields: ConfigField[];
    rows: ConfigRow[];
    sources: Array<{ workbookPath: string; sheetName: string }>;
    indexes: TableIndex[];
    indexData: Record<string, unknown> | null;
}

export interface ExportOptions {
    inputDirectory: string;
    outputZipPath: string;
    typesOutputDirectory: string;
    jsonOutputDirectory: string;
    checkOnly?: boolean;
    onProgress?: (_event: ExportProgressEvent) => void;
}

export interface ExportProgressEvent {
    stage: 'workbook' | 'worksheet' | 'table';
    status: 'checking' | 'passed' | 'skipped' | 'failed';
    workbookPath?: string;
    sheetName?: string;
    logicalPath?: string;
    rowCount?: number;
    message?: string;
}

export interface ExportResult {
    workbookCount: number;
    tableCount: number;
    rowCount: number;
    outputFiles: string[];
}
