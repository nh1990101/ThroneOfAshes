import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { ConfigExportAggregateError } from '../src/errors.js';
import { ExportExcelConfigs } from '../src/exporter.js';

type Field = { name: string; type: string; rule?: string };

async function InTempDirectory(_name: string, _run: (_root: string) => Promise<void>): Promise<void> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), _name));
    try {
        await _run(root);
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
}

function OutputPaths(_root: string) {
    return {
        inputDirectory: path.join(_root, 'excel'),
        outputZipPath: path.join(_root, 'ConfigForClient.zip'),
        typesOutputDirectory: path.join(_root, 'Generated'),
    };
}

function AddSheet(
    _workbook: ExcelJS.Workbook,
    _sheetName: string,
    _tableName: string,
    _fields: Field[],
    _rows: unknown[][],
): void {
    const sheet = _workbook.addWorksheet(_sheetName);
    sheet.getCell(4, 1).value = _tableName;
    for (let index = 0; index < _fields.length; index += 1) {
        const column = index + 2;
        sheet.getCell(3, column).value = _fields[index].name;
        sheet.getCell(4, column).value = _fields[index].name;
        sheet.getCell(5, column).value = _fields[index].type;
        sheet.getCell(6, column).value = _fields[index].rule ?? '';
    }
    for (let rowIndex = 0; rowIndex < _rows.length; rowIndex += 1) {
        for (let columnIndex = 0; columnIndex < _rows[rowIndex].length; columnIndex += 1) {
            sheet.getCell(rowIndex + 7, columnIndex + 2).value = _rows[rowIndex][columnIndex] as ExcelJS.CellValue;
        }
    }
}

async function ReadEntry(_zipPath: string, _name: string): Promise<unknown> {
    const zip = await JSZip.loadAsync(await fs.readFile(_zipPath));
    const entry = zip.file(_name);
    assert.ok(entry, _name + ' missing from ZIP');
    return JSON.parse(await entry.async('text'));
}

test('merges sheets, converts values, and emits flat ZIP entries plus row types', async () => {
    await InTempDirectory('excel-exporter-merge-', async (root) => {
        const paths = OutputPaths(root);
        const workbookPath = path.join(paths.inputDirectory, 'Battle', 'BattleSample.xlsx');
        await fs.mkdir(path.dirname(workbookPath), { recursive: true });
        const workbook = new ExcelJS.Workbook();
        const fields: Field[] = [
            { name: 'ID', type: 'string', rule: '$key' },
            { name: 'COUNT', type: 'int', rule: '$required' },
            { name: 'ENABLED', type: 'bool' },
            { name: 'TAGS', type: 'int_list' },
            { name: 'NOTE', type: 'string' },
        ];
        AddSheet(workbook, '第一批', 'BattleSample', fields, [['A_1', 10, true, '1//2', '']]);
        AddSheet(workbook, '第二批', 'BattleSample', fields, [['A_2', '20', 'false', '[3,4]', 'memo']]);
        workbook.addWorksheet('#说明').getCell('A1').value = 'skip';
        await workbook.xlsx.writeFile(workbookPath);

        const result = await ExportExcelConfigs(paths);
        assert.equal(result.workbookCount, 1);
        assert.equal(result.tableCount, 1);
        assert.equal(result.rowCount, 2);
        const zip = await JSZip.loadAsync(await fs.readFile(paths.outputZipPath));
        assert.deepEqual(Object.keys(zip.files), ['BattleSample.json']);
        assert.deepEqual(await ReadEntry(paths.outputZipPath, 'BattleSample.json'), [
            { ID: 'A_1', COUNT: 10, ENABLED: true, TAGS: [1, 2] },
            { ID: 'A_2', COUNT: 20, ENABLED: false, TAGS: [3, 4], NOTE: 'memo' },
        ]);
        const typePath = path.join(paths.typesOutputDirectory, 'BattleSample.ts');
        const types = await fs.readFile(typePath, 'utf8');
        assert.match(types, /Auto-generated from BattleSample\.json/);
        assert.match(types, /export interface IBattleSample/);
        assert.match(types, /ID: string;/);
        assert.match(types, /COUNT: number;/);
        assert.match(types, /NOTE\?: string;/);
        assert.match(await fs.readFile(typePath + '.meta', 'utf8'), /"uuid":/);
    });
});

