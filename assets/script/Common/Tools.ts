import { _decorator, Component, Material, Node, Sprite, SpriteAtlas, SpriteFrame, tween, Tween, UITransform, v2, Vec2, Vec3, view } from 'cc';
import { AssetMgr } from './AssetMgr';
import { GameColor } from './GameColor';
const { ccclass, property } = _decorator;

@ccclass('Tools')
export class Tools {
    /**
* 格式化数字，自动选择合适单位（K, M, B, T, Q），保留两位小数
* @param num 输入的数字
* @returns 格式化后的字符串（如 "1.50K", "2.50M", "3.45B"）
*/
    public static getNumberShow(num: number) {

        if (num === 0) return "0"; // 处理 0

        const units = ["", "K", "M", "B", "T", "Q"]; // 单位：千(K), 百万(M), 十亿(B), 万亿(T), 千亿(Q)
        const unitThreshold = 1000; // 单位阈值（每增加一级放大 1000 倍）

        let unitIndex = 0;
        let absNum = Math.abs(num);

        // 计算应该使用的单位
        while (absNum >= unitThreshold && unitIndex < units.length - 1) {
            absNum /= unitThreshold;
            unitIndex++;
        }

        // 保留 2 位小数，并去掉末尾的 ".00"
        let formattedNum = absNum.toFixed(2).replace(/\.?0+$/, "");
        if (formattedNum.endsWith(".")) {
            formattedNum = formattedNum.replace(".", ""); // 处理 "100." -> "100"
        }

        // 添加单位（负数保留符号）
        return (num < 0 ? "-" : "") + formattedNum + units[unitIndex];

    }
    /**数字化格式（1000=1,000） */
    public static formatNumberWithCommas(num: number): string {

        let result = '';
        let count = 0;
        if (isNaN(num)) {
            return ``
        }
        let str = num.toString();

        for (let i = str.length - 1; i >= 0; i--) {
            count++;
            result = str[i] + result;
            if (count % 3 === 0 && i !== 0) {
                result = ',' + result;
            }
        }

        return result;

        // return num.toLocaleString('en-US');
    }

