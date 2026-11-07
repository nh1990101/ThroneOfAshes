import { _decorator, Asset, Component, JsonAsset, loader, Node, resources } from 'cc';
import { DEBUG } from 'cc/env';
import { AssetMgr } from '../Common/AssetMgr';
import { IStringChTbl } from './Typings/string_ch_tbl';
import { IFunctionPropTbl } from './Typings/function_prop_tbl';
import { IUnitData, IUnitDataIndex } from './Typings/UnitData';
import { IHeroData } from './Typings/HeroData';
import { IBuildTypeData } from './Typings/BuildTypeData';
import { IBuildLevelData } from './Typings/BuildLevelData';
import { IGarrisonTypeData } from './Typings/GarrisonTypeData';
import { IFactionData } from './Typings/FactionData';
import { IIconData } from './Typings/IconData';
import { IAttributeData } from './Typings/AttributeData';
import { IUnitStarData } from './Typings/UnitStarData';
import { IHeroLevelData } from './Typings/HeroLevelData';
import { ISoldierData, ISoldierDataIndex } from './Typings/SoldierData';
import { ISoldierLevelData } from './Typings/SoldierLevelData';
import { ISoldierLvAttrData, ISoldierLvAttrDataIndex } from './Typings/SoldierLvAttrData';
import { IUnitAttrData } from './Typings/UnitAttrData';
import { IItemData } from './Typings/ItemData';
import { IBagPageData } from './Typings/BagPageData';
import { IItemTypeData } from './Typings/ItemTypeData';
import { IQualityData } from './Typings/QualityData';
import { ISkillData, ISkillDataIndex } from './Typings/SkillData';
import { BattleMapConfig } from '../GamePlay/Battle/BattleMapConfig';
import type { ISKILL_CONFIG, SKILL_ACTION } from '../GamePlay/Battle/SkillMgr';
import { GameUrl } from '../Common/GameUrl';
import { IMapConfig, MapConfig } from '../GamePlay/WildMap/MapConfig';
import { IParamData } from './Typings/ParamData';
import { ParamDefined, ParamValueType, UNIT_ACTION } from '../Common/GameEnum';
import { IAutoTriggerData, IAutoTriggerDataIndex } from './Typings/AutoTriggerData';
import { ISpecialEventsData } from './Typings/SpecialEventsData';
import { IMapResourcesData } from './Typings/MapResourcesData';
import { ISelectEventsData, ISelectEventsDataIndex } from './Typings/SelectEventsData';
import { ITransactionEventsData, ITransactionEventsDataIndex } from './Typings/TransactionEventsData';
import { LangMgr } from '../Common/LangMgr';
import { IDropData, IDropDataIndex } from './Typings/DropData';
import { IStageData, IStageDataIndex } from './Typings/StageData';
import { IMapData } from './Typings/MapData';
import { IMonsterAttrData, IMonsterAttrDataIndex } from './Typings/MonsterAttrData';
import { IUnitRareData } from './Typings/UnitRareData';
import { IDeployGridData } from './Typings/DeployGridData';
import { IOutputData } from './Typings/OutputData';
import { ITreasureData } from './Typings/TreasureData';
import { ITreasureScoreData } from './Typings/TreasureScoreData';
import { IDrawPoolData } from './Typings/DrawPoolData';
import { IDrawRewardData } from './Typings/DrawRewardData';
import { IFeatureData } from './Typings/FeatureData';
import { INavigateData } from './Typings/NavigateData';
import { IMainUISideBtnData } from './Typings/MainUISideBtnData';
import { IUnitRandomData, IUnitRandomDataIndex } from './Typings/UnitRandomData';
import { ITechTypeData } from './Typings/TechTypeData';
import { IMagicTechData } from './Typings/MagicTechData';
import { ITechLevelData } from './Typings/TechLevelData';
import { IChapterData } from './Typings/ChapterData';
import { ITechOutputData } from './Typings/TechOutputData';
import { ITechBattleData } from './Typings/TechBattleData';
import { IFightAttrData } from './Typings/FightAttrData';
import { IUnitScopeData } from './Typings/UnitScopeData';
import { ISceneData } from './Typings/SceneData';
import { IHeroLvAttrData, IHeroLvAttrDataIndex } from './Typings/HeroLvAttrData';
import { IBarracksRecruitData } from './Typings/BarracksRecruitData';
import { IMarketTypeData } from './Typings/MarketTypeData';
import { IMarketSlotData, IMarketSlotDataIndex } from './Typings/MarketSlotData';
import { IMarketGoodsData, IMarketGoodsDataIndex } from './Typings/MarketGoodsData';
import { IEquipData } from './Typings/EquipData';
import { IEquipStrData } from './Typings/EquipStrData';
import { IEquipStarData } from './Typings/EquipStarData';
import { IEquipAttrData } from './Typings/EquipAttrData';
import { IEquipPosData } from './Typings/EquipPosData';
import { IEquipSuitData } from './Typings/EquipSuitData';
import { IEquipSuitAttrData } from './Typings/EquipSuitAttrData';
import { IServerNoticeData } from './Typings/ServerNoticeData';


