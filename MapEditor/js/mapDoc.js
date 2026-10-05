'use strict';
/*
 * 地图数据模型、撤销/重做、配置序列化。
 * 坐标约定：左上角为原点，x 向右、y 向下（与图片及地图块 X_Y 命名一致），格子与像素坐标均从 0 开始。
 */

/** 物体类型，对应 MapData 表 type 字段 */
const OBJECT_TYPES = [
    { value: 1, label: '1 道具奖励', hint: 'RewardData 的 ID' },
    { value: 2, label: '2 怪物', hint: '遇敌群组 ID' },
    { value: 3, label: '3 建筑', hint: '暂无定义' },
    { value: 4, label: '4 自定义事件', hint: '子类型_参数，传送门: 1_主城ID' },
];
const DEFAULT_OBJECT_TYPE = 3;
const MAX_GRID_CELLS = 4000000;

const BLOCK_RGBA = [255, 45, 45, 125];
const RES_ALPHA = 0.5;

const cloneResList = l => (l ? l.map(e => ({ id: e.id, weight: e.weight })) : null);
function sameResList(a, b) {
    if (!a || !b) return !a && !b;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i].id !== b[i].id || a[i].weight !== b[i].weight) return false;
    }
    return true;
}
const cloneObj = o => ({ ...o, params: (o.params || []).slice() });

/** 每个逻辑格子对应 1 像素的标记图层，绘制时关闭平滑放大即得到清晰的格子色块 */
class CellLayer {
    constructor(cols, rows) {
        this.cols = cols;
        this.rows = rows;
        this.canvas = document.createElement('canvas');
        this.canvas.width = cols;
        this.canvas.height = rows;
        this.ctx = this.canvas.getContext('2d');
        this.image = this.ctx.createImageData(cols, rows);
        this.dirty = null;
    }

    set(i, r, g, b, a) {
        const d = this.image.data, o = i * 4;
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = a;
        const x = i % this.cols, y = (i - x) / this.cols;
        const k = this.dirty;
        if (!k) {
            this.dirty = { x0: x, y0: y, x1: x, y1: y };
        } else {
            if (x < k.x0) k.x0 = x;
            if (x > k.x1) k.x1 = x;
            if (y < k.y0) k.y0 = y;
            if (y > k.y1) k.y1 = y;
        }
    }

    flush() {
        const k = this.dirty;
        if (!k) return;
        this.ctx.putImageData(this.image, 0, 0, k.x0, k.y0, k.x1 - k.x0 + 1, k.y1 - k.y0 + 1);
        this.dirty = null;
    }
}

class MapDoc {
    constructor({ id, width, height, tile, gridW, gridH }) {
        this.id = id;
        this.width = width;
        this.height = height;
        this.tile = { path: tile.path, width: tile.width, height: tile.height, cols: tile.cols, rows: tile.rows, ext: tile.ext };
        this.objects = [];
        this.nextUid = 1;
        this.savePath = null;         // 相对 remote 的保存路径
        this.saveHandle = null;       // 另存到授权目录之外时的文件句柄
        this.confirmOverwrite = true; // 首次保存到 savePath 时若文件已存在需确认
        this.modified = false;
        this.initGrid(gridW, gridH);
    }

    get name() { return `Map${this.id}`; }

    static gridSize(width, height, cellW, cellH) {
        return { cols: Math.max(1, Math.ceil(width / cellW)), rows: Math.max(1, Math.ceil(height / cellH)) };
    }

    initGrid(cellW, cellH) {
        this.cellW = cellW;
        this.cellH = cellH;
        ({ cols: this.cols, rows: this.rows } = MapDoc.gridSize(this.width, this.height, cellW, cellH));
        const n = this.cols * this.rows;
        this.blocks = new Uint8Array(n);   // 1 = 不可移动
        this.blockCount = 0;
        this.res = new Map();              // 格子索引 → [{ id, weight }]
        this.blockLayer = new CellLayer(this.cols, this.rows);
        this.resLayer = new CellLayer(this.cols, this.rows);
        this.occ = new Int32Array(n);      // 格子索引 → 占据该格的物体 uid
        this.conflicts = new Set();        // 与其它物体重叠或超出地图的物体
        this.occDirty = true;
    }

