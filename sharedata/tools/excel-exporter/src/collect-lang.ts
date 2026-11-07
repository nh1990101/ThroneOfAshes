import path from 'node:path';
import { RewriteGameLangEntries, type AddedLangRow } from './lang-ids.js';
import { ReadConfigWorkbooks } from './workbook-reader.js';

export async function CollectLangTexts(_inputDirectory: string, _assetsDirectory: string): Promise<AddedLangRow[]> {
    const { tables } = await ReadConfigWorkbooks(_inputDirectory);
    return RewriteGameLangEntries(tables, _assetsDirectory, true);
}

export async function RunCollectLang(): Promise<void> {
    const inputDirectory = path.resolve('sharedata/excel');
    const assetsDirectory = path.resolve('assets');
    const written = await CollectLangTexts(inputDirectory, assetsDirectory);
    if (written.length === 0) {
        console.log('没有多语言原文。');
        return;
    }
    console.log(`写入 GameLangData ${written.length} 条：`);
    for (const item of written) {
        console.log(`  ${item.id} ${item.raw}`);
    }
}
