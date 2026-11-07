import type { BagItem } from '../Bag/BagMgr';
import type { EquipFilter, EquipReward } from './EquipTypes';

export interface EquipItemViewData {
    item?: BagItem;
    selected_count?: number;
    selected?: boolean;
    selection_mark?: 'check' | 'minus';
    empty_pos_id?: number;
    empty_text?: string;
    click_func?: () => void;
    minus_func?: () => void;
}

export interface EquipDetailViewData {
    item_guid?: number;
    compare_guid?: number;
    hero_uuid?: string;
    pos_id?: number;
    role: 'current' | 'candidate' | 'info';
    on_strengthen?: () => void;
    on_action?: () => void;
}

export interface EquipConfirmData {
    title: string;
    message: string;
    confirm_text?: string;
    cancel_text?: string;
    on_confirm?: () => void;
    rewards?: EquipReward[];
}

export interface EquipFilterData {
    filter: EquipFilter;
    on_apply: (filter: EquipFilter) => void;
}

export interface EquipQuickSettingData {
    mode: 'strengthen' | 'decompose';
}
