# Excel 配置表

将 `.xlsx` 放在本目录或业务子目录中。工作表 A4 是导出表名，
例如 `ItemData` 会生成 ZIP 根目录的 `ItemData.json`；同名工作表合并。
子目录仅用于整理 Excel，不影响运行时表名。

表结构和字段规则见 `../tools/excel-exporter/README.md`。
双击 `../tools/导出配置表.bat` 导出，或在项目根目录运行
`npm run config:export`。不要提交 `~$*.xlsx` 临时文件。
