type PropertyDecorator = (
    $class: Record<string, any>, $propertyKey: string | symbol, $descriptorOrInitializer?: any,
) => void;

import { Node } from "cc"

const searchChild = function (node: Node, name: string) {
    let ret = node.getChildByName(name);
    if (ret) return ret;
    for (let i = 0; i < node.children.length; i++) {
        let child = node.children[i];
        if (!child.isValid) continue;
        ret = searchChild(child, name);
        if (ret) return ret;
    }
    return null;
}

const CookDecoratorKey = ($desc: string) => `__ccc_decorator_${$desc}__`

const KeyChild = CookDecoratorKey("child_cache");
type ParamType = {
    name?: string,
};

export function child($opt?: ParamType): PropertyDecorator {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return ($target, $propertyKey: string, $descriptorOrInitializer) => {
        // 确保子类有自己的元数据副本，而不是共享父类的引用
        let cache: { propertyKey: string, childName: string }[];
        if ($target.hasOwnProperty(KeyChild)) {
            cache = $target[KeyChild];
        } else {
            // 继承父类的元数据（如果有），并创建新副本
            cache = $target[KeyChild] = $target[KeyChild] ? [...$target[KeyChild]] : [];
        }

        if (!cache.some($vo => $vo.propertyKey === $propertyKey)) {
            cache.push({ propertyKey: $propertyKey, childName: $opt?.name || $propertyKey });
        } else {
            throw new Error(`child 装饰器重复绑定属性：${$propertyKey}，class：${$target.name}`);
        }

        // 只在首次装饰器时重写 onLoad
        if (!$target.hasOwnProperty('onLoad')) {
            const oldOnLoad: () => void = $target.onLoad || undefined;//$target.onLoad也可以拿到父类的实现
            $target.onLoad = function () {
                const currentCache = this.constructor.prototype[KeyChild] || [];
                currentCache.forEach($vo => this[$vo.propertyKey] = searchChild(this.node, $vo.childName));
                oldOnLoad && oldOnLoad.apply(this);
            };
        }
    };
}

import { Component } from "cc";

interface INewable<T = any> extends Function {
    new(...args: any[]): T;
}

const KeyComp = CookDecoratorKey("comp_cache");

export function comp($compoentClass: INewable<Component>, $childName?: string, $mute = false): PropertyDecorator {
    return ($target, $propertyKey: string, $descriptorOrInitializer) => {
        // 确保子类有自己的元数据副本，而不是共享父类的引用
        let cache: { propertyKey: string, compClass: INewable<Component>, childName: string }[];
        if ($target.hasOwnProperty(KeyComp)) {
            cache = $target[KeyComp];
        } else {
            // 继承父类的元数据（如果有），并创建新副本
            cache = $target[KeyComp] = $target[KeyComp] ? [...$target[KeyComp]] : [];
        }

        if (!cache.some($vo => $vo.propertyKey === $propertyKey)) {
            cache.push({ propertyKey: $propertyKey, compClass: $compoentClass, childName: $childName || $propertyKey });
        } else {
            if (!$mute) {
                throw new Error(`comp装饰器重复绑定属性：${$propertyKey}，class：${$target.name}`);
            }
            return;
        }

        // 只在首次装饰器时重写 onLoad
        if (!$target.hasOwnProperty('onLoad')) {
            const oldOnLoad: () => void = $target.onLoad || undefined;//$target.onLoad也可以拿到父类的实现
            $target.onLoad = function () {
                const currentCache = this.constructor.prototype[KeyComp] || [];
                currentCache.forEach($vo => {
                    const node = ($vo.childName ? searchChild(this.node, $vo.childName) : this.node);
                    if (!node) {
                        if (!$mute) {
                            throw new Error(`comp装饰器没有找到适合的node节点：class：${$target.name}，组件：${$vo.compClass.name}，childName：${$vo.childName}`);
                        } else {
                            return;
                        }
                    }
                    this[$vo.propertyKey] = node.getComponent($vo.compClass) || node.addComponent($vo.compClass);
                });
                oldOnLoad && oldOnLoad.apply(this);
            };
        }
    };
}