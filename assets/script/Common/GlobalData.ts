import { _decorator, Component, Node } from 'cc';
import { BaseMgr } from './BaseMgr';
import { MainMgr } from '../GamePlay/MainCity/MainMgr';
import { BattleMapMgr } from '../GamePlay/Battle/BattleMapMgr';
import { BattleMgr } from '../GamePlay/Battle/BattleMgr';
import { PathFindingMgr } from './PathFindingMgr';
import { MapMgr } from '../GamePlay/WildMap/MapMgr';
import { WildMapClientData } from '../GamePlay/WildMap/WildMapClientData';
import { FlyNoticeMgr } from '../GamePlay/BaseSystem/FlyNoticeMgr';
import { PlayerData } from '../GamePlay/WildMap/Data/PlayerData';
import { ServerData } from './ServerData';
import { PVEMgr } from '../GamePlay/PVE/PVEMgr';
import { TimerMgr } from './TimerMgr';
import { GameLogic } from '../Component/GameLogic';
import { UIMananger } from '../Component/UIMananger';
import { DamageTextMgr } from '../GamePlay/Battle/DamageTextMgr';
import { SkillMgr } from '../GamePlay/Battle/SkillMgr';
import { GameWebSocket } from '../WebSocket/GameWebSocket';
import { FeatureMgr } from './FeatureMgr';
import { pbType } from '../WebSocket/proto/ProtoDefined';
const { ccclass, property } = _decorator;

@ccclass('GlobalData')
export class GlobalData {
    protected static mgrList: (typeof BaseMgr)[]
    public static serverDate: Date;

    public static ResolutionPolicy: number;
    /**是否单机模式 */
    public static IsSingleMode: boolean = true;

    public static wildData: WildMapClientData;

    public static playerData: PlayerData;

    public static serverData: ServerData;

    public static GameLogic: GameLogic;


    public static initData() {

        this.mgrList = [MainMgr, BattleMapMgr, BattleMgr, PathFindingMgr, MapMgr, FlyNoticeMgr, PVEMgr, TimerMgr, DamageTextMgr, SkillMgr, FeatureMgr]
        this.serverDate = new Date();
        this.mgrList.forEach(cls => {
            const instance = cls.getInstance();
            instance.eventRegistor();
        });

        /**游戏全局逻辑初始化 */
        if (!this.GameLogic) {
            var gameLogicNode = new Node("GameLogic");
            this.GameLogic = gameLogicNode.addComponent(GameLogic);
            gameLogicNode.parent = UIMananger.instance?.node?.parent;
        }

        if (this.IsSingleMode) {
            this.wildData = new WildMapClientData();
            this.wildData.initData();

            this.playerData = new PlayerData();
            this.playerData.initData();

            this.serverData = new ServerData();
            this.serverData.initData();
        }


    }
    static getSoundDenyState() {
        return false;
    }

}


