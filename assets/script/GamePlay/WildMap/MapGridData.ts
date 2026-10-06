import { _decorator, Component, Node, UITransform, Vec2 } from 'cc';
import { MapMgr } from './MapMgr';
import { ROLE_DIR } from '../../Common/GameEnum';
const { ccclass, property } = _decorator;
/**
 * 地图格子数据（逻辑移动格子）
 */
export class MapGridData {
    /**每格像素宽度 */
    public static WIDTH_PX: number;
    /**每格像素高度 */
    public static HEIGHT_PX: number;

    /**地图格子坐标X */
    public gridX: number;
    /**地图格子坐标Y */
    public gridY: number;
    /**是否可行走 */
    public walkable: boolean;
    /**是否被占据 */
    public occupied: boolean = false;
    /**占据此格子的单位 */
    public occupyUnit: any = null;


    constructor(x: number, y: number, walkable: boolean = true) {
        this.gridX = x;
        this.gridY = y;
        this.walkable = walkable;
    }

    public SetData(x: number, y: number, walkable: boolean = true) {
        this.gridX = x;
        this.gridY = y;
        this.walkable = walkable;
        this.occupied = false;
        this.occupyUnit = null;
    }

    /**
     * 格子本地坐标X（格子中心点）
     * 返回相对于 mapContainer 的本地坐标
     */
    public GetXPx(): number {
        const worldPos = MapMgr.getInstance().gridToWorldPos(this.gridX, this.gridY);
        return worldPos.x;
    }

    /**
     * 格子本地坐标Y（格子中心点）
     * 返回相对于 mapContainer 的本地坐标
     */
    public GetYPx(): number {
        const worldPos = MapMgr.getInstance().gridToWorldPos(this.gridX, this.gridY);
        return worldPos.y;
    }

    /**获取格子世界坐标 */
    public GetWorldPos(): Vec2 {
        var local = MapMgr.getInstance().gridToWorldPos(this.gridX, this.gridY).toVec3();
        return MapMgr.getInstance().getMapContainer()?.getComponent(UITransform)?.convertToWorldSpaceAR(local).toVec2();
    }

    /**获取哈希键（用于Map存储） */
    public getHashKey(): string {
        return `${this.gridX},${this.gridY}`;
    }

    /**判断是否相等 */
    public equals(other: MapGridData): boolean {
        return this.gridX === other.gridX && this.gridY === other.gridY;
    }

    /**计算到另一个格子的曼哈顿距离 */
    public distanceTo(other: MapGridData): number {
        return Math.abs(this.gridX - other.gridX) + Math.abs(this.gridY - other.gridY);
    }

    /**计算到另一个格子的欧几里得距离 */
    public euclideanDistanceTo(other: MapGridData): number {
        const dx = this.gridX - other.gridX;
        const dy = this.gridY - other.gridY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**获取相邻格子坐标（4方向） */
    public getNeighbors4(): Vec2[] {
        return [
            new Vec2(this.gridX, this.gridY + 1),     // 上
            new Vec2(this.gridX + 1, this.gridY),     // 右
            new Vec2(this.gridX, this.gridY - 1),     // 下
            new Vec2(this.gridX - 1, this.gridY),     // 左
        ];
    }

    /**获取相邻格子坐标（8方向） */
    public getNeighbors8(): Vec2[] {
        return [
            new Vec2(this.gridX, this.gridY + 1),     // 上
            new Vec2(this.gridX + 1, this.gridY + 1), // 右上
            new Vec2(this.gridX + 1, this.gridY),     // 右
            new Vec2(this.gridX + 1, this.gridY - 1), // 右下
            new Vec2(this.gridX, this.gridY - 1),     // 下
            new Vec2(this.gridX - 1, this.gridY - 1), // 左下
            new Vec2(this.gridX - 1, this.gridY),     // 左
            new Vec2(this.gridX - 1, this.gridY + 1), // 左上
        ];
    }

    /**检查是否为空（可行走且未被占据） */
    public isEmpty(): boolean {
        return this.walkable && !this.occupied;
    }

    /**设置占据状态 */
    public setOccupied(unit: any) {
        this.occupied = true;
        this.occupyUnit = unit;
    }

    /**清除占据状态 */
    public clearOccupied() {
        this.occupied = false;
        this.occupyUnit = null;
    }
    /**
       * 计算移动方向（八方向）
       */
    public static calculateDirection(from: MapGridData, to: MapGridData): ROLE_DIR {
        const dx = to.gridX - from.gridX;
        const dy = to.gridY - from.gridY;

        // 八方向判断
        if (dx === 0 && dy > 0) return ROLE_DIR.UP;
        if (dx > 0 && dy > 0) return ROLE_DIR.RIGHT_UP;
        if (dx > 0 && dy === 0) return ROLE_DIR.RIGHT;
        if (dx > 0 && dy < 0) return ROLE_DIR.RIGHT_DOWN;
        if (dx === 0 && dy < 0) return ROLE_DIR.DOWN;
        if (dx < 0 && dy < 0) return ROLE_DIR.LEFT_DOWN;
        if (dx < 0 && dy === 0) return ROLE_DIR.LEFT;
        if (dx < 0 && dy > 0) return ROLE_DIR.LEFT_UP;

        return ROLE_DIR.UP; // 默认返回当前方向
    }
}


