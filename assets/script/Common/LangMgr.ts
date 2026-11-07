import { game, sys } from 'cc';
import { BaseMgr } from './BaseMgr';

interface LangPackRow {
    id: number;
    raw?: string;
    text?: string;
}

const LANGUAGE_STORAGE_KEY = 'language';
const DEFAULT_LANGUAGE = 'chs';
const LANG_PREFIX = '$Lang$';
export const MISSING_LANG_MARK = '【未翻译】 ';

/** 解压配置之前就要显示的句子。正式语言表加载后，同 id 以表里的为准。 */
const BUILTIN_TEXT: Record<number, string> = {
    7: '正在加载游戏配置',
    8: '正在加载地图配置',
    9: '正在加载资源包',
    10: '正在初始化全局变量',
    11: '正在进入游戏',
    354: '登录失败，请检查网络或资源后重新点击登录',
    355: '连接服务器失败: {url}，请检查服务端是否启动及网络是否可达',
};

export class LangMgr extends BaseMgr {
    private texts = new Map<number, string>();
    private rawTexts = new Map<string, string>();
    private idToRaw = new Map<number, string>();
    private missingRaw = new Set<string>();

    public getLanguage(): string {
        const saved = sys.localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (!saved) {
            return DEFAULT_LANGUAGE;
        }
        return saved;
    }

    public setLanguage(id: string): void {
        sys.localStorage.setItem(LANGUAGE_STORAGE_KEY, id);
        // TODO
        // 语言包在 Loading 里 loadConfigZip 时才选定。现在没有登录界面，只能整包重启。
        // 有登录后改为断线并回到登录，由登录流程重新 loadConfigZip，不要再 game.restart()。
        game.restart();
    }

    /** 先装中文包，再用当前语言包覆盖。中文包带 raw，用来按原文查找预制体文案。 */
    public setTables(
        chsCommon: object[] | null,
        chsGame: object[] | null,
        langCommon: object[] | null,
        langGame: object[] | null,
    ): void {
        this.texts.clear();
        this.rawTexts.clear();
        this.idToRaw.clear();
        this.missingRaw.clear();
        this.consumePack(chsCommon);
        this.consumePack(chsGame);
        this.consumePack(langCommon);
        this.consumePack(langGame);
    }

    private consumePack(rows: object[] | null): void {
        if (!rows) {
            return;
        }
        const list = rows as LangPackRow[];
        for (let i = 0; i < list.length; i++) {
            const row = list[i];
            list[i] = undefined as unknown as LangPackRow;
            if (!row || typeof row.id !== 'number') {
                continue;
            }
            const id = row.id;
            const text = typeof row.text === 'string' ? row.text : '';
            const raw = typeof row.raw === 'string' ? this.stripPrefix(row.raw) : '';
            const columns = row as unknown as Record<string, string | number | undefined>;
            for (const key in columns) {
                columns[key] = undefined;
            }
            if (raw) {
                this.idToRaw.set(id, raw);
            }
            if (!text) {
                continue;
            }
            this.texts.set(id, text);
            const lookup = raw || this.idToRaw.get(id);
            if (lookup) {
                this.rawTexts.set(lookup, text);
            }
        }
    }

    /** 配置解压完成后，把各表里 $Lang$ 开头的字符串换成译文。 */
    public replaceConfig(root: object): void {
        const seen = new WeakSet<object>();
        const target = root as Record<string, unknown>;
        for (const key of Object.keys(target)) {
            if (key === 'zip') {
                continue;
            }
            target[key] = this.replaceValue(target[key], seen);
        }
    }

    public translateRaw(key: string): string {
        const lookup = this.stripPrefix(key);
        const text = this.rawTexts.get(lookup);
        if (text) {
            return text;
        }
        if (!this.missingRaw.has(lookup)) {
            this.missingRaw.add(lookup);
            console.warn(`文案未翻译: ${lookup}`);
        }
        return MISSING_LANG_MARK + lookup;
    }

    /** 把文本里的 $Lang$原文 换成译文。没有这个前缀则原样返回。 */
    public translateText(value: string): string {
        if (!value.includes(LANG_PREFIX)) {
            return value;
        }
        return value.replace(/\$Lang\$[^<]+/g, (token) => this.translateRaw(token.trim()));
    }

    private stripPrefix(key: string): string {
        if (key.startsWith(LANG_PREFIX)) {
            return key.slice(LANG_PREFIX.length);
        }
        return key;
    }

    private replaceValue(value: unknown, seen: WeakSet<object>): unknown {
        if (typeof value === 'string') {
            if (!value.startsWith(LANG_PREFIX)) {
                return value;
            }
            return this.translateRaw(value);
        }
        if (!value || typeof value !== 'object' || ArrayBuffer.isView(value)) {
            return value;
        }
        if (seen.has(value)) {
            return value;
        }
        seen.add(value);
        if (value instanceof Map) {
            for (const [key, item] of value) {
                const next = this.replaceValue(item, seen);
                if (next !== item) {
                    value.set(key, next);
                }
            }
            return value;
        }
        if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                value[i] = this.replaceValue(value[i], seen);
            }
            return value;
        }
        if (value.constructor !== Object) {
            return value;
        }
        const record = value as Record<string, unknown>;
        for (const key in record) {
            record[key] = this.replaceValue(record[key], seen);
        }
        return value;
    }

    public translate(id: number, args?: Record<string, string | number>): string {
        let text = this.texts.get(id);
        if (!text) {
            text = BUILTIN_TEXT[id];
        }
        if (!text) {
            console.warn(`文案未翻译: ${id}`);
            text = MISSING_LANG_MARK + String(id);
        }
        return this.fill(text, args);
    }

    private fill(text: string, args?: Record<string, string | number>): string {
        if (!args) {
            return text;
        }
        return text.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) => {
            const value = args[name];
            if (value === undefined || value === null) {
                return match;
            }
            return String(value);
        });
    }
}

type LangArgs = Record<string, string | number>;

function langCall(id: number, args?: LangArgs): string {
    return LangMgr.getInstance().translate(id, args);
}

type LangFn = ((id: number, args?: LangArgs) => string) & Record<string, string>;

/** 按翻译表 id 取当前语言。lang["$Lang$原文"] 按原文取，会先去掉 $Lang$。参数替换 {name}。 */
export const lang: LangFn = new Proxy(langCall, {
    get(target, prop, receiver) {
        if (typeof prop !== 'string' || prop in target) {
            return Reflect.get(target, prop, receiver);
        }
        return LangMgr.getInstance().translateRaw(prop);
    },
}) as LangFn;
