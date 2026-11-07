// Auto-generated from DropData.json by sharedata/tools/excel-exporter.
export interface IDropData {
  id: number;
  group_id?: number;
  group_key?: string;
  drop_type?: number;
  item?: number;
  num?: number;
  weight?: number;
  draws_times?: number;
  repeat?: boolean;
}

export interface IDropDataIndex {
  group_dict: Record<number, Record<number, number>>;
}