const { ccclass, property } = _decorator;


;

export class ConfigMgr {
    private zip: JSZip = null;
    private static _instance: ConfigMgr;
    public battleMapConfig: BattleMapConfig;
    public wildMapConfig: Map<number, MapConfig>;
    /** 技能表现配置，按编辑器保存的技能 ID 索引。 */
    public skillConfig: Map<string, ISKILL_CONFIG>;

    public string_ch_tbl = new Map<number, IStringChTbl>();
    public string_ch_tb2 = new Map<number, IStringChTbl>();
    public function_prop_tbl = new Map<number, IFunctionPropTbl>();
    public UnitData = new Map<number, IUnitData>();
    public UnitDataIndex: IUnitDataIndex;
    public HeroData = new Map<number, IHeroData>();
    /** 建筑类型 */
    public BuildTypeData = new Map<number, IBuildTypeData>();
    /** 建筑等级，按行 id 索引 */
    public BuildLevelData = new Map<number, IBuildLevelData>();
    /** 驻守效果类型 */
    public GarrisonTypeData = new Map<number, IGarrisonTypeData>();
    public FactionData = new Map<number, IFactionData>();
    public IconData = new Map<number, IIconData>();
    /** 属性表，id 是属性名 */
    public AttributeData = new Map<string, IAttributeData>();
    /** 单位稀有度 */
    public UnitRareData = new Map<number, IUnitRareData>();
    /** 单位星级，一行是一档品质 */
    public UnitStarData = new Map<number, IUnitStarData>();
    /**全局参数表 */
    public ParamData = new Map<string, IParamData>();
    /**地图资源物品交互表 */
    public MapResourcesData = new Map<number, IMapResourcesData>();
    /**自动触发表 */
    public AutoTriggerData = new Map<number, IAutoTriggerData>();
    public AutoTriggerDataIndex: IAutoTriggerDataIndex;
    /**选择事件表 */
    public SelectEventsData = new Map<number, ISelectEventsData>();
    public SelectEventsDataIndex: ISelectEventsDataIndex;
    /**交易事件表 */
    public TransactionEventsData = new Map<number, ITransactionEventsData>();
    public TransactionEventsDataIndex: ITransactionEventsDataIndex;
    /**特殊事件表 */
    public SpecialEventsData = new Map<number, ISpecialEventsData>();
    /**主线关卡表 */
    public StageData = new Map<number, IStageData>();
    public StageDataIndex: IStageDataIndex;
    public ChapterData = new Map<number, IChapterData>();
    /**副本表 */
    public MapData = new Map<number, IMapData>();
    /**副本属性表 */
    public MonsterAttrData = new Map<number, IMonsterAttrData>();
    public MonsterAttrDataIndex: IMonsterAttrDataIndex;
    /**单位属性表 */
    public UnitAttrData = new Map<number, IUnitAttrData>();
    /**布阵格子 */
    public DeployGridData = new Map<number, IDeployGridData>();

