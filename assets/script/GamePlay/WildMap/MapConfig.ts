import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

export class MapConfig {
    config: IMapConfig;
    constructor(cfg: IMapConfig) {
        this.config = cfg;
    }
    public GetBlock(x: number, y: number) {
        return this.config.blocks[`${x},${y}`];
    }
    public GetResources(x: number, y: number) {
        return this.config.resources[`${x},${y}`];
    }
    /**每格逻辑格子宽 */
    public GetGridWidthPx() {
        return this.config.mapInfo.gridWidth;
    }
    /**每格逻辑格子高 */
    public GetGridHeightPx() {
        return this.config.mapInfo.gridHeight;
    }

}
export interface IMapConfig {
    /**地图id和地图尺寸信息 */
    mapInfo: IMapInfo;
    /**不可移动点坐标信息 */
    blocks: Map<string, IMapBock>;
    /**资源刷新规则和布点位置 */
    resources: Map<string, IResources>;
    /**出生点 */
    spawnPoints: ISpawnPoints[];
        /**地图物体信息 */
    objects: IMapObject[];
}
export interface IMapInfo {
    mapId: number;
    mapName: string;
    /**地图总宽度像素 */
    mapPixelWidth: number;
    /**地图总高度像素 */
    mapPixelHeight: number;
    /**每格宽度像素 */
    gridWidth: number;
    /**每格高度像素 */
    gridHeight: number;
    /**横向图片数 */
    totalCols: number;
    /**纵向图片数 */
    totalRows: number;
    /**每块地图切割宽高 */
    tileSize: number;
    /**地图图片资源路径 */
    tilesPath: string;


}
export interface IMapBock {
    /**是否可移动 0不可移动*/
    movable: number;
}
export interface IResources {
    /**资源ID */
    id: number;
    /**权重 */
    weight: number;
    /**刷新最小数量 */
    minCount: number;
    /**刷新最大数量 */
    maxCount: number;
}
export interface ISpawnPoints {
    x: number;
    y: number;
}
export enum MapResourceType {
    IMAGE = "image",
    ANIMATION = "animation"
}
export interface IMapObject {
    /**资源路径 */
    resourcePath: string;
    /**资源类型（动画还是图片） */
    resourceType: string;
    /**位于地图格子坐标 */
    gridX: number;
    gridY: number;
    /**资源ID */
    type: number;
    /**占格横向数量 */
    occupyX: number;
    /**占格纵向数量 */
    occupyY: number;
    /**偏移x像素 */
    offsetX: number;
    /**偏移y像素 */
    offsetY: number;
    /**参数 */
    params: any;
    /**是否可行走 */
    walkable: boolean;
}

