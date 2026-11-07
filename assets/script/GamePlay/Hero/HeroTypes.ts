/** 养成界面展示的属性 id。 */
export type HeroAttrId = 'base_atk' | 'base_def' | 'base_intelligence' | 'base_command';

/** id 用于读取英雄配置；uuid 只标识拥有的英雄实例，配置预览可以不带 uuid。 */
export interface HeroCardData {
    uuid?: string;
    /** HeroData.id */
    id: number;
    name: string;
    level?: number;
    /** 单位星级表 id */
    star?: number;
    /** 当前展示战力，正式数据由服务器同步。 */
    score?: number;
    /** 当前基础属性，装备加成在展示时另行计算。 */
    attrs?: Partial<Record<HeroAttrId, number>>;
}

/** 拥有的英雄必须带实例 uuid，同一配置可以拥有多个不同实例。 */
export interface HeroInstanceData extends HeroCardData {
    uuid: string;
}

/** 养成页切页时带上当前英雄，以及左右切换用的列表。 */
export interface HeroGrowPageParam {
    hero: HeroCardData;
    heroes: HeroCardData[];
}

/** 升星材料槽。同名、同阵营、任意都要星级对上。 */
export type HeroStarCostKind = 'self' | 'faction' | 'any';

/** 同名槽 matchId 是英雄配置 id，同阵营槽是阵营 id。 */
export interface HeroStarCostSlot {
    kind: HeroStarCostKind;
    starId: number;
    matchId?: number;
    selected?: HeroCardData;
}
