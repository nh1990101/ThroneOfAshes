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
    static UnitAtlasUrl = new UrlTemplate("Res/Battle/UnitResAtlas/{0}/{0}");
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
}


