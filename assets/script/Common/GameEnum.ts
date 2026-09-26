import { _decorator, Component, Enum, Node } from 'cc';
import * as exp from 'constants';
const { ccclass, property } = _decorator;


export enum GameEvent {
    Connect = "Connect",

    //选中战斗单位（移动操作）
    Select_Grid_Battle_Unit = "Select_Grid_Unit",
    //清空选中单位
    Clear_Battle_Select_Unit = "Clear_Battle_Select_Unit",
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
}