    /** 英雄等级表 */
    public HeroLevelData = new Map<number, IHeroLevelData>();
    public HeroLvAttrData = new Map<number, IHeroLvAttrData>();
    public HeroLvAttrDataIndex: IHeroLvAttrDataIndex;
    /** 士兵表 */
    public SoldierData = new Map<number, ISoldierData>();
    public SoldierDataIndex: ISoldierDataIndex;
    /** 士兵升级消耗，id 是等级 */
    public SoldierLevelData = new Map<number, ISoldierLevelData>();
    /** 士兵等级系数，按 group_id + level_id 取 */
    public SoldierLvAttrData = new Map<number, ISoldierLvAttrData>();
    public SoldierLvAttrDataIndex: ISoldierLvAttrDataIndex;
    public ItemData = new Map<number, IItemData>();
    public EquipData = new Map<number, IEquipData>();
    public EquipStrData = new Map<number, IEquipStrData>();
    public EquipStarData = new Map<number, IEquipStarData>();
    public EquipAttrData = new Map<number, IEquipAttrData>();
    public EquipPosData = new Map<number, IEquipPosData>();
    public EquipSuitData = new Map<number, IEquipSuitData>();
    public EquipSuitAttrData = new Map<number, IEquipSuitAttrData>();
    /** 背包页签 */
    public BagPageData = new Map<number, IBagPageData>();
    /** 物品类型 */
    public ItemTypeData = new Map<number, IItemTypeData>();
    /** 品质框 */
    public QualityData = new Map<number, IQualityData>();
    /** 技能表 */
    public SkillData = new Map<number, ISkillData>();
    /** 技能组、等级到技能 id。group_id -> level -> skill_id */
    public SkillDataIndex: ISkillDataIndex;
    /**掉落表 */
    public DropData: Map<number, IDropData> = new Map<number, IDropData>();
    public DropDataIndex: IDropDataIndex;
    /**产出表 */
    public OutputData: Map<number, IOutputData> = new Map<number, IOutputData>();
    /**宝箱表 */
    public TreasureData = new Map<number, ITreasureData>();
    /**宝箱积分奖励表 */
    public TreasureScoreData = new Map<number, ITreasureScoreData>();
    /** 英雄抽卡卡池 */
    public DrawPoolData = new Map<number, IDrawPoolData>();
    /** 英雄抽卡奖池，按行 id */
    public DrawRewardData = new Map<number, IDrawRewardData>();
    /** 功能解锁，id 是字符串 */
    public FeatureData = new Map<string, IFeatureData>();
    /** 功能跳转，id 是字符串 */
    public NavigateData = new Map<string, INavigateData>();
    /** 主界面左右侧边按钮 */
    public MainUISideBtnData = new Map<number, IMainUISideBtnData>();
    /**暗雷表 */
    public UnitRandomData: Map<number, IUnitRandomData> = new Map();
    public UnitRandomDataIndex: IUnitRandomDataIndex;
    /** 科技分类，魔法塔底栏页签 */
    public TechTypeData = new Map<number, ITechTypeData>();
    /** 科技节点。level 是树的行，sort 是同一行里的顺序 */
    public MagicTechData = new Map<number, IMagicTechData>();
    /** 科技每一级的消耗和耗时 */
    public TechLevelData = new Map<number, ITechLevelData>();
    /** 内政效果 */
    public TechOutputData = new Map<number, ITechOutputData>();
    /** 战争效果 */
    public TechBattleData = new Map<number, ITechBattleData>();
    /** 战斗属性 */
    public FightAttrData = new Map<number, IFightAttrData>();
    /** 科技战争效果的作用范围，unit_types 列出单位类型 */
    public UnitScopeData = new Map<number, IUnitScopeData>();
    /**场景表 */
    public SceneData = new Map<number, ISceneData>();
    /** 兵营招募，一行是一个可招募兵种 */
    public BarracksRecruitData = new Map<number, IBarracksRecruitData>();
    /** 集市商店类型，id 是字符串 */
    public MarketTypeData = new Map<string, IMarketTypeData>();
    /** 集市格子 */
    public MarketSlotData = new Map<string, IMarketSlotData>();
    /** 商店类型到格子。不是 Map，解压时整份赋上来 */
    public MarketSlotDataIndex: IMarketSlotDataIndex;
    /** 集市商品 */
    public MarketGoodsData = new Map<string, IMarketGoodsData>();
    /** 商品组到商品。不是 Map，解压时整份赋上来 */
    public MarketGoodsDataIndex: IMarketGoodsDataIndex;
    /**服务器错误码 */
    public ServerNoticeData = new Map<number, IServerNoticeData>();
    /**主键调整表 
    * 表名：主键字符串
   */
    TABLE_PRIMARY_KEYS: Record<string, string> = {
        function_prop_tbl: "ID",
        unitData_tbl: "id",
        ParamData: "name",
        MapResourcesData: "id",
        AutoTriggerData: "id",
        SelectEventsData: "id",
        TransactionEventsData: "id",
        SpecialEventsData: "id",
        BattleEventsData: "id",
        MapData: "id",
        MonsterAttrData: "id",
        UnitRareData: "id",
        DeployGridData: "id",
        OutputData: "id",
        UnitRandomData: "id",
        ChapterData: "id",
        StageData: "id",
        SceneData: "id",
        FeatureData: "id",
        NavigateData: "id",
        MainUISideBtnData: "id",
        ServerNoticeData: "id",
        // 其他表...
    };

