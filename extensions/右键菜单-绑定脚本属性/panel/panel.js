'use strict'

//html text；
exports.template = `
&nbsp&nbsp
<ui-label value="脚本生成路径:"></ui-label>
<ui-input class="scriptPath"  placeholder="脚本生成路径"></ui-input><br/><br/>&nbsp&nbsp&nbsp
<ui-button>保存</ui-button>
`;

//style text;
exports.style = `
ui-input {margin 55px 5% 5px;width:80%}
ui-button {margin 5px 5% 5px;}
`;

//html selector after rendering;
exports.$ = {
    scriptPath: ".scriptPath",
    btn: "ui-button",
};


exports.ready = async function () {
    //构建btn回调；
    this.$.btn.addEventListener('confirm', () => {
        console.log('btn touch');
        const path = this.$.scriptPath.value;
        if (path && path.length > 0) {
            Editor.Profile.setProject("menu-test", "script_create_path", path);
            console.log('脚本保存路径成功');
        } else {
            console.error("路径为空");
        }
    });

    //小程序路径path;
    const createPath = await Editor.Profile.getProject("menu-test", "script_create_path");
    if (createPath && createPath.length > 0) {
        this.$.scriptPath.value = createPath;
    }
};