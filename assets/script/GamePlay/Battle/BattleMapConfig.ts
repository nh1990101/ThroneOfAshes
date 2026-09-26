import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;


export interface BattleMapConfig {
    width: number;
    height: number;
    hexWidth: number;
    hexHeight: number;
    offsetX: number;
    offsetY: number;
    cells: BattleMapGridConfig[];
}
export interface BattleMapGridConfig {
    q: number;
    r: number;
    walkable: boolean;
    isDeployment: boolean;
}


