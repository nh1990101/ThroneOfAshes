"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
var config;
(function (config) {
    /** 插件名 */
    config.name_s = "cc-plugin-protobufjs";
    /** 插件根目录 */
    config.root_path_s = path_1.default.normalize(`${Editor.Project.path}/extensions/${config.name_s}/`);
    /** 插件资源目录 */
    config.resources_path_s = path_1.default.join(__dirname, "..", "res");
})(config || (config = {}));
exports.default = config;
