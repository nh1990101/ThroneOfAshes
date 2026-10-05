'use strict';
/*
 * TexturePacker / Cocos plist 图集解析（format 0~3），用于取帧动画的第一帧作为物体图片。
 * 帧按名字自然排序（1.png, 2.png, ..., 10.png），第一帧按原始尺寸（含 trim 偏移）还原。
 */

const Plist = {
    parse(text) {
        const xml = new DOMParser().parseFromString(text, 'application/xml');
        if (xml.querySelector('parsererror')) throw new Error('plist XML 解析失败');
        const top = xml.documentElement;
        const node = top.tagName === 'plist' ? top.firstElementChild : top;
        return node ? Plist._node(node) : null;
    },

    _node(node) {
        switch (node.tagName) {
            case 'dict': {
                const obj = {};
                let key = null;
                for (const c of node.children) {
                    if (c.tagName === 'key') key = c.textContent;
                    else if (key != null) { obj[key] = Plist._node(c); key = null; }
                }
                return obj;
            }
            case 'array': return Array.from(node.children, c => Plist._node(c));
            case 'integer': return parseInt(node.textContent, 10);
            case 'real': return parseFloat(node.textContent);
            case 'true': return true;
            case 'false': return false;
            case 'string': case 'date': case 'data': return node.textContent;
            default: return null;
        }
    },

    _nums(str) {
        return (String(str ?? '').match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    },

    /** → { frames: [{ name, x, y, w, h, rotated, ox, oy, sw, sh }], texture: 'xxx.png' } */
    readAtlas(data) {
        if (!data || typeof data.frames !== 'object') throw new Error('不是图集 plist（缺少 frames）');
        const meta = data.metadata || {};
        const frames = Object.entries(data.frames).map(([name, f]) => Plist._frame(name, f));
        frames.sort((a, b) => naturalCompare(a.name, b.name));
        const tex = meta.textureFileName || meta.realTextureFileName || '';
        return { frames, texture: tex ? tex.split(/[\\/]/).pop() : '' };
    },

    _frame(name, f) {
        const n = Plist._nums;
        let x, y, w, h, rotated = false, ox = 0, oy = 0, sw, sh;
        if (f.textureRect !== undefined) {            // format 3
            [x, y, w, h] = n(f.textureRect);
            const size = n(f.spriteSize);
            if (size.length === 2) [w, h] = size;
            rotated = !!f.textureRotated;
            [ox = 0, oy = 0] = n(f.spriteOffset);
            [sw, sh] = n(f.spriteSourceSize);
        } else if (f.frame !== undefined) {           // format 1 / 2
            [x, y, w, h] = n(f.frame);
            rotated = !!f.rotated;
            [ox = 0, oy = 0] = n(f.offset);
            [sw, sh] = n(f.sourceSize);
        } else {                                      // format 0
            x = +f.x || 0; y = +f.y || 0; w = +f.width || 0; h = +f.height || 0;
            ox = +f.offsetX || 0; oy = +f.offsetY || 0;
            sw = Math.abs(+f.originalWidth || 0); sh = Math.abs(+f.originalHeight || 0);
        }
        if (!sw || !sh) { sw = w; sh = h; }
        return { name, x, y, w, h, rotated, ox, oy, sw, sh };
    },

    /** 把一帧按原始尺寸画到新 canvas（offset 为 Y 轴向上、相对中心的偏移；rotated 为顺时针 90° 打包） */
    drawFrame(texture, fr) {
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(fr.sw));
        c.height = Math.max(1, Math.round(fr.sh));
        const ctx = c.getContext('2d');
        const dx = Math.round((fr.sw - fr.w) / 2 + fr.ox);
        const dy = Math.round((fr.sh - fr.h) / 2 - fr.oy);
        if (fr.rotated) {
            ctx.translate(dx, dy + fr.h);
            ctx.rotate(-Math.PI / 2);
            ctx.drawImage(texture, fr.x, fr.y, fr.h, fr.w, 0, 0, fr.h, fr.w);
        } else {
            ctx.drawImage(texture, fr.x, fr.y, fr.w, fr.h, dx, dy, fr.w, fr.h);
        }
        return c;
    },
};
