import { _decorator, Component, Enum, Node } from 'cc';
const { ccclass, property } = _decorator;

export enum GameLayer {
    WILD_MAP,
    DEFAULT = 30
}
export enum GameEvent {
    Connect = "Connect",
    // 背包数量、物品实例或装备状态更新
    BAG_ITEMS_UPDATE = "BAG_ITEMS_UPDATE",
    // 拥有的英雄实例同步
    HERO_DATA_UPDATE = "HERO_DATA_UPDATE",
    // 英雄图鉴记录同步
    HERO_CODEX_UPDATE = "HERO_CODEX_UPDATE",
    /*********************************************战斗相关事件 *****************************/
    //选中战斗单位（移动操作）
    Select_Grid_Battle_Unit = "Select_Grid_Unit",
    //清空选中单位
    Clear_Battle_Select_Unit = "Clear_Battle_Select_Unit",
    //单位移动结束后
    BATTLE_UNIT_MOVE_FINISH = "BATTLE_UNIT_MOVE_FINISH",
    //飞行移动被取消后刷新单位层级
    BATTLE_UNIT_SORT_CHANGED = "BATTLE_UNIT_SORT_CHANGED",


    /*********************************************野外地图事件 *****************************/
    //野外地图角色移动一格后的回调
    Finish_Move_Step = "Finish_Move_Step",
    //点击地图物体
    MapObject_Touch = "MapObject_Touch",
    //拖动地图
    MapDraging = "MapDraging",
    //结束触摸地图
    MapEndTouch = "MapEndTouch",
    //地图点击
    MapClick = "MapClick",
    //取消触摸
    MapCancleTouch = "MapCancleTouch",
    //开始触摸地图
    MapTouchBegin = "MapTouchBegin",
    // 更新地图块
    UpdateMapBlock = "UpdateMapBlock",
    // 移除地图物体
    RemoveMapObj = "RemoveMapObj",
    //占领地图物体
    OccupyMapObj = "OccupyMapObj",
    //更新地图探索
    UpdateMapDiscover = "UpdateMapDiscover",
    //更新体力
    UpdateEnergy = "UpdateEnergy",
    /*********************************************战斗相关 *****************************/
    // 点击战斗地图格子
    Battle_Map_Click_Grid = "Battle_Map_Click_Grid",
    // 设置战斗速度
    Battle_Speed_Change = "Battle_Speed_Change",
    // 技能播放完毕
    Battle_Skill_Finish_Play = "Battle_Skill_Finish_Play",
    /*********************************************宝箱 *****************************/
    //宝箱数据更新（开箱、领取积分奖励后派发）
    Update_Treasure_Box = "Update_Treasure_Box",
    //科技树等级或研究队列变化
    Update_Tech_Tree = "Update_Tech_Tree",
    //兵营招募到点入库
    Update_Barracks = "Update_Barracks",
    /*********************************************功能 *****************************/
    //功能解锁或屏蔽变化
    Feature_State = "Feature_State",
    /*********************************************抽卡 *****************************/
    //许愿英雄更新（服务器下发，或确认选择后走同一入口）
    Update_Hero_Draw_Wish = "Update_Hero_Draw_Wish",
    /*********************************************集市 *****************************/
    //商品购买或刷新后
    Update_Shop = "Update_Shop",
    /*********************************************分界线 *****************************/

    /*********************************************PVE界面 *****************************/
    //PVE界面选择章
    PVE_SELECT_GATE = "PVE_SELECT_GATE",

    /*********************************************布阵界面 *****************************/
    /**英雄上阵信息更新 */
    HERO_FIGHT_SELECT_UPDATE = "HERO_FIGHT_SELECT_UPDATE",
    //布阵信息更新
    FIGHT_SELECT_UNIT_UPDATE = "FIGHT_SELECT_UNIT_UPDATE",
    //长按开始拖动士兵
    BEGIN_DRAG_SOLDIER = "BEGIN_DRAG_SOLDIER",
    //选择士兵
    FIGHT_SELECT_SOLDIER = "FIGHT_SELECT_SOLDIER",
    //下阵士兵
    DELETE_SOLDIER_FIGHT = "DELETE_SOLDIER_FIGHT",
    //拖拽单位落到地图格子上
    FIGHT_DRAG_UNIT_DROP = "FIGHT_DRAG_UNIT_DROP",
    //取消选择士兵
    CANCLE_SELECT_SOLDIER = "CANCLE_SELECT_SOLDIER",
    //保存阵容
    SAVE_BATTLE_ARRAY = "SAVE_BATTLE_ARRAY",
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
export enum ParamDefined {
    // 视野
    WATCH_AREA = 1,
    // PVE最大体力上限
    PVE_ENERGY_MAX = 2,
    // 暗雷最小最大步数
    PVE_RANDOM_ENERMY_STEP_NUM,
    // 英雄出战数量最大值
    HERO_BATTLE_MAX,
    // 许愿 SP 英雄需要的酒馆等级
    WISH_SP_TAVERN_LV = 5,
    // 出战队列最大数量
    BATTLE_ARRAY_TEAM_NUM_MAX,
    // 最大出战士兵单位数量
    BATTLE_SOLDIER_UNIT_MAX,
    // 英雄上阵的攻击加成百分比
    BATTLE_ARRAY_HERO_PROPERTY_ADD_RATE,
    // 攻击系数（战斗公式）
    BATTLE_ATTACK_VALUE,
    // 防御系数（战斗公式）
    BATTLE_DEFIND_VALUE,

