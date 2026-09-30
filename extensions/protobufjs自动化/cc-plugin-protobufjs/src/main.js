"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = exports.unload = exports.load = void 0;
const child_process_1 = __importDefault(require("child_process"));
const config_1 = __importDefault(require("./config"));
const log_1 = __importDefault(require("./log"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const lib_file_1 = __importStar(require("../../@libs/lib_file"));
const cjson_1 = __importDefault(require("cjson"));
const model = new (class {
    constructor() {
        /* --------------- public --------------- */
        /** 配置文件名 */
        this.config_name_s = ".protobufjs.js";
        /** 配置文件路径 */
        this.config_path_s = path_1.default.join(Editor.Project.path, this.config_name_s);
        /** 监听对象列表 */
        this.watch_as = [];
        /** 配置修改定时器 */
        this.config_modify_timer = null;
        /** 文件修改时间表 */
        this.file_modify_time_tab = {};
    }
    /* --------------- private --------------- */
    /* ------------------------------- 功能 ------------------------------- */
    /** 取消监听 */
    unlisten() {
        this.watch_as.splice(0, this.watch_as.length).forEach((v) => v.close());
    }
})();
function load() {
    Promise.resolve()
        // 检查配置文件
        .then(() => __awaiter(this, void 0, void 0, function* () {
        // 不存在则复制
        if (!fs_1.default.existsSync(model.config_path_s)) {
            fs_1.default.copyFileSync(path_1.default.join(config_1.default.resources_path_s, model.config_name_s), model.config_path_s);
        }
        // 更新配置文件
        delete require.cache[model.config_path_s.replace("/", "\\")];
        model.config = require(model.config_path_s);
    }))
        // 监听配置文件变更
        .then(() => {
        // 初始化
        exports.methods.event_config_change();
        // 监听配置文件变更
        fs_1.default.watchFile(model.config_path_s, exports.methods.event_config_change);
    });
}
exports.load = load;
function unload() {
    // 取消所有监听
    model.unlisten();
    // 取消监听配置文件变更
    fs_1.default.unwatchFile(model.config_path_s, exports.methods.event_config_change);
}
exports.unload = unload;
exports.methods = {
    /** 使用说明 */
    instructions_for_use() {
        log_1.default.log([
            "点击箭头展开以阅读",
            `> 配置文件路径：项目根目录/${model.config_name_s}`,
            "`",
            "> 快速入门：",
            "1. 如果你没有安装 protobufjs，那么点击 `安装/NPM 方式` 即可",
            "2. 如果你已经安装 protobufjs，那么去配置文件看看吧",
            "——————————————————————————————",
            "欢迎使用本插件，开始享受 protobufjs 带来的快乐吧。",
            "支持正版插件才是我开发的动力，感谢您的支持。",
        ].join("\n"));
    },
    /** 构建 */
    build() {
        return __awaiter(this, void 0, void 0, function* () {
            exports.methods._build_list(model.config.proto_list);
        });
    },
    /** 强制构建 */
    force_build() {
        return __awaiter(this, void 0, void 0, function* () {
            exports.methods._build_list(model.config.proto_list, true);
        });
    },
    /** 安装（来自 NPM） */
    install_from_npm() {
        log_1.default.log("开始安装 - NPM");
        Promise.resolve()
            // 安装 protobufjs
            .then(() => {
            log_1.default.log("安装 protobufjs 中...");
            return new Promise((resolve_f, reject_f) => {
                child_process_1.default.exec("npm i protobufjs@7.2.5 --save", {
                    cwd: path_1.default.normalize(Editor.Project.path),
                }, (error, stdout, stderr) => {
                    if (error) {
                        reject_f(new Error(stderr));
                        return;
                    }
                    resolve_f(stderr);
                });
            });
        })
            // 安装 protobufjs-cli
            .then(() => {
            log_1.default.log("安装 protobufjs-cli 中...");
            return new Promise((resolve_f, reject_f) => {
                child_process_1.default.exec("npm i protobufjs-cli@1.1.2 --save-dev", {
                    cwd: path_1.default.normalize(Editor.Project.path),
                }, (error, stdout, stderr) => {
                    if (error) {
                        reject_f(new Error(stderr));
                        return;
                    }
                    resolve_f(stderr);
                });
            });
        })
            // 修改 tsconfig
            .then(() => {
            log_1.default.log("确认 tsconfig 配置...");
            const tsconfig = cjson_1.default.load(path_1.default.join(Editor.Project.path, "tsconfig.json"));
            if (!tsconfig) {
                log_1.default.error("安装失败", "项目缺失 tsconfig.json");
                return Promise.reject("");
            }
            if (tsconfig.compilerOptions.esModuleInterop) {
                return;
            }
            tsconfig.compilerOptions.esModuleInterop = true;
            fs_1.default.writeFileSync(path_1.default.join(Editor.Project.path, "tsconfig.json"), JSON.stringify(tsconfig));
        })
            .catch((error) => {
            log_1.default.error("安装失败", error.message);
            return Promise.reject("");
        })
            .then(() => {
            log_1.default.log("安装成功");
        });
    },
    /** 安装（来自文件） */
    install_from_file() {
        log_1.default.log("开始安装 - 文件");
        Promise.resolve()
            // 导入文件
            .then(() => {
            Editor.Message.send("asset-db", "import-asset", path_1.default.join(config_1.default.resources_path_s, "@protobufjs"), "db://assets/@protobufjs");
        })
            // 安装 protobufjs-cli
            .then(() => {
            log_1.default.log("安装 protobufjs-cli 中...");
            return new Promise((resolve_f, reject_f) => {
                child_process_1.default.exec("npm i protobufjs-cli@1.1.2 --save-dev", {
                    cwd: path_1.default.normalize(Editor.Project.path),
                }, (error, stdout, stderr) => {
                    if (error) {
                        reject_f(new Error(stderr));
                        return;
                    }
                    resolve_f(stderr);
                });
            });
        })
            // 修改 tsconfig
            .then(() => {
            log_1.default.log("确认 tsconfig 配置...");
            const tsconfig = cjson_1.default.load(path_1.default.join(Editor.Project.path, "tsconfig.json"));
            if (!tsconfig) {
                log_1.default.error("安装失败", "项目缺失 tsconfig.json");
                return Promise.reject("");
            }
            if (tsconfig.compilerOptions.allowUmdGlobalAccess) {
                return;
            }
            tsconfig.compilerOptions.allowUmdGlobalAccess = true;
            fs_1.default.writeFileSync(path_1.default.join(Editor.Project.path, "tsconfig.json"), JSON.stringify(tsconfig));
        })
            .catch((error) => {
            log_1.default.error("安装失败", error.message);
            return Promise.reject("");
        })
            .then(() => {
            log_1.default.log("安装成功");
        });
    },
    /** 安装说明 */
    install_instructions() {
        log_1.default.log([
            "点击箭头展开以阅读",
            "NPM 方式：自动安装 protobufjs npm 包的最新版本，可通过 manifest 方式热更，不可通过 bundle 方式热更",
            "导入文件方式：导入 protobufjs 的 ts 及 d.ts 文件至 assets/@protobufjs，可通过 manifest 方式热更，可通过 bundle 方式热更（注意加载顺序）",
        ].join("\n"));
    },
    /**
     * 构建列表
     * @param build_as_ 构建列表
     * @param force_b_ 强制构建
     */
    _build_list(build_as_, force_b_ = false) {
        return __awaiter(this, void 0, void 0, function* () {
            log_1.default.log("开始构建");
            /** 构建成功列表 */
            const build_success_as = [];
            /** 构建失败列表 */
            const build_fail_as = [];
            /** 跳过构建列表 */
            const skip_build_as = [];
            /** 还原文件 */
            const reset_proto_path_ss = [];
            // 执行构建任务
            for (const v of build_as_) {
                /** 需要构建状态 */
                let need_build_b = force_b_;
                /** 协议文件路径列表 */
                const proto_path_ss = [];
                // 更新构建文件表
                v.proto_ss.forEach((v2_s) => {
                    /** 协议路径 */
                    const path_s = (v2_s[0] === "." ? path_1.default.join(Editor.Project.path, v2_s) : path_1.default.normalize(v2_s)).replace(/\\/g, "/");
                    // 递归文件夹
                    if (path_s.endsWith("/**/*.proto")) {
                        const dir_path_s = path_s.slice(0, -"/**/*.proto".length);
                        if (!fs_1.default.existsSync(dir_path_s)) {
                            log_1.default.error("构建路径不存在", dir_path_s);
                            return;
                        }
                        // 初始化构建文件表
                        lib_file_1.default
                            .search(dir_path_s, /\.proto$/g, {
                            type_n: lib_file_1.lib_file_.file_type.file,
                        })
                            .forEach((v3_s) => {
                            proto_path_ss.push(v3_s);
                        });
                    }
                    // 文件夹
                    else if (path_s.endsWith("/*.proto")) {
                        const dir_path_s = path_s.slice(0, -"/*.proto".length);
                        if (!fs_1.default.existsSync(dir_path_s)) {
                            log_1.default.error("构建路径不存在", dir_path_s);
                            return;
                        }
                        // 初始化构建文件表
                        lib_file_1.default
                            .search(dir_path_s, /\.proto$/g, {
                            type_n: lib_file_1.lib_file_.file_type.file,
                            recursive_b: false,
                        })
                            .forEach((v3_s) => {
                            proto_path_ss.push(v3_s);
                        });
                    }
                    // 文件
                    else if (path_s.endsWith(".proto")) {
                        if (!fs_1.default.existsSync(path_s)) {
                            log_1.default.error("构建路径不存在", path_s);
                            return;
                        }
                        proto_path_ss.push(path_s);
                    }
                });
                // 更新构建文件表
                if (!need_build_b) {
                    proto_path_ss.forEach((v3_s) => {
                        const mtime_ms_n = fs_1.default.statSync(v3_s).mtimeMs;
                        // 加入构建文件表
                        if (model.file_modify_time_tab[v3_s] !== mtime_ms_n) {
                            model.file_modify_time_tab[v3_s] = mtime_ms_n;
                            need_build_b = true;
                        }
                    });
                }
                // 不需要构建
                if (!need_build_b) {
                    skip_build_as.push(v);
                    break;
                }
                // 拷贝原始文件
                proto_path_ss.forEach((v_s) => {
                    const output_path_s = path_1.default.join(path_1.default.dirname(v_s), path_1.default.basename(v_s, ".proto") + "-original.txt");
                    if (fs_1.default.existsSync(output_path_s)) {
                        return;
                    }
                    lib_file_1.default.copy(v_s, output_path_s);
                    // 添加重置文件
                    reset_proto_path_ss.push(v_s);
                });
                // 等待构建完成
                try {
                    const config = Object.assign({}, v);
                    config.proto_ss = proto_path_ss.map((v_s) => {
                        return v_s.replace(/\//g, "\\\\");
                    });
                    config.proto_ss = config.proto_ss.map((v_s) => {
                        const result_s = v_s.replace(/\//g, "\\");
                        if (result_s[0] === "." || result_s[0] === "\\") {
                            return path_1.default.join(Editor.Project.path, result_s).replace(/\//g, "\\");
                        }
                        return result_s;
                    });
                    if (!(yield model.config.build_f(config))) {
                        build_fail_as.push(v);
                        break;
                    }
                }
                catch (error) {
                    console.error(error);
                    build_fail_as.push(v);
                    break;
                }
                const ts_output_path_s = v.ts_output_path_s[0] !== "."
                    ? v.ts_output_path_s
                    : path_1.default.join(Editor.Project.path, v.ts_output_path_s);
                const dts_output_path_s = v.dts_output_path_s[0] !== "."
                    ? v.dts_output_path_s
                    : path_1.default.join(Editor.Project.path, v.dts_output_path_s);
                // 刷新资源路径
                if (ts_output_path_s.includes(path_1.default.normalize(Editor.Project.path))) {
                    Editor.Message.send("asset-db", "refresh-asset", path_1.default
                        .normalize(ts_output_path_s)
                        .replace(path_1.default.normalize(Editor.Project.path), "db:/")
                        .replace(/\\/g, "/"));
                }
                if (dts_output_path_s.includes(path_1.default.normalize(Editor.Project.path))) {
                    Editor.Message.send("asset-db", "refresh-asset", path_1.default
                        .normalize(dts_output_path_s)
                        .replace(path_1.default.normalize(Editor.Project.path), "db:/")
                        .replace(/\\/g, "/"));
                }
                build_success_as.push(v);
            }
            // 重置文件
            reset_proto_path_ss.forEach((v_s) => {
                const input_path_s = path_1.default.join(path_1.default.dirname(v_s), path_1.default.basename(v_s, ".proto") + "-original.txt");
                lib_file_1.default.copy(input_path_s, v_s);
                lib_file_1.default.del(input_path_s);
            });
            log_1.default.log(`构建结束：成功 ${build_success_as.length} 个, 失败 ${build_fail_as.length} 个, 跳过 ${skip_build_as.length} 个`);
            if (build_fail_as.length) {
                log_1.default.error("失败列表\n", build_fail_as.map((v) => v.proto_ss.join(", ")).join("\n"));
            }
        });
    },
    /** 配置文件变更 */
    event_config_change() {
        if (model.config_modify_timer) {
            clearTimeout(model.config_modify_timer);
        }
        model.config_modify_timer = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            // 更新配置文件
            delete require.cache[model.config_path_s.replace("/", "\\")];
            model.config = require(model.config_path_s);
            // 取消监听
            model.unlisten();
            // 非自动构建
            if (!model.config.automatic_build_b) {
                return;
            }
            /** 构建列表 */
            const build_as = [];
            /** 构建状态 */
            let build_b = false;
            /** 继续构建 */
            let next_build_b = false;
            /** 构建定时器 */
            let build_timer = null;
            /** 构建函数 */
            const build_f = (config) => {
                // 更新构建配置
                if (config) {
                    build_as.push(config);
                }
                // 如果正在构建中则等待下次构建
                if (build_b) {
                    next_build_b = true;
                    return;
                }
                // 清理构建定时器
                if (build_timer) {
                    clearTimeout(build_timer);
                }
                else {
                    log_1.default.log("协议文件变更，准备构建");
                }
                // 无构建任务
                if (!build_as.length) {
                    return;
                }
                build_timer = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    // 更新定时器
                    build_timer = null;
                    // 更新构建状态
                    build_b = true;
                    /** 当前构建表 */
                    const current_build_as = build_as.splice(0, build_as.length);
                    exports.methods._build_list(current_build_as);
                    // 更新构建状态
                    build_b = false;
                    // 继续构建
                    if (next_build_b) {
                        next_build_b = false;
                        build_f(null);
                    }
                }), model.config.automatic_build_delay_s_n * 1000);
            };
            // 监听构建
            model.config.proto_list.forEach((v) => {
                // 更新构建文件表
                v.proto_ss.forEach((v2_s) => {
                    /** 协议路径 */
                    const path_s = (v2_s[0] === "."
                        ? path_1.default.join(Editor.Project.path, v2_s)
                        : path_1.default.normalize(v2_s)).replace(/\\/g, "/");
                    // 递归文件夹
                    if (path_s.endsWith("/**/*.proto")) {
                        const dir_path_s = path_s.slice(0, -"/**/*.proto".length);
                        if (!fs_1.default.existsSync(dir_path_s)) {
                            log_1.default.error("构建路径不存在", dir_path_s);
                            return;
                        }
                        model.watch_as.push(fs_1.default.watch(dir_path_s, { recursive: true }, (event_type, file_name_s) => {
                            // 如果不是 proto 文件则退出
                            if (!(file_name_s === null || file_name_s === void 0 ? void 0 : file_name_s.endsWith(".proto"))) {
                                return;
                            }
                            // 触发构建
                            build_f(v);
                        }));
                    }
                    // 文件夹
                    else if (path_s.endsWith("/*.proto")) {
                        const dir_path_s = path_s.slice(0, -"/*.proto".length);
                        if (!fs_1.default.existsSync(dir_path_s)) {
                            log_1.default.error("构建路径不存在", dir_path_s);
                            return;
                        }
                        model.watch_as.push(fs_1.default.watch(dir_path_s, { recursive: false }, (event_type, file_name_s) => {
                            // 如果不是 proto 文件则退出
                            if (!(file_name_s === null || file_name_s === void 0 ? void 0 : file_name_s.endsWith(".proto"))) {
                                return;
                            }
                            // 触发构建
                            build_f(v);
                        }));
                    }
                    // 文件
                    else if (path_s.endsWith(".proto")) {
                        if (!fs_1.default.existsSync(path_s)) {
                            log_1.default.error("构建路径不存在", path_s);
                            return;
                        }
                        model.watch_as.push(fs_1.default.watch(path_s, (event_type, file_name_s) => {
                            // 如果不是 proto 文件则退出
                            if (!(file_name_s === null || file_name_s === void 0 ? void 0 : file_name_s.endsWith(".proto"))) {
                                return;
                            }
                            // 触发构建
                            build_f(v);
                        }));
                    }
                });
            });
        }), 3);
    },
};