    idx(x, y) { return y * this.cols + x; }
    inBounds(x, y) { return x >= 0 && y >= 0 && x < this.cols && y < this.rows; }
    cellAt(wx, wy) { return { x: Math.floor(wx / this.cellW), y: Math.floor(wy / this.cellH) }; }

    /* ---------- 标记 ---------- */

    setBlock(i, v) {
        v = v ? 1 : 0;
        if (this.blocks[i] === v) return false;
        this.blocks[i] = v;
        this.blockCount += v ? 1 : -1;
        if (v) this.blockLayer.set(i, ...BLOCK_RGBA);
        else this.blockLayer.set(i, 0, 0, 0, 0);
        return true;
    }

    setRes(i, list) {
        if (list && list.length) this.res.set(i, list);
        else this.res.delete(i);
        this._paintRes(i);
    }

    /** 同一格多个资源ID：各ID颜色以半透明依次叠加 */
    _paintRes(i) {
        const list = this.res.get(i);
        if (!list) {
            this.resLayer.set(i, 0, 0, 0, 0);
            return;
        }
        let r = 0, g = 0, b = 0, a = 0;
        for (const e of list) {
            const [cr, cg, cb] = resColor(e.id);
            r = cr * RES_ALPHA + r * (1 - RES_ALPHA);
            g = cg * RES_ALPHA + g * (1 - RES_ALPHA);
            b = cb * RES_ALPHA + b * (1 - RES_ALPHA);
            a = RES_ALPHA + a * (1 - RES_ALPHA);
        }
        this.resLayer.set(i, Math.round(r / a), Math.round(g / a), Math.round(b / a), Math.round(Math.min(a, 0.85) * 255));
    }

    resStats() {
        let entries = 0;
        const ids = new Map();
        for (const list of this.res.values()) {
            for (const e of list) {
                entries++;
                ids.set(e.id, (ids.get(e.id) || 0) + 1);
            }
        }
        return { cells: this.res.size, entries, ids: [...ids].sort((a, b) => a[0] - b[0]) };
    }

    /* ---------- 物体 ---------- */

    /** 占格区域：以放置格 (gridX, gridY) 为中心；偶数尺寸时中心落在格线交点上。0×0 表示不占格（可穿透） */
    footprint(o) {
        const w = Math.max(1, o.areaX | 0), hh = Math.max(1, o.areaY | 0);
        const x0 = o.gridX - Math.floor(w / 2), y0 = o.gridY - Math.floor(hh / 2);
        return { x0, y0, x1: x0 + w - 1, y1: y0 + hh - 1, w, h: hh, passable: !(o.areaX > 0) && !(o.areaY > 0) };
    }

    /** 物体中心像素坐标（图片中心，即导出的 x / y） */
    center(o) {
        const f = this.footprint(o);
        return { x: (f.x0 + f.w / 2) * this.cellW, y: (f.y0 + f.h / 2) * this.cellH };
    }

    /** 使占格区域中心最接近世界坐标 (wx, wy) 的放置格 */
    anchorFor(wx, wy, areaX, areaY) {
        const w = Math.max(1, areaX | 0), hh = Math.max(1, areaY | 0);
        return {
            x: w % 2 ? Math.floor(wx / this.cellW) : Math.round(wx / this.cellW),
            y: hh % 2 ? Math.floor(wy / this.cellH) : Math.round(wy / this.cellH),
        };
    }

    findObject(uid) {
        return uid ? this.objects.find(o => o.uid === uid) || null : null;
    }