test('converts references and generates the post-conversion types', async () => {
    await InTempDirectory('excel-exporter-reference-', async (root) => {
        const paths = OutputPaths(root);
        await fs.mkdir(paths.inputDirectory, { recursive: true });
        const workbook = new ExcelJS.Workbook();
        AddSheet(workbook, '物品', 'ItemData', [
            { name: 'id', type: 'int', rule: '$key' },
            { name: 'ch_key', type: 'string', rule: '$uniq' },
        ], [[100, 'GOLD']]);
        AddSheet(workbook, '奖励', 'RewardData', [
            { name: 'id', type: 'int', rule: '$key' },
            { name: 'item', type: 'string', rule: '$ref(ItemData)' },
            { name: 'counts', type: 'string_list', rule: '$ref_count(ItemData)' },
        ], [[1, 'GOLD', 'GOLD//5']]);
        await workbook.xlsx.writeFile(path.join(paths.inputDirectory, 'Reference.xlsx'));

        await ExportExcelConfigs(paths);
        assert.deepEqual(await ReadEntry(paths.outputZipPath, 'RewardData.json'), [
            { id: 1, item: 100, counts: [100, 5] },
        ]);
        const types = await fs.readFile(path.join(paths.typesOutputDirectory, 'RewardData.ts'), 'utf8');
        assert.match(types, /item\?: number;/);
        assert.match(types, /counts\?: number\[\];/);
    });
});

test('check mode writes nothing and repeated export is byte-for-byte stable', async () => {
    await InTempDirectory('excel-exporter-check-', async (root) => {
        const paths = OutputPaths(root);
        await fs.mkdir(paths.inputDirectory, { recursive: true });
        const workbook = new ExcelJS.Workbook();
        AddSheet(workbook, '配置', 'ItemData', [{ name: 'id', type: 'int', rule: '$key' }], [[1]]);
        await workbook.xlsx.writeFile(path.join(paths.inputDirectory, 'Item.xlsx'));

        await ExportExcelConfigs({ ...paths, checkOnly: true });
        await assert.rejects(fs.access(paths.outputZipPath));
        await assert.rejects(fs.access(paths.typesOutputDirectory));
        await ExportExcelConfigs(paths);
        const firstZip = await fs.readFile(paths.outputZipPath);
        const typePath = path.join(paths.typesOutputDirectory, 'ItemData.ts');
        const firstTypes = await fs.readFile(typePath);
        const firstMeta = await fs.readFile(typePath + '.meta');
        await ExportExcelConfigs(paths);
        assert.deepEqual(await fs.readFile(paths.outputZipPath), firstZip);
        assert.deepEqual(await fs.readFile(typePath), firstTypes);
        assert.deepEqual(await fs.readFile(typePath + '.meta'), firstMeta);
    });
});

test('duplicate keys report the cell and leave existing outputs unchanged', async () => {
    await InTempDirectory('excel-exporter-duplicate-', async (root) => {
        const paths = OutputPaths(root);
        await fs.mkdir(paths.inputDirectory, { recursive: true });
        const workbookPath = path.join(paths.inputDirectory, 'Item.xlsx');
        const workbook = new ExcelJS.Workbook();
        AddSheet(workbook, '物品', 'ItemData', [{ name: 'id', type: 'int', rule: '$key' }], [[1]]);
        await workbook.xlsx.writeFile(workbookPath);
        await ExportExcelConfigs(paths);
        const oldZip = await fs.readFile(paths.outputZipPath);
        const typePath = path.join(paths.typesOutputDirectory, 'ItemData.ts');
        const oldTypes = await fs.readFile(typePath);

        workbook.getWorksheet('物品')!.getCell(8, 2).value = 1;
        await workbook.xlsx.writeFile(workbookPath);
        await assert.rejects(ExportExcelConfigs(paths), (_error: unknown) => {
            assert.ok(_error instanceof ConfigExportAggregateError);
            assert.match(_error.message, /Item\.xlsx \[物品\] R8C2/);
            return true;
        });
        assert.deepEqual(await fs.readFile(paths.outputZipPath), oldZip);
        assert.deepEqual(await fs.readFile(typePath), oldTypes);
    });
});

