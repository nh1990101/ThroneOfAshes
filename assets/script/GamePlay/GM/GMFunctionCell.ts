import { EditBox, Node, _decorator } from 'cc';
import { comp } from '../../Common/Decorator';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
const { ccclass } = _decorator;

export interface GMFunctionData {
    name: string;
    input_placeholder?: string;
    input_value?: string;
    click_func: (value: string) => void;
}

@ccclass('GMFunctionCell')
export class GMFunctionCell extends BaseRenderCell<GMFunctionData> {
    @comp(BaseLabel, "function_name")
    private name_label: BaseLabel = null!;

    @comp(EditBox, "argument_input")
    private argument_input: EditBox = null!;

    @comp(BaseBtn, "btn_execute")
    private btn_execute: BaseBtn = null!;

    public initEvent(): void {
        this.addNodeEvent(this.btn_execute.node, Node.EventType.TOUCH_END, this.onClickExecute);
        this.addNodeEvent(this.argument_input.node, EditBox.EventType.TEXT_CHANGED, this.onInputChanged);
        super.initEvent();
    }

    public OnRefreshUI(): void {
        const data = this.getData();
        if (!data) {
            return;
        }
        this.name_label.setText(data.name);
        this.argument_input.node.active = data.input_placeholder != null;
        if (data.input_placeholder != null) {
            this.argument_input.placeholderLabel.string = data.input_placeholder;
            this.argument_input.string = data.input_value || '';
        }
    }

    private onInputChanged(): void {
        this.getData().input_value = this.argument_input.string;
    }

    private onClickExecute(): void {
        const data = this.getData();
        data.click_func(data.input_value || '');
    }
}
