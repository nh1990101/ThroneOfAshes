import { _decorator, Asset, assetManager, AssetManager, Component, Font, instantiate, Label, Node, path, Prefab, Sprite, SpriteAtlas, UIOpacity, Vec2 } from 'cc';
import { DEBUG } from 'cc/env';
import { Tools } from './Tools';
const { ccclass, property } = _decorator;

@ccclass('AssetMgr')
export class AssetMgr extends Component {
    private static _poolRemoveNode: Map<string, Node[]> = new Map<string, Node[]>();
    private static _poolActive: Map<string, Node[]> = new Map<string, Node[]>();
    public static REMOVE_POS = new Vec2(10000, 10000);
    public static remoteBundle: AssetManager.Bundle;

    start() {

    }
    /**加载游戏资源包 */
    public static async preloadBundle() {
        return new Promise((resolve, reject) => {
            console.log("加载remote包")
            assetManager.loadBundle(this.getUrl() + "remote", (err, data) => {
                if (err) {
                    console.error("bundle加载失败：" + err.message);
                    reject(err);
                } else {
                    this.remoteBundle = data;
                    resolve(data);
                }
            });
        })
    }
    /**资源路径管理（cdn地址） */
    public static getUrl(): string {
        return ""
    }
    /**游戏配置路径 */
    public static getConfigUrl(): string {
        return path.join(this.getUrl(), "ConfigForClient.zip")
    }
    /**游戏配置路径 */
    public static getBattleConfigUrl(): string {
        return path.join(this.getUrl(), "BattleMapConfig.json")
    }
    /**字体路径 */
    public static getFontUrl(): string {
        return path.join(this.getUrl(), "ChillRoundFBold")
    }
    /**创建预制体对象（非对象池） */
    public static createPrefab(name: string, pos: Vec2, parent: Node) {
        return new Promise((resolve, reject) => {
            this.getRes(name, Prefab).then(data => {
                if (data) {
                    var obj = instantiate(data);
                    if (obj) {
                        obj.setPosition(pos.toVec3());
                        obj.setParent(parent);
                        resolve(obj);
                    } else {
                        reject("Failed to instantiate prefab.");
                    }
                } else {
                    reject("Failed to load prefab data.");
                }
            }).catch(error => {
                reject(error);
            });
        });
    }
    public static instantiate(prefab: Prefab) {
        return instantiate(prefab)
    }
    public static removeInstant(obj: Node) {
        obj.removeFromParent();
    }
    public static getRes<T extends Asset>(name: string, cls: new () => T) {

        return this.getResByBundle(name, cls)

    }
    public static getResByBundle<T extends Asset>(name: string, cls: new () => T): Promise<T> {

        return new Promise<T>((resolve, reject) => {
            this.remoteBundle.load(name, cls, null, (err, data) => {
                if (err) {
                    console.error(err.message);
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        })

    }
    public static getRemoteResByUrl<T extends Asset>(remoteUrl: string, cls: new () => T, ext: string) {

        return new Promise<T>((resolve, reject) => {
            assetManager.loadRemote<T>(remoteUrl, { ext: ext }, function (err, imageAsset) {
                if (err) {
                    console.log(err)
                }
                resolve(imageAsset)
                // ...
            });
        })
    }
    public static getActPrefab(prefabName: string): Node[] {
        return this._poolActive.get(prefabName);
    }
    /**从预制体实例化对象 - 带泛型支持 */
    public static createPrefabFromPoolByPrefab<T extends Component = Component>(prefab: Prefab, componentType?: new () => T) {
        const prefabName = prefab.name;
        // 如果指定了组件类型，pool key 加上组件名称
        const poolKey = componentType ? `${prefabName}_${componentType.name}` : prefabName;

        let arrRemove = this._poolRemoveNode.get(poolKey);
        let node: Node;

        let arrActive = this._poolActive.get(poolKey);
        if (!arrActive) {
            arrActive = [];
            this._poolActive.set(poolKey, arrActive);
        }

        if (arrRemove && arrRemove.length > 0) {
            node = arrRemove.shift();
        } else {
            node = this.instantiate(prefab);
        }

        if (!node['_prefabName']) {
            node['_prefabName'] = prefabName;
        }
        if (!node['_poolKey']) {
            node['_poolKey'] = poolKey;
        }

        if (arrActive.indexOf(node) < 0) {
            Tools.insertArr(arrActive, node);
        }

        // 如果指定了组件类型，确保组件存在
        if (componentType) {
            let comp = node.getComponent(componentType);
            if (!comp) {
                comp = node.addComponent(componentType);
            }
            // return comp;
        }

        return node;
    }

    /**创建预制体对象（对象池）- 自动挂载脚本（componentType）可当预制体作为皮肤使用，不同脚本可挂载同一个预制体 */
    public static async createPrefabFromPool<T extends Component>(
        url: string,
        pos: Vec2,
        parent: Node,
        componentType: (new () => T),
        keepWorldTransform: boolean = true,
        isInitPool?: boolean
    ): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const prefabName = Tools.getPrefabName(url);
            // 如果指定了组件类型，pool key 加上组件名称
            const poolKey = componentType ? `${prefabName}_${componentType.name}` : prefabName;

            let arrRemove = this._poolRemoveNode.get(poolKey);
            let node: Node;
            let arrActive = this._poolActive.get(poolKey);

            if (!arrActive) {
                arrActive = [];
                this._poolActive.set(poolKey, arrActive);
            }

            if (!isInitPool && arrRemove && arrRemove.length > 0) {
                node = arrRemove.shift();
                // 确保节点已经有 _prefabName 和 _poolKey 属性
                if (!node['_prefabName']) {
                    node['_prefabName'] = prefabName;
                }
                if (!node['_poolKey']) {
                    node['_poolKey'] = poolKey;
                }
                if (arrActive.indexOf(node) < 0) {
                    Tools.insertArr(arrActive, node);
                }
                const uiOpacity = node.getComponent(UIOpacity);
                if (uiOpacity) uiOpacity.opacity = 255;
                node.active = true;
                if (node.parent != parent) {
                    node.setParent(parent,keepWorldTransform);
                }
                node.setPosition(pos.toVec3());

                // 返回组件或节点
                if (componentType) {
                    let comp = node.getComponent(componentType);
                    if (!comp) {
                        comp = node.addComponent(componentType);
                    }
                    resolve(comp);
                }
            } else {
                this.createPrefab(url, pos, parent).then((node: Node) => {
                    // 存储预制体名字和 pool key 到节点上
                    node['_prefabName'] = prefabName;
                    node['_poolKey'] = poolKey;

                    // 如果指定了组件类型，确保组件存在
                    if (componentType) {
                        let comp = node.getComponent(componentType);
                        if (!comp) {
                            comp = node.addComponent(componentType);
                        }
                    }

                    if (isInitPool) {
                        if (!arrRemove) {
                            arrRemove = [];
                            this._poolRemoveNode.set(poolKey, arrRemove);
                        }
                        Tools.insertArr(arrRemove, node);
                    } else {
                        if (arrActive.indexOf(node) < 0) {
                            Tools.insertArr(arrActive, node);
                        }
                    }

                    // 返回组件或节点
                    if (componentType) {
                        const comp = node.getComponent(componentType);
                        resolve(comp);
                    }
                });
            }
        });
    }

