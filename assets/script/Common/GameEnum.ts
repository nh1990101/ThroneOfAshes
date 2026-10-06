import { _decorator, Component, Enum, Node } from 'cc';
import * as exp from 'constants';
const { ccclass, property } = _decorator;

export enum GameLayer {
    WILD_MAP,
    DEFAULT = 30
}
export enum GameEvent {
    Connect = "Connect",

    //选中战斗单位（移动操作）
    Select_Grid_Battle_Unit = "Select_Grid_Unit",
    //清空选中单位
    Clear_Battle_Select_Unit = "Clear_Battle_Select_Unit",
    //野外地图角色移动一格后的回调
    Finish_Move_Step = "Finish_Move_Step",
}

/**
 * 普通单位动作类型
 */
export enum UNIT_ACTION {
    IDLE,//待机
    MOVE,//移动
    BE_HIT,//受击
    DEAD,//死亡
    ATTACK,//攻击
    MAX,//动作边界判断
}
/**地图统帅动作 */
export enum ROLE_ACTION {
    IDLE, MOVE = 8,
}
/**地图统帅八方向 */
export enum ROLE_DIR {
    UP, RIGHT_UP, RIGHT, RIGHT_DOWN, DOWN, LEFT_DOWN, LEFT, LEFT_UP
}