    ensureOcc() {
        if (!this.occDirty) return;
        this.occ.fill(0);
        this.conflicts.clear();
        for (const o of this.objects) {
            const f = this.footprint(o);
            if (f.x0 < 0 || f.y0 < 0 || f.x1 >= this.cols || f.y1 >= this.rows) this.conflicts.add(o.uid);
            for (let y = Math.max(0, f.y0); y <= Math.min(this.rows - 1, f.y1); y++) {
                for (let x = Math.max(0, f.x0); x <= Math.min(this.cols - 1, f.x1); x++) {
                    const i = this.idx(x, y), u = this.occ[i];
                    if (u && u !== o.uid) {
                        this.conflicts.add(u);
                        this.conflicts.add(o.uid);
                    } else {
                        this.occ[i] = o.uid;
                    }
                }
            }
        }
        this.occDirty = false;
    }

    /** 能否放置：不能超出地图，不能与其它物体的占格区域重叠 */
    checkPlace(gx, gy, areaX, areaY, ignoreUid = 0) {
        this.ensureOcc();
        const f = this.footprint({ gridX: gx, gridY: gy, areaX, areaY });
        if (f.x0 < 0 || f.y0 < 0 || f.x1 >= this.cols || f.y1 >= this.rows) return { ok: false, reason: '超出地图范围' };
        for (let y = f.y0; y <= f.y1; y++) {
            for (let x = f.x0; x <= f.x1; x++) {
                const u = this.occ[this.idx(x, y)];
                if (u && u !== ignoreUid) return { ok: false, reason: '目标格子已被其它物体占据' };
            }
        }
        return { ok: true };
    }

    snapshotObjects() {
        return { objects: this.objects.map(cloneObj), nextUid: this.nextUid };
    }

    restoreObjects(s) {
        this.objects = s.objects.map(cloneObj);
        this.nextUid = s.nextUid;
        this.occDirty = true;
    }

    /* ---------- 格子尺寸 ---------- */

    snapshotAll() {
        return {
            cellW: this.cellW, cellH: this.cellH,
            blocks: this.blocks.slice(),
            res: [...this.res].map(([i, l]) => [i, cloneResList(l)]),
            objects: this.snapshotObjects(),
        };
    }

    restoreAll(s) {
        this.initGrid(s.cellW, s.cellH);
        for (let i = 0; i < s.blocks.length; i++) if (s.blocks[i]) this.setBlock(i, 1);
        for (const [i, l] of s.res) this.setRes(i, cloneResList(l));
        this.restoreObjects(s.objects);
    }

