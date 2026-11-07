import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { ConfigExportAggregateError } from '../src/errors.js';
import { CollectLangTexts } from '../src/collect-lang.js';
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
        jsonOutputDirectory: path.join(_root, 'json'),
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

function CreateSplitMonsterWorkbook(_reverseSheets = false, _reorderColumns = false): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    const fields: Field[] = [
        { name: 'id', type: 'int', rule: '$key' },
        { name: 'ch_key', type: 'string', rule: '$uniq' },
        { name: '', type: '' },
        { name: 'is_confirm', type: 'bool' },
        { name: 'is_boss', type: 'bool' },
        { name: 'reward', type: 'string', rule: 'ref(OutputData)' },
    ];
    const mainFields = _reorderColumns ? [fields[0], fields[5], fields[4], fields[2], fields[1], fields[3]] : fields;
    const mainRows: Array<Record<string, unknown>> = [
        { id: 10001011, ch_key: '主线普通怪', is_confirm: false, reward: '临时通用产出' },
        { id: 10001013, ch_key: '主线高级怪', is_confirm: true, is_boss: true, reward: '临时通用产出' },
    ];
    const addBase = () => AddSheet(workbook, '副本属性表', 'MonsterAttrData', [
        fields[0], fields[1], fields[3], fields[4],
    ], [[1, '测试副本', false, null]]);
    const addMain = () => {
        AddSheet(workbook, '1.主线', 'MonsterAttrData', mainFields,
            mainRows.map((_row) => mainFields.map((_field) => _row[_field.name] ?? null)));
        const sheet = workbook.getWorksheet('1.主线')!;
        sheet.getCell(3, mainFields.findIndex((_field) => _field.name === '') + 2).value = '暗雷队列';
        sheet.getCell('I3').value = '策划说明';
        sheet.getCell('I7').value = '此列没有字段名，不作为配置导出';
    };
    for (const add of _reverseSheets ? [addMain, addBase] : [addBase, addMain]) {
        add();
    }
    AddSheet(workbook, '固定产出', 'OutputData', [
        { name: 'id', type: 'int', rule: '$key' },
        { name: 'ch_key', type: 'string', rule: '$uniq' },
    ], [[1, '临时通用产出']]);
    return workbook;
}

for (const reverseSheets of [false, true]) {
    for (const reorderColumns of [false, true]) {
        test(`merges split-table fields beyond blank columns (reversed sheets=${reverseSheets}, reordered columns=${reorderColumns})`, async () => {
            await InTempDirectory('excel-exporter-split-fields-', async (root) => {
                const paths = OutputPaths(root);
                await fs.mkdir(paths.inputDirectory, { recursive: true });
                const workbook = CreateSplitMonsterWorkbook(reverseSheets, reorderColumns);
                await workbook.xlsx.writeFile(path.join(paths.inputDirectory, 'Monster.xlsx'));

                await ExportExcelConfigs(paths);
                const baseRows = [{ id: 1, is_confirm: false }];
                const mainRows = [
                    { id: 10001011, is_confirm: false, reward: 1 },
                    { id: 10001013, is_confirm: true, is_boss: true, reward: 1 },
                ];
                const expectedRows = reverseSheets ? [...mainRows, ...baseRows] : [...baseRows, ...mainRows];
                assert.deepEqual(await ReadEntry(paths.outputZipPath, 'MonsterAttrData.json'), expectedRows);
                const jsonText = await fs.readFile(path.join(paths.jsonOutputDirectory, 'MonsterAttrData.json'), 'utf8');
                assert.deepEqual(JSON.parse(jsonText), expectedRows);
                const zip = await JSZip.loadAsync(await fs.readFile(paths.outputZipPath));
                assert.equal(await zip.file('MonsterAttrData.json')!.async('text'), jsonText);
                const types = await fs.readFile(path.join(paths.typesOutputDirectory, 'MonsterAttrData.ts'), 'utf8');
                assert.match(types, /reward\?: number;/);
                assert.match(types, /is_confirm\?: boolean;/);
                assert.match(types, /is_boss\?: boolean;/);
                assert.doesNotMatch(types, /ch_key|暗雷队列|策划说明/);
            });
        });
    }
}

