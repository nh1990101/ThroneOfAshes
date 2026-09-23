# Excel Exporter

把 `sharedata/excel/` 下的 `.xlsx` 导出为当前客户端加载的
`assets/resources/ConfigForClient.zip`，并生成表类型。

策划电脑直接双击 `sharedata/tools/导出配置表.bat`。运行所需的 Node.js、
Excel 解析库及其他依赖均已随工具放在 `sharedata/tools/`，不需要安装 Node.js、
pnpm、Cursor 或 Cocos Creator。

当前阶段支持：

- 扫描子目录内的 `.xlsx`，忽略临时文件和以 `#` 开头的工作表。
- 按工作表 A4 的逻辑表名生成 ZIP 根目录中的 `<表名>.json`；
  Excel 子目录不进入 ZIP。
- 合并同一逻辑表的多个 Sheet，并检查字段定义一致性。
- 支持主键、唯一、必填校验，以及基础、列表和 JSON 类型。
- 全部工作簿通过解析与校验后才开始写文件；重复导出产物稳定。

## 表结构

| 行 | A 列 | B 列及以后 |
| --- | --- | --- |
| 3 | 可留空 | 字段说明 |
| 4 | 逻辑表名 | 字段名 |
| 5 | 可留空 | 字段类型 |
| 6 | 可留空 | 校验规则 |
| 7 起 | 可留空 | 配置数据 |

工作表名以 `#` 开头时忽略。字段从 B 列开始，遇到第一个空字段名结束。

### 字段类型

兼容 r1p 的 `string`、`lang`、`int`、`float`、`bool` 以及
`string_list`、`lang_list`、`int_list`、`float_list`、`bool_list`；同时支持
`string[]`、`int[]`、`float[]`、`bool[]`、`json`、`json[]`。

在标量类型后添加 `?` 表示允许空值，例如 `int?`、`bool?`、`json?`。列表可以填写严格 JSON 数组，也可以使用 `//` 分隔，例如 `1//2//3`。未声明可空的非必填字段为空时，不写入该字段；可空标量写入 `null`。单元格整体填写“待配置”（允许首尾空格）时按空值处理；如果该列声明了 `$key`、`$required` 或 `$no_empty`，仍会按必填字段报错。

### 校验规则

- `$key`：主键，同时代表必填和唯一。
- `$uniq` / `$unique`：字段值不可重复。
- `$no_empty` / `$required`：字段不可为空。
- `$ignore`：校验输入，但不写入导出结果。
- `$ref(Table)`、`$ref_group(Table)`、`$ref_count(Table)`、`$ref_args(Table)`、`$ref_args_str(Table)`：按原表规则检查并转换跨表引用。
- `$size(field)`：要求两个列表字段长度一致。

同一单元格内可以组合规则，例如 `$key$required`。每张逻辑表必须且只能有一个主键。

## 命令

```bash
npm run config:check
npm run config:export
npm run config:verify
```

`config:check` 只检查，不写文件。默认输入目录是 `sharedata/excel/`，
默认输出是 `assets/resources/ConfigForClient.zip` 和
`assets/script/Config/Typings/<表名>.ts`。CLI 支持
`--input <目录>`、`--output-zip <文件>`、`--types-output <目录>`、`--check`。

## 表结构脚本

`src/type-generator.ts` 负责逐表生成 TypeScript 接口，随导表自动执行。
例如 `ItemData.json` 对应 `Typings/ItemData.ts` 和 `IItemData`；
`fishing_tbl.json` 对应 `Typings/fishing_tbl.ts` 和 `IFishingTbl`。
类型按引用转换后的数据生成，数组使用 `number[]` 等写法，
允许省略的字段带 `?`。每个新文件同时生成 Cocos `.meta`，已有 UUID 会保留。

新表直接生成到 `Typings/`，当前未迁移的旧表结构保留，
供目前保持原样的 `ConfigMgr` 使用。删除某张 Excel 表后，导表工具会清理
`Typings/` 内由它生成的同名过期接口，不会删除原有旧表结构或手写文件。
导出的 JSON 都位于 ZIP 根目录，兼容现有按文件名挂表的加载方式。

发布版仍从现有远端 `ConfigForClient.zip` 地址下载；导表工具只更新项目资源文件。
发布时需沿用原有流程把新 ZIP 放到该地址，仅打包到 `resources` 不会替代远端文件。
