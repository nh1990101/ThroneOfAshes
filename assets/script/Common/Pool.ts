/**
 * 通用对象池
 * 用法：
 *   const pool = new Pool<Bullet>(() => new Bullet(), b => b.reset(), 10);
 *   const b = pool.get();
 *   pool.put(b);
 */
export class Pool<T> {
    private _items: T[] = [];
    private _factory: () => T;
    private _reset?: (obj: T) => void;
    private _maxSize: number;

    /**
     * @param factory 创建新对象的工厂函数
     * @param reset 回收时重置对象的回调
     * @param prewarm 预创建数量
     * @param maxSize 池最大容量，超出的对象直接丢弃，<=0 表示不限制
     */
    constructor(factory: () => T, reset?: (obj: T) => void, prewarm: number = 0, maxSize: number = 0) {
        this._factory = factory;
        this._reset = reset;
        this._maxSize = maxSize;
        for (let i = 0; i < prewarm; i++) {
            this._items.push(factory());
        }
    }

    /** 池中空闲对象数量 */
    public get size(): number {
        return this._items.length;
    }

    /** 获取对象，池空时新建 */
    public get(): T {
        return this._items.length > 0 ? this._items.pop()! : this._factory();
    }

    /** 回收对象 */
    public put(obj: T): void {
        if (obj == null) return;
        if (this._maxSize > 0 && this._items.length >= this._maxSize) return;
        this._reset?.(obj);
        this._items.push(obj);
    }

    /** 批量回收 */
    public putAll(objs: T[]): void {
        for (const o of objs) this.put(o);
    }

    /** 清空池 */
    public clear(onDestroy?: (obj: T) => void): void {
        if (onDestroy) this._items.forEach(onDestroy);
        this._items.length = 0;
    }
}

/**
 * 数组对象池：复用数组，避免频繁创建 GC
 * 用法：
 *   const arr = ArrayPool.get<number>();
 *   ArrayPool.put(arr);
 */
export class ArrayPool {
    private static _pool: any[][] = [];
    private static _maxSize = 100;

    /** 获取一个空数组 */
    public static get<T = any>(): T[] {
        return (this._pool.pop() as T[]) ?? [];
    }

    /** 回收数组（会清空内容） */
    public static put<T>(arr: T[]): void {
        if (!arr) return;
        arr.length = 0;
        if (this._pool.length < this._maxSize) {
            this._pool.push(arr);
        }
    }

    /** 设置池最大容量 */
    public static setMaxSize(n: number): void {
        this._maxSize = n;
        if (this._pool.length > n) this._pool.length = n;
    }

    public static get size(): number {
        return this._pool.length;
    }

    public static clear(): void {
        this._pool.length = 0;
    }
}

/**
 * 对象池管理类：以类作为 key 管理对象池，默认通过 new T() 创建对象
 * 用法：
 *   PoolMgr.register(Bullet, b => b.reset(), 10);
 *   const b = PoolMgr.get(Bullet);   // 未注册时自动注册
 *   PoolMgr.put(b);                  // 按 b 的类回收
 */
export class PoolMgr {
    private static _pools = new Map<Function, Pool<any>>();

    /** 注册对象池（可选，未注册时 get 会自动用 new T() 注册） */
    public static register<T>(cls: new () => T, reset?: (obj: T) => void, prewarm: number = 0, maxSize: number = 0): Pool<T> {
        const pool = new Pool<T>(() => new cls(), reset, prewarm, maxSize);
        this._pools.set(cls, pool);
        return pool;
    }

    public static getPool<T>(cls: new () => T): Pool<T> {
        let pool = this._pools.get(cls);
        if (!pool) pool = this.register(cls);
        return pool;
    }

    /** 获取对象 */
    public static get<T>(cls: new () => T): T {
        return this.getPool(cls).get();
    }

    /** 回收对象，按对象所属的类找到对应的池 */
    public static put<T extends object>(obj: T): void {
        this._pools.get(obj.constructor)?.put(obj);
    }

    /** 获取数组 */
    public static getArray<T = any>(): T[] {
        return ArrayPool.get<T>();
    }

    /** 回收数组 */
    public static putArray<T>(arr: T[]): void {
        ArrayPool.put(arr);
    }

    /** 移除并清空某个类的池 */
    public static remove(cls: Function, onDestroy?: (obj: any) => void): void {
        this._pools.get(cls)?.clear(onDestroy);
        this._pools.delete(cls);
    }

    /** 清空所有池 */
    public static clearAll(): void {
        this._pools.forEach(p => p.clear());
        this._pools.clear();
        ArrayPool.clear();
    }
}