    /** 修改逻辑格子尺寸：标记按新格子中心点重新采样，物体保持像素中心位置 */
    resampleGrid(cellW, cellH) {
        const old = { cols: this.cols, rows: this.rows, cellW: this.cellW, cellH: this.cellH, blocks: this.blocks, res: this.res };
        const centers = this.objects.map(o => this.center(o));
        this.initGrid(cellW, cellH);
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const ox = Math.floor(((x + 0.5) * cellW) / old.cellW);
                const oy = Math.floor(((y + 0.5) * cellH) / old.cellH);
                if (ox >= old.cols || oy >= old.rows) continue;
                const oi = oy * old.cols + ox, i = this.idx(x, y);
                if (old.blocks[oi]) this.setBlock(i, 1);
                else if (old.res.has(oi)) this.setRes(i, cloneResList(old.res.get(oi)));
            }
        }
        this.objects.forEach((o, k) => {
            const a = this.anchorFor(centers[k].x, centers[k].y, o.areaX, o.areaY);
            o.gridX = a.x;
            o.gridY = a.y;
        });
        this.occDirty = true;
    }

    /* ---------- 序列化 ---------- */

    toJSON() {
        const blocks = new Array(this.rows);
        const row = new Array(this.cols);
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) row[x] = this.blocks[y * this.cols + x] ? '1' : '0';
            blocks[y] = row.join('');
        }
        const resources = [...this.res]
            .sort((a, b) => a[0] - b[0])
            .map(([i, list]) => ({ x: i % this.cols, y: Math.floor(i / this.cols), list: cloneResList(list) }));
        const objects = this.objects.map(o => {
            const c = this.center(o);
            return {
                uid: o.uid, showUrl: o.showUrl, resType: o.resType, type: o.type,
                areaX: o.areaX, areaY: o.areaY, params: o.params.slice(),
                gridX: o.gridX, gridY: o.gridY, x: c.x, y: c.y,
            };
        });
        return {
            version: 1,
            id: this.id,
            name: this.name,
            width: this.width,
            height: this.height,
            tile: { ...this.tile },
            grid: { width: this.cellW, height: this.cellH, cols: this.cols, rows: this.rows },
            blocks,
            resources,
            objects,
        };
    }

    static fromJSON(data) {
        if (!data || typeof data !== 'object') throw new Error('不是有效的地图配置');
        const need = (v, name) => {
            if (!(Number(v) > 0)) throw new Error(`缺少或无效的字段: ${name}`);
            return Number(v);
        };
        const width = need(data.width, 'width'), height = need(data.height, 'height');
        const gw = need(data.grid?.width, 'grid.width'), gh = need(data.grid?.height, 'grid.height');
        if (!data.tile?.path) throw new Error('缺少字段: tile.path');
        const { cols, rows } = MapDoc.gridSize(width, height, gw, gh);
        if (cols * rows > MAX_GRID_CELLS) throw new Error(`逻辑格子数量过多 (${cols}×${rows})`);

        const doc = new MapDoc({ id: toInt(data.id, 1), width, height, tile: data.tile, gridW: gw, gridH: gh });
        const warnings = [];

        const blocks = Array.isArray(data.blocks) ? data.blocks : [];
        for (let y = 0; y < Math.min(blocks.length, doc.rows); y++) {
            const line = String(blocks[y]);
            for (let x = 0; x < Math.min(line.length, doc.cols); x++) {
                if (line.charCodeAt(x) === 49) doc.setBlock(doc.idx(x, y), 1);
            }
        }

        let skipped = 0;
        for (const r of Array.isArray(data.resources) ? data.resources : []) {
            const x = toInt(r?.x, -1), y = toInt(r?.y, -1);
            if (!doc.inBounds(x, y) || doc.blocks[doc.idx(x, y)]) { skipped++; continue; }
            const list = [];
            for (const e of Array.isArray(r.list) ? r.list : []) {
                const id = toInt(e?.id, NaN);
                if (!Number.isFinite(id)) continue;
                const weight = Number.isFinite(Number(e.weight)) ? Number(e.weight) : 1;
                const same = list.find(q => q.id === id);
                if (same) same.weight = weight;
                else list.push({ id, weight });
            }
            doc.setRes(doc.idx(x, y), list);
        }
        if (skipped) warnings.push(`${skipped} 个资源点位于地图外或不可移动格上，已忽略`);

        const objs = Array.isArray(data.objects) ? data.objects : [];
        let maxUid = 0;
        for (const o of objs) maxUid = Math.max(maxUid, toInt(o?.uid, 0));
        const used = new Set();
        for (const o of objs) {
            if (!o || typeof o.showUrl !== 'string' || !o.showUrl) continue;
            let uid = toInt(o.uid, 0);
            if (uid <= 0 || used.has(uid)) uid = ++maxUid;
            used.add(uid);
            const areaX = clamp(toInt(o.areaX, 1), 0, 99), areaY = clamp(toInt(o.areaY, 1), 0, 99);
            let gx = toInt(o.gridX, NaN), gy = toInt(o.gridY, NaN);
            if (!Number.isFinite(gx) || !Number.isFinite(gy)) {
                if (!Number.isFinite(Number(o.x)) || !Number.isFinite(Number(o.y))) continue;
                ({ x: gx, y: gy } = doc.anchorFor(Number(o.x), Number(o.y), areaX, areaY));
            }
            const params = Array.isArray(o.params) ? o.params.map(v => toInt(v, 0)) : parseIntList(o.params) || [];
            doc.objects.push({
                uid, showUrl: o.showUrl, resType: o.resType === 'atlas' ? 'atlas' : 'image',
                type: toInt(o.type, DEFAULT_OBJECT_TYPE), areaX, areaY, params, gridX: gx, gridY: gy,
            });
        }
        doc.nextUid = maxUid + 1;
        doc.occDirty = true;
        doc.loadWarnings = warnings;
        return doc;
    }
}

