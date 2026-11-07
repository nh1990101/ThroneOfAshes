# Excel Exporter

把 `sharedata/excel/` 下的 `.xlsx` 导出为当前客户端加载的
`assets/resources/ConfigForClient.zip`，并把同样的 JSON 写到
`sharedata/json/`，同时生成表类型。

策划电脑直接双击 `sharedata/tools/导出配置表.bat`。运行所需的 Node.js、
Excel 解析库及其他依赖均已随工具放在 `sharedata/tools/`，不需要安装 Node.js、
pnpm、Cursor 或 Cocos Creator。

当前阶段支持：

- 扫描子目录内的 `.xlsx`，忽略临时文件和以 `#` 开头的工作表。
- 按工作表 A4 的逻辑表名生成 ZIP 根目录中的 `<表名>.json`，
  并在 `sharedata/json/` 写出同内容的文件，方便直接打开查看。
  Excel 子目录不进入 ZIP，也不进入 `json/`。
- 某张表从 Excel 删除后，会删掉 `json/` 里对应的过期 JSON；该目录中的其他文件会保留。
- 合并同一逻辑表的多个 Sheet，按字段名取并集，并检查同名字段的类型一致性。
- 支持主键、唯一、必填校验，以及基础、列表和 JSON 类型。
- 支持 `$index_dict` 和 `$index_array`，把索引写到 `表名Index.json`。
- 全部工作簿通过解析与校验后才开始写文件；重复导出产物稳定。

## 表结构

| 行 | A 列 | B 列及以后 |
| --- | --- | --- |
| 3 | 可留空 | 字段说明 |
| 4 | 逻辑表名 | 字段名 |
| 5 | 可留空 | 字段类型 |
| 6 | 可留空 | 校验规则 |
| 7 起 | 可留空 | 配置数据 |

工作表名以 `#` 开头时忽略。字段从 B 列开始，跳过第 4 行字段名为空的列，继续读取右侧字段；只有说明、没有字段名的列不导出。同一逻辑表的拆分 Sheet 可以缺少非必填字段，某行没有填写的字段不补默认值。

### 字段类型

兼容 `string`、`lang`、`int`、`float`、`bool` 以及
`string_list`、`lang_list`、`int_list`、`float_list`、`bool_list`；同时支持
`string[]`、`int[]`、`float[]`、`bool[]`、`json`、`json[]`。
`lang` 和 `lang_list` 在 Excel 里直接填写原文，不需要 `$Lang$`。导出时按 `GameLangData.raw` 换成 id，程序用 `lang(id)` 取当前语言。单元格如果还带着 `$Lang$`，导表时会先去掉再匹配。`CommonLangData` 和 `GameLangData` 不会整表进包，而是按语言列拆成 `表名_语言.json`，例如 `GameLangData_chs.json`、`GameLangData_eng.json`。中文包带全部 id，`GameLangData_chs.json` 还带 `raw`。其它语言包只保留该列有字的行。运行时只解析当前语言和中文，缺的译文回退中文。翻译表里没有的原文不会在导表时自动补上，导表会失败。补原文请双击 `sharedata/tools/收集多语言.bat`：它扫描各表的 `lang` 字段，以及 `assets` 下预制体里的 `$Lang$`，然后清空 `GameLangData` 的数据行再整表写回。已经在表里的原文保持原来的 `id`，新原文从现有最大 `id` 的下一个开始编，且不小于 100001，并避开 `CommonLangData` 已用的 `id`。删掉的原文空出来的 `id` 不会再发给新原文。`raw` 保留 `$Lang$` 前缀，`chs` 是去掉前缀后的原文，已经翻译过的语言列按原文保留，不再出现的原文会被删掉。`CommonLangData` 是程序自己维护的句子，没有 `raw`，收集工具不会改它。预制体上的文字不会改成 id，运行时仍用 `$Lang$` 识别。收集之后需要再导一次表。收集写表前会先 `svn lock` 这张翻译表；自己已经锁着就直接改，被别人锁着就失败并提示锁定人，不会抢锁。本地表比服务器旧时也无法加锁，需要先更新再收集。翻译表 Excel 正被打开时收集会失败，需要先关掉再运行。两张表的 `id` 不能重复。

