import { ConfigMgr } from '../../Config/ConfigMgr';
import { ParamDefined } from '../../Common/GameEnum';
import type { EquipConfig } from './EquipTypes';

export function getEquipmentConfig(): EquipConfig {
    const config = ConfigMgr.instance;
    const int_values = (id: ParamDefined) => config.ParamData.get(String(id)).parm;
    return {
        items: config.ItemData, equips: config.EquipData, strengths: config.EquipStrData,
        stars: config.EquipStarData, attrs: config.EquipAttrData,
        suits: config.EquipSuitData, suit_attrs: config.EquipSuitAttrData,
        rules: {
            decompose_max: int_values(ParamDefined.EQUIP_DECOMPOSE_MAX)[0],
            gold_per_exp: int_values(ParamDefined.EQUIP_STRENGTH_GOLD)[0],
            return_exp_rate: config.ParamData.get(String(ParamDefined.EQUIP_RETURN_EXP_RATE)).parm_f[0],
            affix_levels: int_values(ParamDefined.EQUIP_AFFIX_LEVELS),
            max_sub_attrs: int_values(ParamDefined.EQUIP_MAX_SUB_ATTRS)[0],
            reward_item_id: int_values(ParamDefined.EQUIP_DECOMPOSE_ITEM)[0],
            quick_quality: int_values(ParamDefined.EQUIP_QUICK_QUALITY)[0],
        },
    };
}