/** 紧凑可读的 JSON：blocks 每行一个字符串，resources / objects 每项一行 */
function formatMapJson(data) {
    const keys = Object.keys(data);
    const lines = ['{'];
    keys.forEach((k, n) => {
        const v = data[k];
        const comma = n < keys.length - 1 ? ',' : '';
        if (Array.isArray(v) && v.length && (k === 'blocks' || k === 'resources' || k === 'objects')) {
            lines.push(`  ${JSON.stringify(k)}: [`);
            v.forEach((item, j) => lines.push(`    ${JSON.stringify(item)}${j < v.length - 1 ? ',' : ''}`));
            lines.push(`  ]${comma}`);
        } else {
            lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)}${comma}`);
        }
    });
    lines.push('}');
    return lines.join('\n') + '\n';
}

/* ---------- 撤销 / 重做 ---------- */

class History {
    constructor(onChange, limit = 300) {
        this.undoStack = [];
        this.redoStack = [];
        this.onChange = onChange;
        this.limit = limit;
    }

    push(entry) {
        this.undoStack.push(entry);
        if (this.undoStack.length > this.limit) this.undoStack.shift();
        this.redoStack.length = 0;
        this.onChange?.(true);
    }

    undo() {
        const e = this.undoStack.pop();
        if (!e) return null;
        e.undo();
        this.redoStack.push(e);
        this.onChange?.(true);
        return e;
    }

    redo() {
        const e = this.redoStack.pop();
        if (!e) return null;
        e.redo();
        this.undoStack.push(e);
        this.onChange?.(true);
        return e;
    }

    clear() {
        this.undoStack.length = 0;
        this.redoStack.length = 0;
        this.onChange?.(false);
    }

    get canUndo() { return this.undoStack.length > 0; }
    get canRedo() { return this.redoStack.length > 0; }
}

/** 一次标记笔画（单击 / 拖动 / 矩形）涉及的格子变化，作为一条撤销记录 */
class CellStroke {
    constructor(doc, label) {
        this.doc = doc;
        this.label = label;
        this.before = new Map();       // 格子索引 → [block, resList]
        this.clearedRes = new Set();   // 因标记不可移动而清除了资源点的格子
        this.blockedHits = new Set();  // 试图在不可移动格上放资源点的格子
    }

    touch(i) {
        if (!this.before.has(i)) this.before.set(i, [this.doc.blocks[i], cloneResList(this.doc.res.get(i))]);
    }

    /** 提交到历史；没有实际变化返回 false */
    commit(history, onApply) {
        const doc = this.doc;
        const before = new Map(), after = new Map();
        for (const [i, [b0, r0]] of this.before) {
            const b1 = doc.blocks[i], r1 = cloneResList(doc.res.get(i));
            if (b0 === b1 && sameResList(r0, r1)) continue;
            before.set(i, [b0, r0]);
            after.set(i, [b1, r1]);
        }
        if (!after.size) return false;
        const apply = m => {
            for (const [i, [b, r]] of m) {
                doc.setBlock(i, b);
                doc.setRes(i, cloneResList(r));
            }
            onApply?.();
        };
        history.push({ label: this.label, undo: () => apply(before), redo: () => apply(after) });
        return true;
    }
}
