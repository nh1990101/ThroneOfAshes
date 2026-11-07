import { _decorator, Component, js, Material, Node, Sprite, SpriteAtlas, SpriteFrame, tween, Tween, UITransform, v2, Vec2, Vec3, view } from 'cc';
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

    /**
     * 去除资源路径的文件后缀
     * @param path 资源路径（如 "res/images/icon.png"）
     * @returns 去除后缀的路径（如 "res/images/icon"）
     */
    static removeFileExtension(path: string, replace = "/spriteFrame"): string {
        if (!path || path.trim() === '') {
            return '';
        }

        // 匹配常见的图片和资源文件后缀
        const extensionPattern = /\.(png|jpg|jpeg|gif|webp|bmp|svg|ico|tiff|psd|prefab|json|atlas|mp3|wav|ogg|mp4|avi|mov)$/i;

        // 如果路径匹配到后缀，则替换；否则直接返回原路径
        if (extensionPattern.test(path)) {
            return path.replace(extensionPattern, replace);
        }

        return path + replace;
    }
    /**格式化资源单图图标 */
    static formatIconResUrl(res_Path: string, res_name: string) {
        return `${res_Path}/${res_name}/spriteFrame`
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
    public static getUIWorldPosition(node: Node, worldPos: Vec3): Vec2 {
        if (!node) return v2(0, 0);
        return node.getComponent(UITransform)?.convertToWorldSpaceAR(worldPos).toVec2();
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
    /**坐标索引字符串格式化 */
    public static formatPosKey(x: number, y: number) {
        return `${x},${y}`;
    }
    /**根据数组权重获取随机数组元素 */
    public static getRandomForWeight<T extends { weight: number }>(arr: T[]): T {
        if (!arr || arr.length === 0) {
            return null;
        }
        if (arr.length === 1) {
            return arr[0];
        }

        let total = 0;
        for (let i = 0; i < arr.length; i++) {
            total += arr[i].weight;
        }

        // 权重全部无效时，退化为等概率随机
        if (total <= 0) {
            return arr[Math.floor(Math.random() * arr.length)];
        }

        let rand = Math.random() * total;
        for (let i = 0; i < arr.length; i++) {
            rand -= arr[i].weight;
            if (rand < 0) {
                return arr[i];
            }
        }

        // 浮点误差兜底：返回最后一个有效权重的元素
        for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i].weight > 0) {
                return arr[i];
            }
        }
        return arr[arr.length - 1];
    }
    /**
     * 获取一个随机范围数据
     * @param min 最小值
     * @param max 最大值
     * @param isFloat 是否返回浮点数，默认 false 返回整数
     * @returns 整数时为闭区间 [min, max]，浮点数时为 [min, max)
     */
    public static getRandomRange(min: number, max: number, isFloat: boolean = false): number {
        if (min > max) {
            const temp = min;
            min = max;
            max = temp;
        }
        if (isFloat) {
            return min + Math.random() * (max - min);
        }
        return Math.floor(min + Math.random() * (max - min + 1));
    }
    /**
     * 数组乱序（Fisher-Yates 洗牌），不修改原数组
     * @param arr 原数组
     * @param out 可选的目标数组（复用已有数组可避免频繁 GC），会先清空
     * @returns 乱序后的新数组；out 传入时返回 out 本身
     */
    public static shuffle<T>(arr: T[], out?: T[]): T[] {
        const result = out || [];
        result.length = 0;
        if (!arr || arr.length === 0) {
            return result;
        }

        for (let i = 0; i < arr.length; i++) {
            result[i] = arr[i];
        }

        // 从后往前，把当前元素与前面随机位置的元素交换
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = result[i];
            result[i] = result[j];
            result[j] = temp;
        }

        return result;
    }

    /**
     * 取类的稳定名称。
     * 发布版本压缩后 cls.name 会被改成 a/b/t 之类的短名，两个类可能重名，不能当 key 用。
     * js.getClassName 读的是 @ccclass('Xxx') 里写死的字符串，各版本一致。
     */
    public static getClsName(cls: Function): string {
        return js.getClassName(cls);
    }

    /**
     * 克隆对象（深拷贝）
     * 支持：基本类型、普通对象、数组、Map、Set、Date、TypedArray/ArrayBuffer
     * 处理循环引用与共享引用（同一个源对象在结果里仍然指向同一个副本）
     * 注意：只用于纯数据，Node/Component/Asset 等引擎对象请用 instantiate
     * @param obj 源对象，如 BattleTeamData
     * @returns 结构完全独立的新对象
     */
    public static cloneObj<T>(obj: T): T {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        return Tools.cloneDeepImpl(obj as any, new Map()) as T;
    }

    private static cloneDeepImpl(obj: any, memo: Map<any, any>): any {
        // 已经克隆过（循环引用 / 共享引用）
        if (memo.has(obj)) {
            return memo.get(obj);
        }

        // 数组
        if (Array.isArray(obj)) {
            const newArr: any[] = new Array(obj.length);
            memo.set(obj, newArr);
            for (let i = 0; i < obj.length; i++) {
                newArr[i] = Tools.cloneDeepImpl(obj[i], memo);
            }
            return newArr;
        }

        // Date
        if (obj instanceof Date) {
            const newDate = new Date(obj.getTime());
            memo.set(obj, newDate);
            return newDate;
        }

        // Map（键和值都深拷贝，和 JSON 方案不同，这里不会丢数据）
        if (obj instanceof Map) {
            const newMap = new Map();
            memo.set(obj, newMap);
            obj.forEach((value: any, key: any) => {
                newMap.set(Tools.cloneDeepImpl(key, memo), Tools.cloneDeepImpl(value, memo));
            });
            return newMap;
        }

        // Set
        if (obj instanceof Set) {
            const newSet = new Set();
            memo.set(obj, newSet);
            obj.forEach((value: any) => {
                newSet.add(Tools.cloneDeepImpl(value, memo));
            });
            return newSet;
        }

        // TypedArray / DataView / ArrayBuffer：直接走原生 copy，否则只复制属性会得到不可用的对象
        if (ArrayBuffer.isView(obj)) {
            const newView = (obj as any).slice
                ? (obj as any).slice()
                : new (obj.constructor as any)(obj.buffer.slice(0));
            memo.set(obj, newView);
            return newView;
        }
        if (obj instanceof ArrayBuffer) {
            const newBuf = obj.slice(0);
            memo.set(obj, newBuf);
            return newBuf;
        }

        // 普通对象 / 类实例：保留原型，只复制自身可枚举属性
        const result = Object.create(Object.getPrototypeOf(obj));
        memo.set(obj, result);
        const keys = Object.keys(obj);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            result[key] = Tools.cloneDeepImpl(obj[key], memo);
        }
        return result;
    }
}


type ComponentConstructor<T> = new (...args: any[]) => T;

export function safeGetComponent<T extends Component>(node: Node, type: ComponentConstructor<T>): T {
    const existing = node.getComponent(type);
    if (existing) return existing;
    return node.addComponent(type);
}



