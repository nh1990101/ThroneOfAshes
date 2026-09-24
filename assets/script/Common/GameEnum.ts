import { _decorator, Component, Enum, Node } from 'cc';
import * as exp from 'constants';
const { ccclass, property } = _decorator;


export enum GameEvent {
    Connect = "Connect",
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