test('split-table added-field reference errors report the cell and preserve prior outputs', async () => {
    await InTempDirectory('excel-exporter-split-ref-error-', async (root) => {
        const paths = OutputPaths(root);
        await fs.mkdir(paths.inputDirectory, { recursive: true });
        const workbookPath = path.join(paths.inputDirectory, 'Monster.xlsx');
        const workbook = CreateSplitMonsterWorkbook();
        await workbook.xlsx.writeFile(workbookPath);
        await ExportExcelConfigs(paths);
        const outputFiles = [
            paths.outputZipPath,
            path.join(paths.jsonOutputDirectory, 'MonsterAttrData.json'),
            path.join(paths.typesOutputDirectory, 'MonsterAttrData.ts'),
            path.join(paths.typesOutputDirectory, 'MonsterAttrData.ts.meta'),
        ];
        const oldOutputs = await Promise.all(outputFiles.map((_file) => fs.readFile(_file)));

        workbook.getWorksheet('1.主线')!.getCell('G7').value = '不存在的奖励产出';
        await workbook.xlsx.writeFile(workbookPath);
        await assert.rejects(ExportExcelConfigs(paths), (_error: unknown) => {
            assert.ok(_error instanceof ConfigExportAggregateError);
            assert.match(_error.message, /Monster\.xlsx \[1\.主线\] R7C7/);
            assert.match(_error.message, /reward.*OutputData.*不存在的奖励产出/);
            return true;
        });
        const newOutputs = await Promise.all(outputFiles.map((_file) => fs.readFile(_file)));
        assert.deepEqual(newOutputs, oldOutputs);
    });
});

test('split-table fields beyond blank columns still reject conflicting types', async () => {
    await InTempDirectory('excel-exporter-split-type-error-', async (root) => {
        const paths = OutputPaths(root);
        await fs.mkdir(paths.inputDirectory, { recursive: true });
        const workbook = CreateSplitMonsterWorkbook();
        AddSheet(workbook, '2.支线', 'MonsterAttrData', [
            { name: 'id', type: 'int', rule: '$key' },
            { name: 'reward', type: 'int' },
        ], [[20001011, 1]]);
        await workbook.xlsx.writeFile(path.join(paths.inputDirectory, 'Monster.xlsx'));
        await assert.rejects(ExportExcelConfigs(paths), (_error: unknown) => {
            assert.ok(_error instanceof ConfigExportAggregateError);
            assert.match(_error.message, /Monster\.xlsx \[2\.支线\] R4C3/);
            assert.match(_error.message, /reward 类型冲突：string \/ int/);
            return true;
        });
        await assert.rejects(fs.access(paths.outputZipPath));
        await assert.rejects(fs.access(paths.typesOutputDirectory));
        await assert.rejects(fs.access(paths.jsonOutputDirectory));
    });
});

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
        const jsonPath = path.join(paths.jsonOutputDirectory, 'BattleSample.json');
        const zipEntry = zip.file('BattleSample.json');
        assert.ok(zipEntry);
        assert.equal(await fs.readFile(jsonPath, 'utf8'), await zipEntry.async('text'));
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
        assert.deepEqual(await ReadEntry(paths.outputZipPath, 'ItemData.json'), [
            { id: 100 },
        ]);
        assert.deepEqual(await ReadEntry(paths.outputZipPath, 'RewardData.json'), [
            { id: 1, item: 100, counts: [100, 5] },
        ]);
        const itemTypes = await fs.readFile(path.join(paths.typesOutputDirectory, 'ItemData.ts'), 'utf8');
        assert.doesNotMatch(itemTypes, /ch_key/);
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
        await assert.rejects(fs.access(paths.jsonOutputDirectory));
        await ExportExcelConfigs(paths);
        const firstZip = await fs.readFile(paths.outputZipPath);
        const typePath = path.join(paths.typesOutputDirectory, 'ItemData.ts');
        const jsonPath = path.join(paths.jsonOutputDirectory, 'ItemData.json');
        const firstTypes = await fs.readFile(typePath);
        const firstMeta = await fs.readFile(typePath + '.meta');
        const firstJson = await fs.readFile(jsonPath);
        await ExportExcelConfigs({ ...paths, checkOnly: true });
        assert.deepEqual(await fs.readFile(jsonPath), firstJson);
        await ExportExcelConfigs(paths);
        assert.deepEqual(await fs.readFile(paths.outputZipPath), firstZip);
        assert.deepEqual(await fs.readFile(typePath), firstTypes);
        assert.deepEqual(await fs.readFile(typePath + '.meta'), firstMeta);
        assert.deepEqual(await fs.readFile(jsonPath), firstJson);
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
        const jsonPath = path.join(paths.jsonOutputDirectory, 'ItemData.json');
        const oldTypes = await fs.readFile(typePath);
        const oldJson = await fs.readFile(jsonPath);

        workbook.getWorksheet('物品')!.getCell(8, 2).value = 1;
        await workbook.xlsx.writeFile(workbookPath);
        await assert.rejects(ExportExcelConfigs(paths), (_error: unknown) => {
            assert.ok(_error instanceof ConfigExportAggregateError);
            assert.match(_error.message, /Item\.xlsx \[物品\] R8C2/);
            return true;
        });
        assert.deepEqual(await fs.readFile(paths.outputZipPath), oldZip);
        assert.deepEqual(await fs.readFile(typePath), oldTypes);
        assert.deepEqual(await fs.readFile(jsonPath), oldJson);
    });
});

