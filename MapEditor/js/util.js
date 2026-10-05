'use strict';
/*
 * 工具函数
 */

/**
 * 自然排序比较函数
 */
function naturalCompare(a, b) {
    const ax = [], bx = [];

    a.replace(/(\d+)|(\D+)/g, (_, n, s) => { ax.push([n || Infinity, s || '']); });
    b.replace(/(\d+)|(\D+)/g, (_, n, s) => { bx.push([n || Infinity, s || '']); });

    while (ax.length && bx.length) {
        const an = ax.shift();
        const bn = bx.shift();
        const nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
        if (nn) return nn;
    }

    return ax.length - bx.length;
}

/**
 * 获取文件扩展名
 */
function extName(fileName) {
    const match = /\.([^.]+)$/.exec(fileName);
    return match ? match[1].toLowerCase() : '';
}

/**
 * 权重随机选择
 */
function weightedRandom(items) {
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const item of items) {
        random -= item.weight || 1;
        if (random <= 0) {
            return item;
        }
    }

    return items[items.length - 1];
}

/**
 * 深拷贝对象
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
}

/**
 * 节流函数
 */
function throttle(func, wait) {
    let timeout;
    let previous = 0;

    return function(...args) {
        const now = Date.now();
        const remaining = wait - (now - previous);

        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            func.apply(this, args);
        } else if (!timeout) {
            timeout = setTimeout(() => {
                previous = Date.now();
                timeout = null;
                func.apply(this, args);
            }, remaining);
        }
    };
}

/**
 * 防抖函数
 */
function debounce(func, wait) {
    let timeout;

    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);
        }, wait);
    };
}
