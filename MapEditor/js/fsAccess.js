'use strict';
/*
 * 本地目录读写（File System Access API，需 Chrome / Edge）。
 * 授权目录为项目的 assets/remote，所有路径都相对它，与运行时 remoteBundle.load() 的路径一致，
 * 例如 "Res/Map/MapGrid/Map1"。若用户选的是项目根目录 / assets / Res / Map 目录，会自动定位。
 */

const ResFS = (() => {
    const DB_NAME = 'rpg-map-editor';
    const STORE = 'kv';
    let root = null;   // FileSystemDirectoryHandle
    let prefix = [];   // root 代表的路径前缀，选的是 remote 时为 []，选的是 Map 目录时为 ['Res','Map']
    let label = '';

    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(STORE);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
    async function dbGet(key) {
        try {
            const db = await openDB();
            return await new Promise((resolve, reject) => {
                const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        } catch (e) {
            console.warn('IndexedDB 不可用', e);
            return undefined;
        }
    }
    async function dbSet(key, value) {
        try {
            const db = await openDB();
            await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE, 'readwrite');
                tx.objectStore(STORE).put(value, key);
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });
        } catch (e) {
            console.warn('IndexedDB 不可用，下次打开需要重新选择目录', e);
        }
    }

    const split = p => String(p || '').split(/[\\/]+/).filter(s => s && s !== '.');

    function local(path) {
        if (!root) throw new Error('尚未选择资源目录');
        const segs = split(path);

        // 如果是项目根目录，支持访问assets/remote和sharedata
        if (ResFS.isProjectRoot) {
            // 路径可以是 assets/remote/Res/... 或 sharedata/...
            return segs;
        }

        for (let i = 0; i < prefix.length; i++) {
            if ((segs[i] || '').toLowerCase() !== prefix[i].toLowerCase()) {
                throw new Error(`路径不在已授权的目录内: ${path}`);
            }
        }
        return segs.slice(prefix.length);
    }

    async function sub(dir, segs) {
        for (const s of segs) {
            try { dir = await dir.getDirectoryHandle(s); } catch { return null; }
        }
        return dir;
    }

    /** 从用户选的目录定位出 remote 根目录和项目根目录 */
    async function locate(picked) {
        console.log('locate: 检查目录', picked.name);

        // 检查是否选择了项目根目录（包含assets和sharedata）
        const hasAssets = await sub(picked, ['assets']);
        const hasSharedata = await sub(picked, ['sharedata']);
        const hasAssetsRemote = await sub(picked, ['assets', 'remote', 'Res', 'Map']);

        console.log('locate: hasAssets =', !!hasAssets, ', hasSharedata =', !!hasSharedata, ', hasAssetsRemote =', !!hasAssetsRemote);

        if (hasAssets && hasSharedata && hasAssetsRemote) {
            // 这是项目根目录，返回它本身，这样可以访问sharedata
            console.log('✅ 识别为项目根目录');
            return { handle: picked, prefix: [], isProjectRoot: true };
        }

        if (await sub(picked, ['Res', 'Map'])) {
            console.log('识别为remote目录');
            return { handle: picked, prefix: [], isProjectRoot: false };
        }

        for (const segs of [['remote'], ['assets', 'remote']]) {
            const d = await sub(picked, segs);
            if (d && await sub(d, ['Res', 'Map'])) {
                console.log('识别为assets或其父目录');
                return { handle: d, prefix: [], isProjectRoot: false };
            }
        }

        if (picked.name.toLowerCase() === 'res' && await sub(picked, ['Map'])) {
            console.log('识别为Res目录');
            return { handle: picked, prefix: ['Res'], isProjectRoot: false };
        }

        if (await sub(picked, ['MapGrid']) || await sub(picked, ['MapObject'])) {
            console.log('识别为Map目录');
            return { handle: picked, prefix: ['Res', 'Map'], isProjectRoot: false };
        }

        console.warn('❌ 无法识别目录类型');
        return null;
    }

    async function dirHandle(path, create = false) {
        let d = root;
        for (const s of local(path)) d = await d.getDirectoryHandle(s, { create });
        return d;
    }

    async function fileHandle(path, create = false) {
        const segs = local(path);
        const name = segs.pop();
        if (!name) throw new Error(`无效的文件路径: ${path}`);
        let d = root;
        for (const s of segs) d = await d.getDirectoryHandle(s, { create });
        return d.getFileHandle(name, { create });
    }

    let isProjectRoot = false;

    function use(handle, pre = [], name = '', isProjRoot = false) {
        root = handle;
        prefix = pre;
        label = name || handle.name;
        isProjectRoot = isProjRoot;
    }

    return {
        get supported() { return typeof window.showDirectoryPicker === 'function'; },
        get ready() { return !!root; },
        get label() { return label; },
        get rootHandle() { return root; },
        get isProjectRoot() { return isProjectRoot; },
        use,

        /** 弹出目录选择（必须在用户点击事件中调用） */
        async pick() {
            const picked = await window.showDirectoryPicker({ id: 'rpg-map-editor-root', mode: 'readwrite' });
            const found = await locate(picked);
            if (!found) throw new Error(`”${picked.name}” 中没有找到 Res/Map，请选择项目根目录（RPGCore）或 assets/remote 目录`);
            use(found.handle, found.prefix, picked.name, found.isProjectRoot);
            await dbSet('root', { handle: found.handle, prefix: found.prefix, isProjectRoot: found.isProjectRoot });
        },

        async savedName() {
            const s = await dbGet('root');
            return s?.handle?.name || '';
        },

        /** 恢复上次的目录。request=true 时会请求权限（需用户手势）。返回 'ok' | 'prompt' | 'none' */
        async restore(request) {
            const s = await dbGet('root');
            if (!s?.handle) return 'none';
            let perm = await s.handle.queryPermission({ mode: 'readwrite' });
            if (perm !== 'granted' && request) perm = await s.handle.requestPermission({ mode: 'readwrite' });
            if (perm !== 'granted') return 'prompt';

            console.log('restore: 恢复目录，isProjectRoot =', s.isProjectRoot);
            use(s.handle, s.prefix || [], s.handle.name, s.isProjectRoot || false);
            console.log('restore: 恢复后 ResFS.isProjectRoot =', isProjectRoot);
            return 'ok';
        },

        dir: dirHandle,
        file: fileHandle,

        async isDir(path) {
            try { await dirHandle(path); return true; } catch { return false; }
        },
        async isFile(path) {
            try { await fileHandle(path); return true; } catch { return false; }
        },

        /** 列目录：[{ name, kind: 'file'|'directory', handle }]，自然排序 */
        async list(path) {
            const d = await dirHandle(path);
            const out = [];
            for await (const [name, handle] of d.entries()) out.push({ name, kind: handle.kind, handle });
            out.sort((a, b) => naturalCompare(a.name, b.name));
            return out;
        },

        async read(path) {
            return (await fileHandle(path)).getFile();
        },

        /** 写文件（自动创建目录），data: Blob | string | ArrayBuffer */
        async write(path, data) {
            const fh = await fileHandle(path, true);
            const w = await fh.createWritable();
            try {
                await w.write(data);
                await w.close();
            } catch (e) {
                try { await w.abort(); } catch { /* ignore */ }
                throw e;
            }
        },

        async remove(path) {
            const segs = local(path);
            const name = segs.pop();
            let d = root;
            for (const s of segs) d = await d.getDirectoryHandle(s);
            await d.removeEntry(name);
        },

        /** 句柄 → 相对 remote 的路径，不在授权目录内返回 null */
        async relPath(handle) {
            if (!root || !handle) return null;
            try {
                const segs = await root.resolve(handle);
                return segs ? [...prefix, ...segs].join('/') : null;
            } catch {
                return null;
            }
        },
    };
})();