在标量类型后添加 `?` 表示允许空值，例如 `int?`、`bool?`、`json?`。列表可以填写严格 JSON 数组，也可以使用 `//` 分隔，例如 `1//2//3`。未声明可空的非必填字段为空时，不写入该字段；可空标量写入 `null`。单元格整体填写“待配置”（允许首尾空格）时按空值处理；如果该列声明了 `$key`、`$required` 或 `$no_empty`，仍会按必填字段报错。

### 校验规则

- `$key`：主键，同时代表必填和唯一。
- `$uniq` / `$unique`：字段值不可重复。
- `$no_empty` / `$required`：字段不可为空。
- `$ignore`：校验输入，但不写入导出结果。
- `ch_key`：中文索引，只给策划填表和 `$ref` 查找用。`$uniq` 等校验仍生效，但不会写入 JSON，也不会出现在生成的接口里。
- `$ref(Table)`、`$ref_group(Table)`、`$ref_count(Table)`、`$ref_args(Table)`、`$ref_args_str(Table)`：按原表规则检查并转换跨表引用。
- `$size(field)`：要求两个列表字段长度一致。
- `$index_dict(索引名, 字段1, 字段2, ...)`：生成 `表名Index.json`。按字段逐层嵌套，最后一层的值是这一行的主键。某一行缺了索引字段，或该格为空，则不进入这个索引。同一条路径有多行时，表里更靠后的行覆盖前面的行。
- `$index_array(索引名, 字段1, ..., 排序字段)`：同样生成 `表名Index.json`。前面的字段用来分组，叶子是主键数组，按最后一个参数做稳定排序。排序字段不参与分组。已进入分组的行，排序字段不能为空。

索引名必须是合法标识符，同一张表里不能重复。索引字段和排序字段必须存在，且不能是多语言、数组、`json`、`ch_key` 或 `$ignore`。没有索引规则的表不会生成 `表名Index.json`。行数据 JSON 仍然只是行数组。`表名Index.json` 会和行数据一起进入 ZIP 与 `sharedata/json/`。类型文件里会追加 `I表名Index`，例如 `IHeroDataIndex`。

同一单元格内可以组合规则，例如 `$key$required`。每张逻辑表必须且只能有一个主键。

## 命令

在项目根目录执行（使用工具自带的 Node.js）：

```powershell
.\sharedata\tools\runtime\node.exe .\sharedata\tools\excel-exporter\dist\excel-exporter.cjs --check
.\sharedata\tools\runtime\node.exe .\sharedata\tools\excel-exporter\dist\excel-exporter.cjs
```

第一条命令只检查，不写文件；第二条导出配置。默认输入目录是 `sharedata/excel/`，
默认输出是 `assets/resources/ConfigForClient.zip`、
`sharedata/json/<表名>.json` 和
`assets/script/Config/Typings/<表名>.ts`。CLI 支持
`--input <目录>`、`--output-zip <文件>`、`--json-output <目录>`、
`--types-output <目录>`、`--check`。

## 表结构脚本

`src/type-generator.ts` 负责逐表生成 TypeScript 接口，随导表自动执行。
例如 `ItemData.json` 对应 `Typings/ItemData.ts` 和 `IItemData`；
`fishing_tbl.json` 对应 `Typings/fishing_tbl.ts` 和 `IFishingTbl`。
类型按引用转换后的数据生成，数组使用 `number[]` 等写法，
允许省略的字段带 `?`。每个新文件同时生成 Cocos `.meta`，已有 UUID 会保留。

新表直接生成到 `Typings/`，当前未迁移的旧表结构保留，
供目前保持原样的 `ConfigMgr` 使用。删除某张 Excel 表后，导表工具会清理
`Typings/` 内由它生成的同名过期接口，不会删除原有旧表结构或手写文件。
导出的 JSON 都位于 ZIP 根目录，`sharedata/json/` 中是同一份内容的散文件，兼容现有按文件名挂表的加载方式。客户端仍只加载 ZIP。

发布版仍从现有远端 `ConfigForClient.zip` 地址下载；导表工具只更新项目资源文件。
发布时需沿用原有流程把新 ZIP 放到该地址，仅打包到 `resources` 不会替代远端文件。
