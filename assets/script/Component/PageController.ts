import { _decorator, Component, Node, Vec2 } from 'cc';
import { BaseComp } from './BaseComp';
import { BasePage } from './BasePage';
import { AssetMgr } from '../Common/AssetMgr';
import { UIMananger } from './UIMananger';
const { ccclass, property } = _decorator;
export interface PAGE_DATA {
    // 预制体路径
    url: string;
    // 页签页面类
    pageClass: new () => BasePage;
    // 页签
    indexPage: number;
    // 页面实例
    instance?: BasePage;
}
@ccclass('PageController')
export class PageController extends BaseComp {
    private _pageList: Map<number, PAGE_DATA> = new Map();
    /** 当前显示的页面实例 */
    public curPage: BasePage;
    /** 当前页面的索引，-1 表示无页面 */
    public curIndex: number = -1;
    /** 切换请求序号，用于丢弃过时的异步结果 */
    private _switchSeq: number = 0;
    /** 最后一次要打开的页 */
    private switch_index = -1;
    /** 同一页正在加载时共用这一次，避免再实例化一份 */
    private page_loading = new Map<number, Promise<BasePage>>();

    public initEvent(): void {
        super.initEvent();
        this.switchPage(1);
    }
    public RegisterPages(pageDatas: PAGE_DATA[]) {
        if (!pageDatas) {
            return;
        }
        pageDatas.forEach(page => {
            this._pageList.set(page.indexPage, page);
        })
    }
    /**
     * 切换到指定页面。
     * 同一页还在加载时复用这一次，不再创建第二份。
     * 过期请求若已经不是要显示的页，把那份节点收起来。
     */
    public async switchPage(index: number, ...param: any[]) {
        const loading = this.switch_index === index ? this.page_loading.get(index) : undefined;
        if (loading) {
            UIMananger.instance.beginLoading();
            try {
                const instance = await loading;
                this.openLoadedPage(index, instance, param);
            } catch (error) {
                console.error(`[PageController] 切换到页面 ${index} 失败:`, error);
            } finally {
                UIMananger.instance.endLoading();
            }
            return;
        }

        const seq = ++this._switchSeq;
        this.switch_index = index;

        if (this.curPage) {
            this.curPage.closePage();
            this.curPage = null;
        }
        this.curIndex = -1;

        const page_data = this._pageList.get(index);
        if (!page_data) {
            console.warn(`[PageController] 页面索引 ${index} 未注册`);
            return;
        }

        UIMananger.instance.beginLoading();
        try {
            if (!page_data.instance) {
                page_data.instance = await this.loadPage(page_data);
            }
            if (seq !== this._switchSeq) {
                if (this.switch_index !== index && page_data.instance) {
                    page_data.instance.closePage();
                }
                console.log(`[PageController] 切换请求 ${index} 已过期，丢弃`);
                return;
            }
            this.openLoadedPage(index, page_data.instance, param);
        } catch (error) {
            console.error(`[PageController] 切换到页面 ${index} 失败:`, error);
        } finally {
            UIMananger.instance.endLoading();
        }
    }

    /** 同一页只创建一次。加载结束就从进行中的表里拿掉，失败可以再试 */
    private loadPage(page_data: PAGE_DATA): Promise<BasePage> {
        const index = page_data.indexPage;
        const loading = this.page_loading.get(index);
        if (loading) {
            return loading;
        }
        const pending = AssetMgr.createPrefabFromPool(
            page_data.url,
            Vec2.ZERO,
            this.node,
            page_data.pageClass,
        ).finally(() => {
            this.page_loading.delete(index);
        });
        this.page_loading.set(index, pending);
        return pending;
    }

    /** 还是这次要打开的页才显示。参数按原样交给页面 */
    private openLoadedPage(index: number, instance: BasePage, param: any[]) {
        if (this.switch_index !== index || !instance) {
            return;
        }
        instance.showPage(...param);
        this.curPage = instance;
        this.curIndex = index;
    }

    /** 获取指定索引的页面实例（如果已创建） */
    public getPageInstance(index: number): BasePage | null {
        const pageData = this._pageList.get(index);
        return pageData?.instance ?? null;
    }
}


