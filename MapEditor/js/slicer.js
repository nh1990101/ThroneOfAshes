'use strict';
/*
 * 大地图切割：按 tileSize（默认 512）切成 X_Y 命名的地图块，X 为列、Y 为行，从左上角 0_0 开始。
 * 边缘不足 tileSize 的块默认保持实际尺寸（可选补齐）。
 */

const Slicer = {
    TILE_RE: /^(\d+)_(\d+)\.(jpe?g|png|webp)$/i,

    plan(width, height, tileSize) {
        const cols = Math.max(1, Math.ceil(width / tileSize));
        const rows = Math.max(1, Math.ceil(height / tileSize));
        return {
            cols, rows, count: cols * rows,
            edgeW: width - (cols - 1) * tileSize,
            edgeH: height - (rows - 1) * tileSize,
        };
    },

    /** 源图扩展名 → 输出格式 */
    outputExt(fileName) {
        const ext = extName(fileName);
        return ext === 'png' || ext === 'webp' ? ext : 'jpg';
    },

    /** 目录中已有的 X_Y 地图块文件名 */
    async existingTiles(dirPath) {
        if (!(await ResFS.isDir(dirPath))) return [];
        const list = await ResFS.list(dirPath);
        return list.filter(e => e.kind === 'file' && Slicer.TILE_RE.test(e.name)).map(e => e.name);
    },

    /**
     * 切割并写入 dirPath。写完后删除不在本次范围内的旧地图块（连同 .meta）。
     * @param {{bitmap: ImageBitmap, dirPath: string, tileSize: number, quality: number, pad: boolean, ext: string, onProgress?: Function}} opt
     */
    async run({ bitmap, dirPath, tileSize, quality, pad, ext, onProgress }) {
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const W = bitmap.width, H = bitmap.height;
        const { cols, rows, count } = Slicer.plan(W, H, tileSize);
        await ResFS.dir(dirPath, true);
        const before = await Slicer.existingTiles(dirPath);
        const written = new Set();
        let done = 0;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const sw = Math.min(tileSize, W - x * tileSize);
                const sh = Math.min(tileSize, H - y * tileSize);
                const cw = pad ? tileSize : sw, ch = pad ? tileSize : sh;
                const canvas = new OffscreenCanvas(cw, ch);
                const ctx = canvas.getContext('2d');
                if (mime === 'image/jpeg') {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, cw, ch);
                }
                ctx.drawImage(bitmap, x * tileSize, y * tileSize, sw, sh, 0, 0, sw, sh);
                const blob = await canvas.convertToBlob({ type: mime, quality });
                const name = `${x}_${y}.${ext}`;
                await ResFS.write(`${dirPath}/${name}`, blob);
                written.add(name.toLowerCase());
                onProgress?.(++done, count, name);
            }
        }
        let removed = 0;
        for (const name of before) {
            if (written.has(name.toLowerCase())) continue;
            try {
                await ResFS.remove(`${dirPath}/${name}`);
                removed++;
            } catch (e) {
                console.warn('删除旧地图块失败', name, e);
            }
            try { await ResFS.remove(`${dirPath}/${name}.meta`); } catch { /* 没有 meta */ }
        }
        return { cols, rows, count, width: W, height: H, removed };
    },
};
