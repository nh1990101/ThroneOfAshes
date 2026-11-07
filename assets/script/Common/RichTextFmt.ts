/** 拼 Cocos RichText 标签。结果交给 RichText.string。 */
export class RichTextFmt {
    /** `<color=#6C862B>text</color>`。六位十六进制可省略 `#`，颜色名原样写入。 */
    public static color(color: string, text: string | number): string {
        return `<color=${RichTextFmt.normalizeColor(color)}>${text}</color>`;
    }

    /** `<size=28>text</size>` */
    public static size(size: number, text: string | number): string {
        return `<size=${size}>${text}</size>`;
    }

    public static bold(text: string | number): string {
        return `<b>${text}</b>`;
    }

    public static italic(text: string | number): string {
        return `<i>${text}</i>`;
    }

    public static underline(text: string | number): string {
        return `<u>${text}</u>`;
    }

    /** `<outline color=#000000 width=2>text</outline>` */
    public static outline(color: string, width: number, text: string | number): string {
        return `<outline color=${RichTextFmt.normalizeColor(color)} width=${width}>${text}</outline>`;
    }

    public static br(): string {
        return '<br/>';
    }

    /**
     * `<img src='frameName' height=32 align=center />`。
     * src 是 RichText 图集里的精灵帧名。
     */
    public static img(src: string, options?: RichTextImgOptions): string {
        const attrs = [`src='${src}'`];
        if (options) {
            if (options.height != null) {
                attrs.push(`height=${options.height}`);
            }
            if (options.width != null) {
                attrs.push(`width=${options.width}`);
            }
            if (options.align) {
                attrs.push(`align=${options.align}`);
            }
        }
        return `<img ${attrs.join(' ')} />`;
    }

    public static join(...parts: Array<string | number>): string {
        let result = '';
        for (let i = 0; i < parts.length; i++) {
            result += parts[i];
        }
        return result;
    }

    private static normalizeColor(color: string): string {
        if (color.startsWith('#')) {
            return color;
        }
        if (/^[0-9a-fA-F]{3}$/.test(color) || /^[0-9a-fA-F]{6}$/.test(color)) {
            return `#${color}`;
        }
        return color;
    }
}

export interface RichTextImgOptions {
    height?: number;
    width?: number;
    align?: 'top' | 'center' | 'bottom';
}