    /**查找节点对应的对象池 key（兜底方案） */
    private static findPoolKeyByNode(node: Node): string | null {
        for (let [poolKey, nodes] of this._poolActive) {
            if (nodes.indexOf(node) > -1) {
                return poolKey;
            }
        }
        return null;
    }
    /**移除对象
     * 使用该方法的话需要从对象池创建，即createPrefabFromPool,不然不会进入池化
    */
    public static removeNode(node: Node, poolKey?: string) {
        node.active = false;
        // node.setPosition(AssetMgr.REMOVE_POS)

        // node.removeFromParent();

        // 优先使用 _poolKey（支持泛型区分），其次使用 _prefabName（向后兼容）
        if (!poolKey) {
            poolKey = node['_poolKey'] || node['_prefabName'];
        }

        // 如果还是没有，则尝试遍历查找（兜底方案）
        if (!poolKey) {
            poolKey = this.findPoolKeyByNode(node);
        }

        if (!poolKey) {
            console.warn('无法找到节点对应的对象池 key');
            return;
        }

        var arrActive = this._poolActive.get(poolKey);
        if (arrActive) {
            var idx = arrActive.indexOf(node);
            if (idx > -1) {
                arrActive.splice(idx, 1);
            }
        }
        var arrRemove = this._poolRemoveNode.get(poolKey);
        if (!arrRemove) {
            arrRemove = [];
            this._poolRemoveNode.set(poolKey, arrRemove);
        }
        if (arrRemove.indexOf(node) < 0) {
            // arrRemove.push(node)
            Tools.insertArr(arrRemove, node);
        }
    }
    public static removeAllByType(prefabName: string, callFunc?: Function) {
        var arrActive = this._poolActive.get(prefabName)
        if (arrActive) {
            while (arrActive.length > 0) {
                let item = arrActive.shift()
                if (callFunc) {
                    callFunc(item)
                }
                this.removeNode(item, prefabName);
            }

        }
    }
    public static clearPools() {
        // this._poolActive.forEach((itemPools: cc.Node[], name: string) => {

        // });
        this._poolRemoveNode = new Map<string, Node[]>();
        this._poolActive = new Map<string, Node[]>();
    }
    public static async setSpriteFromAtlas(resName: string, sprite: Sprite, atlasName = "ui/commonUI") {
        return new Promise((resolve, reject) => {

            AssetMgr.getRes(atlasName, SpriteAtlas).then(atlas => {

                const frame = atlas.getSpriteFrame(resName);
                sprite.spriteFrame = frame;
                resolve(sprite)
            })
        })
    }
    public static async loadFontRes() {

        return new Promise((resolve, reject) => {
            if (DEBUG) {
                AssetMgr.getRes(AssetMgr.getFontUrl(), Font).then(file => {
                    this.successLoadFont(file)
                    resolve(null)
                })
            } else {
                AssetMgr.getRemoteResByUrl(AssetMgr.getFontUrl(), Font, ".otf").then(file => {
                    this.successLoadFont(file)
                    resolve(null)
                })
            }
        })


    }
    /**设置系统字体 */
    private static successLoadFont(font: Font) {
        const oldonLoad = Label.prototype["onLoad"];

        Label.prototype["onLoad"] = function () {
            //设置默认字体
            this.font = font;
            //调用原有·onLoad
            if (oldonLoad) oldonLoad.call(this);
        }

    }
}


