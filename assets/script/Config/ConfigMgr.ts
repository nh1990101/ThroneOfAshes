import { _decorator, Asset, Component, JsonAsset, loader, Node, resources } from 'cc';
import { DEBUG } from 'cc/env';
import { AssetMgr } from '../Common/AssetMgr';
import { IStringChTbl } from './Typings/string_ch_tbl';
import { IFunctionPropTbl } from './Typings/function_prop_tbl';
import { IUnitData } from './Typings/UnitData';
const { ccclass, property } = _decorator;



export class ConfigMgr {
    private zip: JSZip = null;
    private static _instance: ConfigMgr;

    public string_ch_tbl = new Map<number, IStringChTbl>();
    public string_ch_tb2 = new Map<number, IStringChTbl>();
    public function_prop_tbl = new Map<number, IFunctionPropTbl>();
    public UnitData = new Map<number, IUnitData>();
    /**主键调整表 
    * 表名：主键字符串
   */
    TABLE_PRIMARY_KEYS: Record<string, string> = {
        function_prop_tbl: "ID",
        unitData_tbl: "id",
        // 其他表...
    };

    static get instance(): ConfigMgr {
        if (!this._instance) {
            this._instance = new ConfigMgr;
        }
        return this._instance;
    }

    async loadConfigZip() {
        return new Promise<void>(async (resolve, reject) => {
            try {
                let file: Asset;

                if (DEBUG) {
                    // await this.loadGuideConfig();

                    file = await this.loadResourceFile("ConfigForClient");
                } else {
                    file = await AssetMgr.getRemoteResByUrl(AssetMgr.getConfigUrl(), Asset, ".zip");
                }

                await this.unzip(file);
                resolve();
            } catch (error) {
                console.error("Config load failed:", error);
                reject(error);
            }
        });
    }

    async loadResourceFile(path: string): Promise<Asset> {
        return new Promise((resolve, reject) => {
            resources.load(path, Asset, (err, asset) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(asset);
                }
            });
        });
    }


    successDownConfig(file: Asset) {
        if (file) {
            // this.lb_notice.string = "解压中...";
            console.log("解压中")
            this.unzip(file);
        } else {
            console.log("下载失败")
            // this.lb_notice.string = "下载失败";
        }
    }

    private async unzip(file: Asset) {

        try {
            // 读取ZIP二进制数据
            //const arrayBuffer = await this.readFileAsArrayBuffer(file);
            const arrayBuffer = await this.loadFileArrayBuffer(file);

            // 初始化JSZip
            this.zip = new JSZip();
            await this.zip.loadAsync(arrayBuffer);

            // 获取ZIP内文件列表
            const files = Object.keys(this.zip.files);


            //解释并赋值配置
            while (files.length > 0) {
                const tableName = files.shift();
                const content = await this.zip.file(tableName).async('text');
                const obj = JSON.parse(content)
                let proName = tableName.replace(/\.[^/.]+$/, "");
                if (this[proName] instanceof Map) {

                    let firstKey = this.TABLE_PRIMARY_KEYS[proName]
                    if (!firstKey) {
                        firstKey = Object.keys(obj[0])[0];
                    }

                    this[proName] = new Map(obj.map(item => [item[firstKey], item]));
                }
                else {

                    this[proName] = obj;
                }

            }
            this.afterConfigInit();
        } catch (error) {

            console.error(error);
        }
    }
    private loadFileArrayBuffer(file: Asset): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            loader.load({ url: file.nativeUrl, type: "binary" }, (err, data) => {
                err ? reject(err) : resolve(data);
            });
        });
    }

    private readFileAsArrayBuffer(file: Asset): Promise<ArrayBuffer> {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', file.nativeUrl, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = () => resolve(xhr.response);
            xhr.send();
        });
    }
    /**配置初始化后马上执行的函数 */
    private afterConfigInit() {
        // CondictionMgr.getInstance().config = this.condition_tbl;
    }
}