    /**性能化插入数组元素 */
    public static insertArr(arr: Array<any>, item: any) {
        if (!arr) {
            arr = []
        }
        arr[arr.length] = item;
    }
    static async setSprite(targetSprite: Sprite, resName: string, atlasName: string = `UIRes/CommonUI`) {
        return new Promise((resolve, reject) => {

            AssetMgr.getRes(atlasName, SpriteAtlas).then(atlas => {
                const frame = atlas.getSpriteFrame(resName);
                targetSprite.spriteFrame = frame;
                resolve(targetSprite)
            })
        })
    }
    static async setSpriteTexture(targetSprite: Sprite, url: string, isLoadShow: boolean = true) {
        let isUseLoadShow = false;
        if (isLoadShow && targetSprite.node.active) {
            targetSprite.node.active = false;
            isUseLoadShow = true;
        }
        return new Promise((resolve, reject) => {

            AssetMgr.getRes(url, SpriteFrame).then(frame => {
                targetSprite.spriteFrame = frame;
                if (isUseLoadShow) {
                    targetSprite.node.active = true;
                }
                resolve(targetSprite)
            })
        })
    }
    static getPrefabName(path: string): string {
        // 处理空字符串或没有斜杠的情况
        if (!path || path.trim() === '') {
            return '';
        }

        // 移除末尾的斜杠（如果有）
        const trimmedPath = path.endsWith('/') ? path.slice(0, -1) : path;
        const parts = trimmedPath.split('/');

        return parts[parts.length - 1] || '';
    }
    static setCostFormat(own: number, need: number, enoughColor = GameColor.GAME_GREEN, notEnoughColor = GameColor.GAME_RED) {
        return [`${own}/${need}`, own >= need ? enoughColor : notEnoughColor]
    }
    /**把节点设置到最上层 */
    static setNodeTopLayer(node: Node) {
        if (node.parent) {
            node.setSiblingIndex(node.parent.children.length - 1);
        }
    }
    /**
 * 高性能的数字补零函数（避免不必要的类型转换）
 */
    static fastPadNumber(num: number, length: number = 2): string {
        const numStr = num.toString();
        const zerosNeeded = length - numStr.length;

        if (zerosNeeded <= 0) {
            return numStr;
        }

        return '0'.repeat(zerosNeeded) + numStr;
    }
    /**
 * 将数组转换为 Map
 * @param array 输入数组
 * @param keySelector 键选择函数
 * @returns 生成的 Map
 */
    static arrayToMap<T, K>(
        array: T[],
        keySelector: (item: T) => K
    ): Map<K, T> {
        return array.reduce((map, item) => {
            map.set(keySelector(item), item);
            return map;
        }, new Map<K, T>());
    }
    static mapArrInsert<T>(map: Map<number | string, T[]>, item: { key: number | string, value: T }) {
        var list = map.get(item.key)
        if (!list) {
            map.set(item.key, [])
            list = map.get(item.key)
        }
        Tools.insertArr(list, item.value)

    }
    /**
     * array：要操作的数组
     * indicesToDelete:要删除的下标元素
     */
    static removeItemByIndexs(array: Array<any>, indicesToDelete: number[]) {


        // 创建要删除索引的 Set 用于快速查找
        const indicesSet = new Set(indicesToDelete);

        const newArray = array.filter((_, index) => !indicesSet.has(index));
        return newArray;
    }
    /**交换数组元素位置 */
    static swapElements<T>(array: T[], index1: number, index2: number): void {
        if (index1 < 0 || index1 >= array.length ||
            index2 < 0 || index2 >= array.length) {
            return; // 索引越界检查
        }

        const temp = array[index1];
        array[index1] = array[index2];
        array[index2] = temp;
    }

 
    /**
    * 获取UI节点的世界坐标（考虑锚点）
    * @param node UI节点
    */
    public static getUIWorldPosition(node: Node): Vec2 {
        if (!node) return v2(0, 0);
        return node.getComponent(UITransform)?.convertToWorldSpaceAR(Vec3.ZERO).toVec2();
    }

    /**
     * 将世界坐标转换为屏幕坐标
     * @param worldPos 世界坐标
     */
    public static worldToScreenPosition(worldPos: Vec2): Vec2 {
        const screenPos = v2();
        // 将世界坐标转换为屏幕坐标
        // 注意：Cocos Creator 2.x 中需要手动计算
        const canvas = view.getCanvasSize();
        const designResolution = view.getDesignResolutionSize();

        // 计算比例
        const scaleX = canvas.width / designResolution.width;
        const scaleY = canvas.height / designResolution.height;

        screenPos.x = (worldPos.x + designResolution.width / 2) * scaleX;
        screenPos.y = (worldPos.y + designResolution.height / 2) * scaleY;

        return screenPos;
    }

    /**
     * 获取UI节点的屏幕坐标
     * @param node UI节点
     */
    public static getUIScreenPosition(node: Node): Vec2 {
        const worldPos = this.getUIWorldPosition(node);
        return this.worldToScreenPosition(worldPos);
    }
    private static scheduledCallbacks: Map<Node, () => void> = new Map();





    /**
     * 停止指定节点的所有自定义动画
     */
    public static stopCustomAnimation(component: Component, node: Node): void {
        const callback = this.scheduledCallbacks.get(node);
        if (callback) {
            component.unschedule(callback);
            this.scheduledCallbacks.delete(node);
        }
    }

    /**
     * 停止所有自定义动画
     */
    public static stopAllCustomAnimations(component: Component): void {
        this.scheduledCallbacks.forEach((callback, node) => {
            component.unschedule(callback);
        });
        this.scheduledCallbacks.clear();
    }


}


