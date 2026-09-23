# 配置表

`excel/` 是当前客户端配置的 Excel 来源。导表工具扫描子目录中的 `.xlsx`，
按工作表 A4 的逻辑表名将各表放入 `assets/resources/ConfigForClient.zip`
根目录，并在 `assets/script/Config/Typings/` 为每张表生成一个接口文件。
例如 A4 为 `ItemData` 的工作表会成为 ZIP 内的 `ItemData.json`。
同名工作表合并为一张表；Excel 子目录不映射到 ZIP 路径。

例如 `ItemData.ts` 导出 `IItemData`，`fishing_tbl.ts` 导出 `IFishingTbl`。
生成脚本位于 `tools/excel-exporter/src/type-generator.ts`，导表时会自动执行。

Windows 下双击 `tools/导出配置表.bat` 即可导出，无需另装 Node.js。
开发环境可在项目根目录运行 `npm run config:check` 或
`npm run config:export`。表格式、规则和命令参数见
`tools/excel-exporter/README.md`。

不要提交 Excel 自动生成的 `~$*.xlsx` 临时文件。
