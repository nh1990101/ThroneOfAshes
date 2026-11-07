// Auto-generated from MarketGoodsData.json by sharedata/tools/excel-exporter.
export interface IMarketGoodsData {
  id: string;
  group_id?: number;
  group_key?: string;
  market_type_id?: string;
  market_level?: number;
  sell_item?: number[];
  cost_item?: number;
  base_price?: number;
  price_rate?: number;
  limit_times?: number;
  weight?: number;
  is_close?: boolean;
  is_free?: boolean;
}

export interface IMarketGoodsDataIndex {
  group_dict: Record<number, Record<string, string>>;
}
