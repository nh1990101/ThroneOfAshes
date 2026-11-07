// Auto-generated from MonsterAttrData.json by sharedata/tools/excel-exporter.
export interface IMonsterAttrData {
  id: number;
  group_id?: number;
  group_key?: string;
  soldier_lv_coef?: number;
  soldier_hp_coef?: number;
  soldier_atk_coef?: number;
  soldier_def_coef?: number;
  coordinates?: number[];
  units_list?: number[];
  resources?: number;
  is_confirm?: boolean;
  is_boss?: boolean;
  reward?: number;
}

export interface IMonsterAttrDataIndex {
  MonsterAttrDataIndex: Record<number, Record<number, number>>;
}