test('table-level errors name the excel file and sheet', async () => {
    await InTempDirectory('excel-exporter-missing-key-', async (root) => {
        const paths = OutputPaths(root);
        await fs.mkdir(path.join(paths.inputDirectory, 'UI'), { recursive: true });
        const workbookPath = path.join(paths.inputDirectory, 'UI', 'Y-英雄表(HeroData).xlsx');
        const workbook = new ExcelJS.Workbook();
        AddSheet(workbook, '英雄', 'HeroData', [{ name: 'id', type: 'int' }], [[1]]);
        await workbook.xlsx.writeFile(workbookPath);
        await assert.rejects(ExportExcelConfigs(paths), (_error: unknown) => {
            assert.ok(_error instanceof ConfigExportAggregateError);
            assert.match(_error.message, /Excel：UI\/Y-英雄表\(HeroData\)\.xlsx \[英雄\]/);
            return true;
        });
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
        const jsonPath = path.join(paths.jsonOutputDirectory, 'RewardData.json');
        const oldTypes = await fs.readFile(typePath);
        const oldJson = await fs.readFile(jsonPath);

        workbook.getWorksheet('奖励')!.getCell(7, 3).value = 999;
        await workbook.xlsx.writeFile(workbookPath);
        await assert.rejects(ExportExcelConfigs(paths), (_error: unknown) => {
            assert.ok(_error instanceof ConfigExportAggregateError);
            assert.match(_error.message, /Ref\.xlsx \[奖励\] R7C3/);
            return true;
        });
        assert.deepEqual(await fs.readFile(paths.outputZipPath), oldZip);
        assert.deepEqual(await fs.readFile(typePath), oldTypes);
        assert.deepEqual(await fs.readFile(jsonPath), oldJson);
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
        const notePath = path.join(paths.jsonOutputDirectory, 'notes.txt');
        await ExportExcelConfigs(paths);
        await fs.writeFile(notePath, 'keep\n');
        const oldTypePath = path.join(paths.typesOutputDirectory, 'fishing_tbl.ts');
        const oldJsonPath = path.join(paths.jsonOutputDirectory, 'fishing_tbl.json');
        const types = await fs.readFile(oldTypePath, 'utf8');
        assert.match(types, /export interface IFishingTbl/);
        assert.match(types, /RareFishing\?: number\[\];/);
        assert.match(await fs.readFile(oldJsonPath, 'utf8'), /"RareFishing": \[/);

        workbook.removeWorksheet('鱼点');
        AddSheet(workbook, '新表', 'NewData', [{ name: 'id', type: 'int', rule: '$key' }], [[1]]);
        await workbook.xlsx.writeFile(workbookPath);
        await ExportExcelConfigs(paths);
        await assert.rejects(fs.access(oldTypePath));
        await assert.rejects(fs.access(oldTypePath + '.meta'));
        await assert.rejects(fs.access(oldJsonPath));
        assert.equal(await fs.readFile(manualPath, 'utf8'), 'export interface IHandWritten { value: string; }\n');
        assert.equal(await fs.readFile(notePath, 'utf8'), 'keep\n');
        assert.match(await fs.readFile(path.join(paths.typesOutputDirectory, 'NewData.ts'), 'utf8'), /export interface INewData/);
        assert.match(await fs.readFile(path.join(paths.jsonOutputDirectory, 'NewData.json'), 'utf8'), /"id": 1/);
    });
});

test('builds index_dict and index_array beside the row JSON', async () => {
    await InTempDirectory('excel-exporter-index-', async (root) => {
        const paths = OutputPaths(root);
        await fs.mkdir(paths.inputDirectory, { recursive: true });
        const workbook = new ExcelJS.Workbook();
        AddSheet(workbook, '等级', 'HeroLevelData', [
            { name: 'id', type: 'int', rule: '$key$index_dict(group_dict, group_id, level)$index_array(level_list, group_id, sort)' },
            { name: 'group_id', type: 'int' },
            { name: 'level', type: 'int' },
            { name: 'sort', type: 'int' },
            { name: 'note', type: 'string' },
        ], [
            [1, 10, 1, 2, 'a'],
            [2, 10, 2, 1, ''],
            [3, 10, 2, 3, 'c'],
            [4, 20, 1, 5, 'd'],
            [6, 20, 1, 5, 'f'],
            [5, '', 1, 1, 'e'],
        ]);
        await workbook.xlsx.writeFile(path.join(paths.inputDirectory, 'Hero.xlsx'));

        await ExportExcelConfigs(paths);
        const rowJson = JSON.parse(await fs.readFile(path.join(paths.jsonOutputDirectory, 'HeroLevelData.json'), 'utf8'));
        assert.equal(Array.isArray(rowJson), true);
        assert.equal(rowJson.length, 6);
        assert.deepEqual(JSON.parse(await fs.readFile(path.join(paths.jsonOutputDirectory, 'HeroLevelDataIndex.json'), 'utf8')), {
            group_dict: { '10': { '1': 1, '2': 3 }, '20': { '1': 6 } },
            level_list: { '10': [2, 1, 3], '20': [4, 6] },
        });
        assert.deepEqual(await ReadEntry(paths.outputZipPath, 'HeroLevelDataIndex.json'), {
            group_dict: { '10': { '1': 1, '2': 3 }, '20': { '1': 6 } },
            level_list: { '10': [2, 1, 3], '20': [4, 6] },
        });
        const types = await fs.readFile(path.join(paths.typesOutputDirectory, 'HeroLevelData.ts'), 'utf8');
        assert.match(types, /export interface IHeroLevelDataIndex \{\n  group_dict: Record<number, Record<number, number>>;\n  level_list: Record<number, number\[\]>;\n\}/);

        const firstIndex = await fs.readFile(path.join(paths.jsonOutputDirectory, 'HeroLevelDataIndex.json'));
        await ExportExcelConfigs(paths);
        assert.deepEqual(await fs.readFile(path.join(paths.jsonOutputDirectory, 'HeroLevelDataIndex.json')), firstIndex);
    });
});

test('index rules report missing fields, empty sort values, and duplicate names', async () => {
    await InTempDirectory('excel-exporter-index-errors-', async (root) => {
        const paths = OutputPaths(root);
        await fs.mkdir(paths.inputDirectory, { recursive: true });
        const workbookPath = path.join(paths.inputDirectory, 'Hero.xlsx');

        const missingField = new ExcelJS.Workbook();
        AddSheet(missingField, '等级', 'HeroLevelData', [
            { name: 'id', type: 'int', rule: '$key$index_dict(group_dict, missing)' },
        ], [[1]]);
        await missingField.xlsx.writeFile(workbookPath);
        await assert.rejects(ExportExcelConfigs(paths), (_error: unknown) => {
            assert.ok(_error instanceof ConfigExportAggregateError);
            assert.match(_error.message, /引用了不存在的字段：missing/);
            return true;
        });

        const emptySort = new ExcelJS.Workbook();
        AddSheet(emptySort, '等级', 'HeroLevelData', [
            { name: 'id', type: 'int', rule: '$key$index_array(level_list, group_id, sort)' },
            { name: 'group_id', type: 'int' },
            { name: 'sort', type: 'int' },
        ], [[1, 10, '']]);
        await emptySort.xlsx.writeFile(workbookPath);
        await assert.rejects(ExportExcelConfigs(paths), (_error: unknown) => {
            assert.ok(_error instanceof ConfigExportAggregateError);
            assert.match(_error.message, /排序字段 sort 不能为空/);
            return true;
        });

        const duplicateName = new ExcelJS.Workbook();
        AddSheet(duplicateName, '等级', 'HeroLevelData', [
            { name: 'id', type: 'int', rule: '$key$index_dict(group_dict, group_id)' },
            { name: 'group_id', type: 'int', rule: '$index_dict(group_dict, id)' },
        ], [[1, 10]]);
        await duplicateName.xlsx.writeFile(workbookPath);
        await assert.rejects(ExportExcelConfigs(paths), (_error: unknown) => {
            assert.ok(_error instanceof ConfigExportAggregateError);
            assert.match(_error.message, /索引名 group_dict 重复/);
            return true;
        });

        const languageField = new ExcelJS.Workbook();
        AddSheet(languageField, '等级', 'HeroLevelData', [
            { name: 'id', type: 'int', rule: '$key$index_dict(name_dict, title)' },
            { name: 'title', type: 'lang' },
        ], [[1, '标题']]);
        await languageField.xlsx.writeFile(workbookPath);
        await assert.rejects(ExportExcelConfigs(paths), (_error: unknown) => {
            assert.ok(_error instanceof ConfigExportAggregateError);
            assert.match(_error.message, /不能使用多语言字段：title/);
            return true;
        });
        await assert.rejects(fs.access(paths.outputZipPath));
    });
});

test('removes an index file after its rule is deleted', async () => {
    await InTempDirectory('excel-exporter-index-stale-', async (root) => {
        const paths = OutputPaths(root);
        await fs.mkdir(paths.inputDirectory, { recursive: true });
        const workbookPath = path.join(paths.inputDirectory, 'Hero.xlsx');
        const workbook = new ExcelJS.Workbook();
        AddSheet(workbook, '等级', 'HeroLevelData', [
            { name: 'id', type: 'int', rule: '$key$index_dict(id_dict, id)' },
        ], [[1]]);
        await workbook.xlsx.writeFile(workbookPath);
        await ExportExcelConfigs(paths);
        const indexPath = path.join(paths.jsonOutputDirectory, 'HeroLevelDataIndex.json');
        assert.match(await fs.readFile(indexPath, 'utf8'), /"id_dict"/);

        workbook.getWorksheet('等级')!.getCell(6, 2).value = '$key';
        await workbook.xlsx.writeFile(workbookPath);
        await ExportExcelConfigs(paths);
        await assert.rejects(fs.access(indexPath));
        const zip = await JSZip.loadAsync(await fs.readFile(paths.outputZipPath));
        assert.equal(zip.file('HeroLevelDataIndex.json'), null);
        assert.doesNotMatch(await fs.readFile(path.join(paths.typesOutputDirectory, 'HeroLevelData.ts'), 'utf8'), /IHeroLevelDataIndex/);
    });
});

test('exports lang fields as GameLangData ids', async () => {
    await InTempDirectory('excel-exporter-lang-prefix-', async (root) => {
        const paths = OutputPaths(root);
        await fs.mkdir(paths.inputDirectory, { recursive: true });
        const workbook = new ExcelJS.Workbook();
        AddSheet(workbook, '程序多语言', 'CommonLangData', [
            { name: 'id', type: 'int', rule: '$key' },
            { name: 'chs', type: 'string' },
            { name: 'eng', type: 'string' },
        ], [
            [5, '英雄数量：{count}', 'hero count:{count}'],
            [100001, '占位', 'reserved'],
        ]);
        AddSheet(workbook, '游戏多语言', 'GameLangData', [
            { name: 'id', type: 'int', rule: '$key' },
            { name: 'raw', type: 'string' },
            { name: 'chs', type: 'string' },
            { name: 'eng', type: 'string' },
        ], [
            [1, '$Lang$标题', '标题', 'Title'],
            [2, '$Lang$过期文案', '过期文案', 'Gone'],
            [3, '甲', '甲', 'First'],
            [4, '再过期', '再过期', 'AlsoGone'],
            [6, '第三过期', '第三过期', 'Third'],
            [7, '第四过期', '第四过期', 'Fourth'],
        ]);
        AddSheet(workbook, '等级', 'HeroLevelData', [
            { name: 'id', type: 'int', rule: '$key' },
            { name: 'title', type: 'lang' },
            { name: 'tags', type: 'lang_list' },
        ], [[1, '标题', '甲//乙']]);
        const workbookPath = path.join(paths.inputDirectory, 'Hero.xlsx');
        await workbook.xlsx.writeFile(workbookPath);
        await assert.rejects(ExportExcelConfigs(paths), (_error: unknown) => {
            assert.ok(_error instanceof ConfigExportAggregateError);
            assert.match(_error.message, /翻译表中找不到原文：乙/);
            assert.match(_error.message, /请先收集多语言/);
            return true;
        });

        const prefixed = new ExcelJS.Workbook();
        AddSheet(prefixed, '游戏多语言', 'GameLangData', [
            { name: 'id', type: 'int', rule: '$key' },
            { name: 'raw', type: 'string' },
            { name: 'chs', type: 'string' },
        ], [[12, '$Lang$标题', '标题']]);
        AddSheet(prefixed, '等级', 'HeroLevelData', [
            { name: 'id', type: 'int', rule: '$key' },
            { name: 'title', type: 'lang' },
        ], [[1, '$Lang$标题']]);
        const prefixedDirectory = path.join(root, 'prefixed-only');
        await fs.mkdir(prefixedDirectory, { recursive: true });
        await prefixed.xlsx.writeFile(path.join(prefixedDirectory, 'Prefixed.xlsx'));
        await ExportExcelConfigs({
            ...paths,
            inputDirectory: path.join(root, 'prefixed-only'),
            outputZipPath: path.join(root, 'prefixed.zip'),
            typesOutputDirectory: path.join(root, 'prefixed-types'),
            jsonOutputDirectory: path.join(root, 'prefixed-json'),
        });
        assert.deepEqual(await ReadEntry(path.join(root, 'prefixed.zip'), 'HeroLevelData.json'), [
            { id: 1, title: 12 },
        ]);

        const overlap = new ExcelJS.Workbook();
        AddSheet(overlap, '程序多语言', 'CommonLangData', [
            { name: 'id', type: 'int', rule: '$key' },
            { name: 'chs', type: 'string' },
        ], [[8, '程序文案']]);
        AddSheet(overlap, '游戏多语言', 'GameLangData', [
            { name: 'id', type: 'int', rule: '$key' },
            { name: 'raw', type: 'string' },
            { name: 'chs', type: 'string' },
        ], [[8, '标题', '标题']]);
        AddSheet(overlap, '等级', 'HeroLevelData', [
            { name: 'id', type: 'int', rule: '$key' },
            { name: 'title', type: 'lang' },
        ], [[1, '标题']]);
        await fs.mkdir(path.join(root, 'overlap'), { recursive: true });
        await overlap.xlsx.writeFile(path.join(root, 'overlap', 'Overlap.xlsx'));
        await assert.rejects(ExportExcelConfigs({
            ...paths,
            inputDirectory: path.join(root, 'overlap'),
            outputZipPath: path.join(root, 'overlap.zip'),
            typesOutputDirectory: path.join(root, 'overlap-types'),
            jsonOutputDirectory: path.join(root, 'overlap-json'),
        }), (_error: unknown) => {
            assert.ok(_error instanceof Error);
            assert.match(_error.message, /id 重复：8/);
            return true;
        });

        const assetsDirectory = path.join(root, 'assets');
        await fs.mkdir(assetsDirectory, { recursive: true });
        await fs.writeFile(path.join(assetsDirectory, 'Sample.prefab'), JSON.stringify([
            { _string: '$Lang$预制文案' },
            { _string: '<color=#ff0000>文案未翻译</color> $Lang$预制富文本' },
        ]));
        const written = await CollectLangTexts(paths.inputDirectory, assetsDirectory);
        assert.deepEqual(written.map((_row) => _row.raw), [
            '$Lang$标题',
            '$Lang$甲',
            '$Lang$乙',
            '$Lang$预制富文本',
            '$Lang$预制文案',
        ]);
        assert.deepEqual(written.map((_row) => _row.id), [1, 3, 100002, 100003, 100004]);
        await ExportExcelConfigs(paths);
        assert.deepEqual(await ReadEntry(paths.outputZipPath, 'HeroLevelData.json'), [
            { id: 1, title: 1, tags: [3, 100002] },
        ]);
        assert.match(await fs.readFile(path.join(paths.typesOutputDirectory, 'HeroLevelData.ts'), 'utf8'), /title\?: number;/);
        const gameLang = await ReadEntry(paths.outputZipPath, 'GameLangData_chs.json') as Array<{ id: number; raw: string; text?: string }>;
        assert.deepEqual(gameLang.map((_row) => _row.raw), written.map((_row) => _row.raw));
        assert.equal(gameLang.find((_row) => _row.raw === '$Lang$乙')?.text, '乙');
        assert.equal(gameLang.find((_row) => _row.raw === '$Lang$预制文案')?.text, '预制文案');
        assert.equal(gameLang.some((_row) => _row.raw === '过期文案'), false);
        const gameEng = await ReadEntry(paths.outputZipPath, 'GameLangData_eng.json') as Array<{ id: number; text: string }>;
        assert.deepEqual(gameEng, [
            { id: 1, text: 'Title' },
            { id: 3, text: 'First' },
        ]);
        const commonLang = await ReadEntry(paths.outputZipPath, 'CommonLangData_chs.json') as Array<{ id: number; text?: string }>;
        assert.deepEqual(commonLang, [
            { id: 5, text: '英雄数量：{count}' },
            { id: 100001, text: '占位' },
        ]);
        const commonEng = await ReadEntry(paths.outputZipPath, 'CommonLangData_eng.json') as Array<{ id: number; text: string }>;
        assert.deepEqual(commonEng, [
            { id: 5, text: 'hero count:{count}' },
            { id: 100001, text: 'reserved' },
        ]);
        const langZip = await JSZip.loadAsync(await fs.readFile(paths.outputZipPath));
        assert.equal(langZip.file('GameLangData.json'), null);
        assert.equal(langZip.file('CommonLangData.json'), null);
        await assert.rejects(fs.access(path.join(paths.typesOutputDirectory, 'GameLangData.ts')));
        const saved = new ExcelJS.Workbook();
        await saved.xlsx.readFile(workbookPath);
        const gameSheet = saved.getWorksheet('游戏多语言');
        assert.ok(gameSheet);
        assert.equal(gameSheet.getCell(7, 2).value, 1);
        assert.equal(gameSheet.getCell(7, 3).value, '$Lang$标题');
        assert.equal(gameSheet.getCell(11, 3).value, '$Lang$预制文案');
        assert.equal(gameSheet.getCell(12, 2).value, null);
        const commonSheet = saved.getWorksheet('程序多语言');
        assert.ok(commonSheet);
        assert.equal(commonSheet.getCell(7, 2).value, 5);
        assert.equal(commonSheet.getCell(7, 3).value, '英雄数量：{count}');

        const levelSheet = saved.getWorksheet('等级');
        assert.ok(levelSheet);
        levelSheet.getCell(7, 4).value = '甲//乙//啊';
        await saved.xlsx.writeFile(workbookPath);
        const again = await CollectLangTexts(paths.inputDirectory, assetsDirectory);
        assert.deepEqual(again.map((_row) => ({ id: _row.id, raw: _row.raw })), [
            { id: 100005, raw: '$Lang$啊' },
            { id: 1, raw: '$Lang$标题' },
            { id: 3, raw: '$Lang$甲' },
            { id: 100002, raw: '$Lang$乙' },
            { id: 100003, raw: '$Lang$预制富文本' },
            { id: 100004, raw: '$Lang$预制文案' },
        ]);
    });
});