    static get instance(): ConfigMgr {
        if (!this._instance) {
            this._instance = new ConfigMgr;
        }
        return this._instance;
    }
    /**加载战斗地图配置 */
    async loadBattleMapConfig(battleMapId: number) {
        return new Promise<BattleMapConfig>(async (resolve, reject) => {
            try {
                if (this.battleMapConfig) {
                    return Promise.resolve(this.battleMapConfig);
                }
                const file = await new Promise<JsonAsset>((resolve, reject) => {
                    AssetMgr.remoteBundle.load(GameUrl.BattleMapConfig.format(battleMapId), JsonAsset, (error, assets) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(assets);
                        }
                    });
                });

                const obj = file.json;
                this.battleMapConfig = obj as BattleMapConfig;
                resolve(this.battleMapConfig);
            } catch (error) {
                console.error("Config load failed:", error);
                reject(error);
            }
        });
    }
    /** 加载 remote Bundle 中 Res/Config/Skill 目录下的全部技能配置。 */
    async loadSkillConfig(): Promise<Map<string, ISKILL_CONFIG>> {
        try {
            if (this.skillConfig) {
                return Promise.resolve(this.skillConfig);
            }
            const bundle = AssetMgr.remoteBundle;
            if (!bundle) {
                throw new Error('加载技能配置前，请先初始化 remote Bundle');
            }
            const files = await new Promise<JsonAsset[]>((resolve, reject) => {
                bundle.loadDir('Res/Config/Skill', JsonAsset, (error, assets) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(assets);
                    }
                });
            });
            const configs = new Map<string, ISKILL_CONFIG>();
            const legacyActions = { idle: UNIT_ACTION.IDLE, move: UNIT_ACTION.MOVE, hit: UNIT_ACTION.BE_HIT, dead: UNIT_ACTION.DEAD, attack: UNIT_ACTION.ATTACK } as const;
            const validActions = new Set<number>([UNIT_ACTION.IDLE, UNIT_ACTION.MOVE, UNIT_ACTION.BE_HIT, UNIT_ACTION.DEAD, UNIT_ACTION.ATTACK]);
            for (const file of files) {
                const obj = file.json as ISKILL_CONFIG;
                if (!obj || obj.format !== 'RPGCore.SkillPresentation' || obj.schemaVersion !== 1
                    || typeof obj.skillId !== 'string' || !obj.skillId.trim() || obj.skillId !== obj.skillId.trim()
                    || !Array.isArray(obj.tracks) || !obj.resolved || !Array.isArray(obj.resolved.nodes)
                    || !Number.isFinite(obj.resolved.durationMs) || !Number.isFinite(obj.resolved.damagePercentTotal)) {
                    throw new Error(`技能配置格式无效：Res/Config/Skill/${file.name}`);
                }
                for (const node of obj.resolved.nodes) {
                    if (!node || typeof node.trackId !== 'string' || !node.trackId
                        || !Number.isFinite(node.startMs) || !Number.isFinite(node.durationMs)
                        || (node.damagePercent !== undefined && !Number.isFinite(node.damagePercent))) {
                        throw new Error(`技能结算节点格式无效：Res/Config/Skill/${file.name}`);
                    }
                }
                if (configs.has(obj.skillId)) {
                    throw new Error(`技能配置 ID 重复：${obj.skillId}（Res/Config/Skill/${file.name}）`);
                }
                // 旧编辑器保存的字符串动作转换为游戏枚举，保留原 JsonAsset 数据不变。
                const tracks = obj.tracks.map(track => {
                    if (track.type !== 'caster' && track.type !== 'target') return track;
                    const rawAction: unknown = track.params?.action;
                    const action = typeof rawAction === 'string' ? legacyActions[rawAction as keyof typeof legacyActions] : rawAction;
                    if (typeof action !== 'number' || !validActions.has(action)) {
                        throw new Error(`技能角色动作无效：Res/Config/Skill/${file.name}，轨道 ${track.id}`);
                    }
                    return { ...track, params: { ...track.params, action: action as SKILL_ACTION } };
                });
                configs.set(obj.skillId, { ...obj, tracks });
            }
            this.skillConfig = configs;
            return Promise.resolve(this.skillConfig);
        } catch (error) {
            console.error('Skill config load failed:', error);
            Promise.resolve(this.skillConfig);
            throw error;
        }
    }
    /**
    *加载野外地图
    **/
    async loadWildMapConfig(mapId: number) {
        return new Promise<void>((resolve, reject) => {
            try {
                if (!this.wildMapConfig) {
                    this.wildMapConfig = new Map<number, MapConfig>();
                }
                if (!this.wildMapConfig.get(mapId)) {
                    var sceneCfg = ConfigMgr.instance.SceneData.get(mapId);
                    if (sceneCfg) {
                        AssetMgr.getResByBundle(sceneCfg.res_path, JsonAsset).then((file: JsonAsset) => {
                            const obj = file.json;
                            this.wildMapConfig.set(mapId, new MapConfig(obj as IMapConfig));
                            resolve();
                        });
                    } else {
                        console.error("Config load failed:", mapId);
                        reject();
                    }
                } else {
                    resolve();
                }
            } catch (error) {
                console.error("Config load failed:", error);
                reject(error);
            }
        });
    }
    async loadConfigZip() {
        return new Promise<void>(async (resolve, reject) => {
            try {
                let file: Asset;
                file = await this.loadResourceFile("ConfigForClient");
                // if (DEBUG) {
                //     // await this.loadGuideConfig();

                //     file = await this.loadResourceFile("ConfigForClient");
                // } else {
                //     file = await AssetMgr.getRemoteResByUrl(AssetMgr.getConfigUrl(), Asset, ".zip");
                // }

                await this.unzip(file);
                resolve();
            } catch (error) {
                console.error("Config load failed:", error);
                reject(error);
            }
        });
    }

    async loadResourceFile<T extends Asset>(path: string): Promise<T> {
        return new Promise((resolve, reject) => {
            resources.load(path, Asset, (err, asset: T) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(asset);
                }
            });
        });
    }


    successDownConfig(file: Asset) {
        if (file) {
            // this.lb_notice.string = "解压中...";
            console.log("解压中")
            this.unzip(file);
        } else {
            console.log("下载失败")
            // this.lb_notice.string = "下载失败";
        }
    }

    private async unzip(file: Asset) {

        try {
            // 读取ZIP二进制数据
            //const arrayBuffer = await this.readFileAsArrayBuffer(file);
            const arrayBuffer = await this.loadFileArrayBuffer(file);

            // 初始化JSZip
            this.zip = new JSZip();
            await this.zip.loadAsync(arrayBuffer);

            // 获取ZIP内文件列表
            const files = Object.keys(this.zip.files);
            const language = LangMgr.getInstance().getLanguage();
            let chsCommonRows: object[] | null = null;
            let chsGameRows: object[] | null = null;
            let langCommonRows: object[] | null = null;
            let langGameRows: object[] | null = null;

            //解释并赋值配置
            while (files.length > 0) {
                const tableName = files.shift();
                if (this.zip.files[tableName].dir) {
                    continue;
                }
                const fileName = tableName.split('/').pop() ?? tableName;
                const langPack = fileName.match(/^(CommonLangData|GameLangData)_([A-Za-z0-9_]+)\.json$/);
                if (langPack) {
                    const lang = langPack[2];
                    if (lang !== 'chs' && lang !== language) {
                        continue;
                    }
                    const content = await this.zip.file(tableName).async('text');
                    const obj = JSON.parse(content);
                    if (!Array.isArray(obj)) {
                        continue;
                    }
                    const isCommon = langPack[1] === 'CommonLangData';
                    if (lang === 'chs') {
                        if (isCommon) {
                            chsCommonRows = obj;
                        } else {
                            chsGameRows = obj;
                        }
                    } else if (isCommon) {
                        langCommonRows = obj;
                    } else {
                        langGameRows = obj;
                    }
                    continue;
                }
                const content = await this.zip.file(tableName).async('text');
                const obj = JSON.parse(content)
                let proName = tableName.replace(/\.[^/.]+$/, "");
                if (this[proName] instanceof Map) {

                    let firstKey = this.TABLE_PRIMARY_KEYS[proName]
                    if (!firstKey) {
                        firstKey = Object.keys(obj[0])[0];
                    }

                    this[proName] = new Map(obj.map(item => [item[firstKey], item]));
                }
                else {

                    this[proName] = obj;
                }

            }
            LangMgr.getInstance().setTables(chsCommonRows, chsGameRows, langCommonRows, langGameRows);
            LangMgr.getInstance().replaceConfig(this);
            this.afterConfigInit();
        } catch (error) {

            console.error(error);
        }
    }
    private loadFileArrayBuffer(file: Asset): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            loader.load({ url: file.nativeUrl, type: "binary" }, (err, data) => {
                err ? reject(err) : resolve(data);
            });
        });
    }

    private readFileAsArrayBuffer(file: Asset): Promise<ArrayBuffer> {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', file.nativeUrl, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = () => resolve(xhr.response);
            xhr.send();
        });
    }
    /**配置初始化后马上执行的函数 */
    private afterConfigInit() {
        // CondictionMgr.getInstance().config = this.condition_tbl;
    }
    /**
     * 获取通过字符串获取表名
     * @param configName 
     * @returns 
     */
    public GetConfigByName(configName: string) {
        return this[configName];
    }
    /**
     * 获取全局参数表
     * @param param 
     * @returns 
     */
    public getParam(param: ParamDefined, valueType: ParamValueType) {
        var paramData = this.ParamData.get(param.toString());
        if (paramData) {
            return valueType == ParamValueType.INT ? paramData.parm : paramData.parm_f;
        }
        return null;
    }
}


