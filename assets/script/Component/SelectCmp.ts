/** 字符串、数字，或节点这类对象。对象按引用区分，同一个节点才是同一个 key */
export type SelectKey = string | number | object;

export enum SelectMode {
    /** 不可选，已选会被清掉 */
    None = 0,
    /** 单选，可以一个都不选 */
    SingleOrNone = 1,
    /** 必须有且只有一个选中 */
    Single = 2,
    /** 多选 */
    Multi = 3,
}

export type SelectChanged<T> = (key: SelectKey, isSelect: boolean, target: T | null) => void;

/**
 * 一组选项的选中状态。不挂节点。
 * 列表单选继续用 ScrollList，页签、筛选、多选用这个类。
 *
 * const select = new SelectCmp<Node>(SelectMode.Single, (key, isSelect, node) => {
 *     const bg = node?.getChildByName("SelectBg");
 *     if (bg) bg.active = isSelect;
 * });
 * select.addKey(familyNode, familyNode);
 * select.setSelect(familyNode, true);
 */
export class SelectCmp<T = any> {
    private mode: SelectMode;
    private onChanged?: SelectChanged<T>;
    /** 已登记的选项。值为 null 表示没有附带目标 */
    private targets = new Map<SelectKey, T | null>();
    /** 当前选中的 key。不要从外部改这个 Map */
    private selected = new Map<SelectKey, true>();

    constructor(mode: SelectMode, onChanged?: SelectChanged<T>) {
        this.mode = mode;
        this.onChanged = onChanged;
    }

    setMode(mode: SelectMode): void {
        if (this.mode === mode) return;
        this.mode = mode;
        const key = this.firstKey();
        if (key != null) {
            this.applySelect(key, this.selected.has(key));
        }
    }

    /** 登记一个选项。重复登记只更新 target，不改选中状态 */
    addKey(key: SelectKey, target?: T): void {
        const stored = target ?? null;
        if (this.targets.has(key)) {
            this.targets.set(key, stored);
            return;
        }
        this.targets.set(key, stored);
        if (this.mode === SelectMode.Single && this.selected.size === 0) {
            this.setSelect(key, true);
            return;
        }
        this.emitOne(key, false);
    }

    /** 先按当前模式取消选中，再移除选项 */
    removeKey(key: SelectKey): void {
        if (!this.targets.has(key)) return;
        this.setSelect(key, false);
        this.targets.delete(key);
        this.selected.delete(key);
    }

    /** 只清数据，不回调 */
    clearAll(): void {
        this.selected.clear();
        this.targets.clear();
    }

    setSelect(key: SelectKey, isSelect: boolean): void {
        if (!this.targets.has(key)) return;
        if (this.selected.has(key) === isSelect) return;
        this.applySelect(key, isSelect);
    }

    /** 反向选中 */
    switch(key: SelectKey): void {
        if (!this.targets.has(key)) return;
        this.applySelect(key, !this.selected.has(key));
    }

    isSelect(key: SelectKey): boolean {
        return this.selected.has(key);
    }

    /** 返回一个选中的 key。多选时是登记顺序里的第一个 */
    getSelect(): SelectKey | null {
        const it = this.selected.keys().next();
        return it.done ? null : it.value;
    }

    /** 选中表，没选中的不在里面。不要修改返回值 */
    getSelectDict(): ReadonlyMap<SelectKey, true> {
        return this.selected;
    }

    destroy(): void {
        this.clearAll();
        this.onChanged = undefined;
    }

    private applySelect(key: SelectKey, isSelect: boolean): void {
        const changed: SelectKey[] = [];
        if (this.mode === SelectMode.None) {
            for (const k of this.selected.keys()) {
                changed.push(k);
            }
            this.selected.clear();
        } else if (this.mode === SelectMode.SingleOrNone) {
            this.writeOne(key, isSelect, changed);
            this.keepOnlyOne(key, isSelect, changed);
        } else if (this.mode === SelectMode.Single) {
            this.writeOne(key, isSelect, changed);
            if (this.selected.size === 0) {
                let selectKey = this.firstKey();
                if (selectKey === key) {
                    selectKey = this.nextKey(key);
                }
                if (selectKey != null) {
                    this.selected.set(selectKey, true);
                    changed.push(selectKey);
                }
            } else if (this.selected.size > 1) {
                this.keepOnlyOne(key, isSelect, changed);
            }
        } else if (this.mode === SelectMode.Multi) {
            this.writeOne(key, isSelect, changed);
        }
        this.emitChanged(changed);
    }

    private writeOne(key: SelectKey, isSelect: boolean, changed: SelectKey[]): void {
        if (this.selected.has(key) === isSelect) return;
        if (isSelect) {
            this.selected.set(key, true);
        } else {
            this.selected.delete(key);
        }
        changed.push(key);
    }

    /** 多于一个选中时，只留一个：优先留本次选中的 key，否则留其它项里的第一个 */
    private keepOnlyOne(key: SelectKey, isSelect: boolean, changed: SelectKey[]): void {
        if (this.selected.size <= 1) return;
        let selectKey: SelectKey | null = isSelect ? key : null;
        // 直接遍历 Map，避免发布构建把迭代器的数组展开转成 concat。
        this.selected.forEach((_value, k) => {
            if (k === key) return;
            if (selectKey != null) {
                this.selected.delete(k);
                changed.push(k);
            } else {
                selectKey = k;
            }
        });
    }

    private emitChanged(changed: SelectKey[]): void {
        for (const key of changed) {
            this.emitOne(key, this.selected.has(key));
        }
    }

    private emitOne(key: SelectKey, isSelect: boolean): void {
        if (!this.onChanged) return;
        const target = this.targets.has(key) ? this.targets.get(key)! : null;
        try {
            this.onChanged(key, isSelect, target);
        } catch (error) {
            console.error("[SelectCmp] onChanged error", error);
        }
    }

    private firstKey(): SelectKey | null {
        const it = this.targets.keys().next();
        return it.done ? null : it.value;
    }

    private nextKey(after: SelectKey): SelectKey | null {
        let found = false;
        for (const key of this.targets.keys()) {
            if (found) return key;
            if (key === after) found = true;
        }
        return null;
    }
}
