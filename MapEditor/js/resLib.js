'use strict';
/*
 * 地图物体资源库：扫描 Res/Map/MapObject 下的图片与 plist 图集。
 * 资源 key 即 showUrl：相对 remote、不带扩展名，如 Res/Map/MapObject/Image/building_1，
 * 与 MapData 表 show_url 字段、运行时 remoteBundle.load() 的路径一致。
 */

class ResLibrary {
    constructor(onUpdate) {
        this.base = 'Res/Map/MapObject';
        this.onUpdate = onUpdate;
        this.items = [];            // 面板中显示的资源
        this.byKey = new Map();     // key → item（含配置里引用、但不在 MapObject 下的资源）
        this.visuals = new Map();   // key → { state: 'loading'|'ready'|'error', image, w, h, mask... }
        this.scanToken = 0;
    }

    async scan() {
        const token = ++this.scanToken;
        this.clearVisuals();
        this.byKey.clear();
        const items = [];
        if (await ResFS.isDir(this.base)) await this._walk(this.base, items, 0);
        if (token !== this.scanToken) return this.items;
        items.sort((a, b) => naturalCompare(a.group, b.group) || naturalCompare(a.key, b.key));
        this.items = items;
        for (const it of items) this.byKey.set(it.key, it);
        return items;
    }

    clearVisuals() {
        for (const v of this.visuals.values()) v.image?.close?.();
        this.visuals.clear();
    }

    async _walk(dirPath, out, depth) {
        if (depth > 8) return;
        let entries;
        try { entries = await ResFS.list(dirPath); } catch (e) { console.warn(e); return; }
        const files = entries.filter(e => e.kind === 'file');
        const group = dirPath.slice(this.base.length).split('/').filter(Boolean)[0] || '其它';
        const used = new Set();
        for (const f of files) {
            if (!/\.plist$/i.test(f.name)) continue;
            const item = await this._atlasItem(dirPath, f, files, group);
            if (!item) continue;
            used.add(item.texName.toLowerCase());
            out.push(item);
        }
        for (const f of files) {
            if (!isImageFile(f.name) || used.has(f.name.toLowerCase())) continue;
            const key = joinPath(dirPath, baseName(f.name));
            if (out.some(o => o.key === key)) continue;   // 同名不同扩展名，保留第一个
            out.push({ key, name: baseName(f.name), kind: 'image', group, dirPath, fileName: f.name, handle: f.handle });
        }
        for (const d of entries) {
            if (d.kind === 'directory') await this._walk(joinPath(dirPath, d.name), out, depth + 1);
        }
    }

    async _atlasItem(dirPath, plistEntry, files, group) {
        try {
            const text = await (await plistEntry.handle.getFile()).text();
            const atlas = Plist.readAtlas(Plist.parse(text));
            if (!atlas.frames.length) return null;
            const plistBase = baseName(plistEntry.name);
            const find = n => n && files.find(f => f.name.toLowerCase() === n.toLowerCase());
            const tex = find(atlas.texture) || find(`${plistBase}.png`) || find(`${plistBase}.webp`) || find(`${plistBase}.jpg`);
            if (!tex) {
                console.warn(`图集缺少纹理: ${dirPath}/${plistEntry.name}`);
                return null;
            }
            return {
                key: joinPath(dirPath, plistBase), name: plistBase, kind: 'atlas', group, dirPath,
                fileName: plistEntry.name, texName: tex.name, texHandle: tex.handle,
                frames: atlas.frames, frameCount: atlas.frames.length,
            };
        } catch (e) {
            console.warn(`解析图集失败: ${dirPath}/${plistEntry.name}`, e);
            return null;
        }
    }

    /** 配置中引用了 MapObject 之外的资源（如 Res/Battle/UnitResAtlas/1001/1001）时按路径探测 */
    async _probe(key) {
        const segs = key.split('/');
        const name = segs.pop();
        const dirPath = segs.join('/');
        let entries;
        try { entries = await ResFS.list(dirPath); } catch { return null; }
        const files = entries.filter(e => e.kind === 'file');
        const plist = files.find(f => f.name.toLowerCase() === `${name}.plist`.toLowerCase());
        if (plist) {
            const item = await this._atlasItem(dirPath, plist, files, '');
            if (item) return item;
        }
        const img = files.find(f => isImageFile(f.name) && baseName(f.name).toLowerCase() === name.toLowerCase());
        return img ? { key, name, kind: 'image', group: '', dirPath, fileName: img.name, handle: img.handle } : null;
    }

    /** 取已加载的图像（未加载则开始加载并返回当前状态条目） */
    peek(key) {
        const v = this.visuals.get(key);
        if (v) return v;
        this.load(key).catch(() => { /* 状态已记录 */ });
        return this.visuals.get(key);
    }

    load(key) {
        let v = this.visuals.get(key);
        if (v) return v.promise;
        v = { state: 'loading' };
        v.promise = this._load(key).then(
            r => { Object.assign(v, r, { state: 'ready' }); this.onUpdate?.(); return v; },
            e => { v.state = 'error'; v.error = e; this.onUpdate?.(); throw e; },
        );
        this.visuals.set(key, v);
        return v.promise;
    }

    async _load(key) {
        let item = this.byKey.get(key);
        if (!item) {
            item = await this._probe(key);
            if (item) this.byKey.set(key, item);
        }
        if (!item) throw new Error(`找不到资源: ${key}`);
        let image;
        if (item.kind === 'image') {
            image = await createImageBitmap(await item.handle.getFile());
        } else {
            const tex = await createImageBitmap(await item.texHandle.getFile());
            const canvas = Plist.drawFrame(tex, item.frames[0]);
            tex.close();
            image = await createImageBitmap(canvas);
        }
        return { image, w: image.width, h: image.height, item };
    }

    /** 图像局部坐标 (lx, ly) 处的透明度 0~255，用于像素级点选 */
    alphaAt(v, lx, ly) {
        if (!v.mask) {
            const s = Math.min(1, 512 / Math.max(v.w, v.h));
            const mw = Math.max(1, Math.round(v.w * s)), mh = Math.max(1, Math.round(v.h * s));
            const ctx = new OffscreenCanvas(mw, mh).getContext('2d', { willReadFrequently: true });
            ctx.drawImage(v.image, 0, 0, mw, mh);
            const data = ctx.getImageData(0, 0, mw, mh).data;
            v.mask = new Uint8Array(mw * mh);
            for (let i = 0; i < v.mask.length; i++) v.mask[i] = data[i * 4 + 3];
            v.maskW = mw; v.maskH = mh; v.maskScale = s;
        }
        const mx = Math.floor(lx * v.maskScale), my = Math.floor(ly * v.maskScale);
        if (mx < 0 || my < 0 || mx >= v.maskW || my >= v.maskH) return 0;
        return v.mask[my * v.maskW + mx];
    }
}