test('missing references fail with the source cell and keep prior outputs', async () => {
    await InTempDirectory('excel-exporter-missing-ref-', async (root) => {
        const paths = OutputPaths(root);
        await fs.mkdir(paths.inputDirectory, { recursive: true });
        const workbookPath = path.join(paths.inputDirectory, 'Ref.xlsx');
        const workbook = new ExcelJS.Workbook();
        AddSheet(workbook, '物品', 'ItemData', [{ name: 'id', type: 'int', rule: '$key' }], [[1]]);
        AddSheet(workbook, '奖励', 'RewardData', [
            { name: 'id', type: 'int', rule: '$key' },
            { name: 'item', type: 'int', rule: '$ref(ItemData)' },
        ], [[1, 1]]);
        await workbook.xlsx.writeFile(workbookPath);
        await ExportExcelConfigs(paths);
        const oldZip = await fs.readFile(paths.outputZipPath);
        const typePath = path.join(paths.typesOutputDirectory, 'RewardData.ts');
        const oldTypes = await fs.readFile(typePath);

        workbook.getWorksheet('奖励')!.getCell(7, 3).value = 999;
        await workbook.xlsx.writeFile(workbookPath);
        await assert.rejects(ExportExcelConfigs(paths), (_error: unknown) => {
            assert.ok(_error instanceof ConfigExportAggregateError);
            assert.match(_error.message, /Ref\.xlsx \[奖励\] R7C3/);
            return true;
        });
        assert.deepEqual(await fs.readFile(paths.outputZipPath), oldZip);
        assert.deepEqual(await fs.readFile(typePath), oldTypes);
    });
});

test('emits the legacy interface naming style and only removes its own stale types', async () => {
    await InTempDirectory('excel-exporter-type-files-', async (root) => {
        const paths = OutputPaths(root);
        await fs.mkdir(paths.inputDirectory, { recursive: true });
        await fs.mkdir(paths.typesOutputDirectory, { recursive: true });
        const manualPath = path.join(paths.typesOutputDirectory, 'HandWritten.ts');
        await fs.writeFile(manualPath, 'export interface IHandWritten { value: string; }\n');
        const workbookPath = path.join(paths.inputDirectory, 'Config.xlsx');
        const workbook = new ExcelJS.Workbook();
        AddSheet(workbook, '鱼点', 'fishing_tbl', [
            { name: 'ID', type: 'int', rule: '$key' },
            { name: 'RareFishing', type: 'int_list' },
        ], [[1, '1//2']]);
        await workbook.xlsx.writeFile(workbookPath);
        await ExportExcelConfigs(paths);
        const oldTypePath = path.join(paths.typesOutputDirectory, 'fishing_tbl.ts');
        const types = await fs.readFile(oldTypePath, 'utf8');
        assert.match(types, /export interface IFishingTbl/);
        assert.match(types, /RareFishing\?: number\[\];/);

        workbook.removeWorksheet('鱼点');
        AddSheet(workbook, '新表', 'NewData', [{ name: 'id', type: 'int', rule: '$key' }], [[1]]);
        await workbook.xlsx.writeFile(workbookPath);
        await ExportExcelConfigs(paths);
        await assert.rejects(fs.access(oldTypePath));
        await assert.rejects(fs.access(oldTypePath + '.meta'));
        assert.equal(await fs.readFile(manualPath, 'utf8'), 'export interface IHandWritten { value: string; }\n');
        assert.match(await fs.readFile(path.join(paths.typesOutputDirectory, 'NewData.ts'), 'utf8'), /export interface INewData/);
    });
});
