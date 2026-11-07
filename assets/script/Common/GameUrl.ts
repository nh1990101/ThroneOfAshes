import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

/**
 * URL 模板类，支持链式调用格式化
 */
class UrlTemplate {
    constructor(private template: string) { }

    /**
     * 格式化字符串，替换 {0}, {1}, {2} 等占位符
     * @param args 参数列表
     * @returns 格式化后的字符串
     */
    format(...args: any[]): string {
        return this.template.replace(/{(\d+)}/g, (match, index) => {
            return args[index] !== undefined ? args[index] : match;
        });
    }

    /**
     * 获取原始模板字符串
     */
    toString(): string {
        return this.template;
    }
}
export class GameUrl {
    /**
     * 单位帧动画图集
     * 使用方式: ResUrl.UnitAtlasUrl.format(id)
     */
    static UnitAtlasUrl = new UrlTemplate("Res/Battle/UnitResAtlas/{0}");
    /**
     * 公共图集
     */
    static Atlas_Common = "Res/Atlas/CommonUI";
    /**
     * 战斗图集
     */
    static Atlas_Battle = "Res/Atlas/Battle";
    /**
     * 主城图集
     */
    static Atlas_MainCity = "Res/Atlas/MainCity";
    /**
     * 战斗预制体
     */
    static Battle_Prefab = new UrlTemplate("GamePlay/Battle/{0}");

    /**野外地图预制体 */
    static WildMapPrefab = new UrlTemplate("GamePlay/WildMap/{0}");

    /**野外地图地图块 */
    static WildMapBlockUrl = new UrlTemplate("Res/Map/MapGrid/{0}/{1}_{2}/spriteFrame");
    /**野外地图配置 */
    static WildMapConfig = new UrlTemplate("Res/Config/WildMap/map{0}");
    /**战斗地图配置 */
    static BattleMapConfig = new UrlTemplate("Res/Config/BattleMap/BattleMapConfig{0}");
    /**野外地图角色动画 */
    static WildMapRoleAnimation = new UrlTemplate("Res/Wild/RoleAtlas/Role{0}");

    /**基础系统功能预制体 */
    static BaseSystemPrefab = new UrlTemplate("GamePlay/BaseSystem/{0}");

    /**野外图片资源 */
    static Wild_Image = new UrlTemplate("Res/SingleImage/Wild/{0}/spriteFrame");


    /**主界面预制体 */
    static MainCityPrefab = new UrlTemplate("GamePlay/MainCity/{0}");
    /**PVE图片 */
    static PVE_SingleImage_Url = new UrlTemplate("Res/SingleImage/PVEGate/{0}/spriteFrame");
    /**英雄界面预制体 */
    static HeroPrefab = new UrlTemplate("GamePlay/Hero/{0}");
    /**抽卡界面预制体 */
    static DrawPrefab = new UrlTemplate("GamePlay/Draw/{0}");
    /**集市界面预制体 */
    static ShopPrefab = new UrlTemplate("GamePlay/Shop/{0}");
    /**单图 */
    static Single_Image_Url = new UrlTemplate("Res/SingleImage/{0}/spriteFrame");
    /**技能特效序列帧路径 */
    static Skill_Atlas_Url = new UrlTemplate("Res/Battle/Skill/{0}");
    /**通用预制体路径 */
    static Common_Prefab_Url = new UrlTemplate("Common/{0}");
}