    // 单次装备分解数量上限
    EQUIP_DECOMPOSE_MAX = 11,
    // 每点装备强化经验消耗的金币数
    EQUIP_STRENGTH_GOLD = 12,
    // 消耗或分解装备时，已投入强化经验的返还比例
    EQUIP_RETURN_EXP_RATE = 13,
    // 触发副属性新增或强化的等级列表
    EQUIP_AFFIX_LEVELS = 14,
    // 装备副属性数量上限
    EQUIP_MAX_SUB_ATTRS = 15,
    // 装备分解返还物品的配置 id
    EQUIP_DECOMPOSE_ITEM = 16,
    // 一键填充和分解添加设置的默认装备品质上限
    EQUIP_QUICK_QUALITY = 17,
    // 战斗卡牌上限
    BATTLE_CARD_NUM_MAX = 18,

}
export enum ParamValueType {
    INT,
    FLOAT,
}
/**地图物体交互后的类型 */
export enum MAP_OBJECT_FINISH_TYPE {
    /**消失 */
    DISSAPEAR = 1,
    /**飘字 */
    FLY_NOTCIE,
    /**插旗*/
    FLAG,
}

/**地图物体显示优先层级 */
export enum MAP_SORT_ORDER {
    WILD_ROLE,
    MAP_OBJ,
}
/**地图资源交互类型 */
export enum MAP_RES_INTERATION_TYPE {
    /**自动触发 */
    AutoTriggerData = "AutoTriggerData",
    /**选择事件 */
    SelectEventsData = "SelectEventsData",
    /**交易事件 */
    TransactionEventsData = "TransactionEventsData",
    /**特殊事件 */
    SpecialEventsData = "SpecialEventsData",
    /**战斗事件 */
    BattleEventsData = "BattleEventsData",
}
/**地图格子颜色 */
export enum HEXGON_GRID_COLOR {
    NORMAL,
    GREEN,
    RED,
    YELLOW,
    BLUE,
}
/**攻击类型 */
export enum ATTACK_TYPE {
    //近战
    COMBAT = 1,
    // 远程
    REMOTE
}
/**战斗结果*/
export enum BATTLE_RESULT {
    NONE,
    WIN,
    LOSE
}
/**战斗记录行为类型 */
export enum BATTLE_HISTORY_ACTION_TYPE {
    ATTACK,
    MOVE,
    WAIT,
    SKIP,

}
/**移动类型 */
export enum MOVE_TYPE {
    // 地面
    GROUND = 1,
    // 飞行
    FLY,
}
/**技能节点状态 */
export enum SKILL_ACTION_NODE_STATE {
    NONE,
    BEGIN,
    PLAYING,
    END
}
/** 技能强制移动类型，与技能编辑器导出的 moveType 一致。 */
export enum SKILL_MOVE_TYPE {
    /** 沿移动单位朝向的反方向移动。 */
    REVERSE_FACING = 1,
    /** 沿施法者指向移动单位的方向移动。 */
    CASTER_TO_TARGET = 2,
    /** 按配置的固定六边形方向移动。 */
    FIXED_DIRECTION = 3,
    /** 移动到指定的地图目标格子。 */
    GLOBAL = 4,
}
/** 物品类型，id 与物品类型表一致 */
export enum ItemType {
    /** 货币 */
    CURRENCY = 100,
    /** 道具 */
    STUFF = 200,
    /** 英雄 */
    HERO = 300,
    /** 士兵 */
    SOLDIER = 400,
    /** 英雄碎片 */
    HERO_FRAG = 500,
    /** 士兵碎片 */
    SOLDIER_FRAG = 600,
    /** 道具碎片 */
    STUFF_FRAG = 700,
    /** 装备 */
    EQUIP = 800,
    /** 神器 */
    ARTIFACT = 900,
    /** 装备强化材料 */
    EQUIP_STUFF = 1000,
    /** 神器强化材料 */
    ARTIFACT_STUFF = 1100,
    /** 礼包 */
    GIFT = 1200,
    /** 随机礼包 */
    RAND_GIFT = 1300,
    /** 自选礼包 */
    SELECT_GIFT = 1400,
}
/**弹窗提示类型 */
export enum CHECK_TYPE {
    /**只有确认按钮 */
    CONFIRM,
    /**有取消有确认 */
    CHECK,
}



