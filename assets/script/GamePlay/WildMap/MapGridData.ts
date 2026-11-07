import { _decorator, Component, Node, Pool, UITransform, Vec2 } from 'cc';
import { MapMgr } from './MapMgr';
import { ROLE_DIR } from '../../Common/GameEnum';
import { MapObjUserData } from './Data/MapObjUserData';
import { PoolMgr } from '../../Common/Pool';
import { Tools } from '../../Common/Tools';
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
    public occupyUnit: any[] = [];


    constructor() {
        // this.gridX = x;
        // this.gridY = y;
        // this.walkable = walkable;
    }

    public SetData(x: number, y: number, walkable: boolean = true) {
        this.gridX = x;
        this.gridY = y;
        this.walkable = walkable;
        this.occupied = false;
        this.occupyUnit = [];
    }

    /**
     * 格子本地坐标X（格子中心点）
     * 返回相对于 mapContainer 的本地坐标
     */
    public GetXPx(): number {
        const mapPos = MapMgr.getInstance().gridToMapPos(this.gridX, this.gridY);
        return mapPos.x;
    }

    /**
     * 格子本地坐标Y（格子中心点）
     * 返回相对于 mapContainer 的本地坐标
     */
    public GetYPx(): number {
        const mapPos = MapMgr.getInstance().gridToMapPos(this.gridX, this.gridY);
        return mapPos.y;
    }

    /**获取格子世界坐标 */
    public GetWorldPos(): Vec2 {
        var mapPos = MapMgr.getInstance().gridToMapPos(this.gridX, this.gridY).toVec3();
        return MapMgr.getInstance().getMapContainer()?.getComponent(UITransform)?.convertToWorldSpaceAR(mapPos).toVec2();
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
        return this.walkable;// && !this.occupied;
    }

    /**设置占据状态 */
    public addOccupied(unit: any) {
        this.occupied = true;
        if (this.occupyUnit.indexOf(unit) < 0) {
            this.occupyUnit.push(unit);
        }
    }
    /**移除占据 */
    public removeOccupy(unit: any) {
        var index = this.occupyUnit.indexOf(unit);
        if (index > -1) {
            this.occupyUnit.splice(index, 1);
        }
        this.occupied = this.occupyUnit && this.occupyUnit.length < 1;
    }
    /**检测是否占据了某个单位 */
    public CheckHasOccupy(unit: any) {
        var index = this.occupyUnit.indexOf(unit);
        return index > -1;
    }


    /**获取占有的 IMapObject 类型的对象 */
    public GetMapObject(): MapObjUserData | undefined {
        if (this.CheckOccupied()) {
            for (let i = 0; i < this.occupyUnit.length; i++) {
                const unit = this.occupyUnit[i];
                if (unit instanceof MapObjUserData) {
                    return unit;
                }
            }
        }
        return undefined;
    }
    /**清除占据状态 */
    public clearOccupied() {
        this.occupied = false;
        this.occupyUnit = [];
    }
    /**检测是否被占单位 */
    public CheckOccupied() {
        return this.occupyUnit.length > 0;
    }
    public Clear() {
        this.clearOccupied();
        this.walkable = false;
        this.gridX = 0;
        this.gridY = 0;
    }
    public toString() {
        return Tools.formatPosKey(this.gridX, this.gridY);
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

    /**
     * 计算移动方向（四方向）
     * 每个方向占据90度范围：
     * - UP: -45° 到 45°（正上方向）
     * - RIGHT: 45° 到 135°（正右方向）
     * - DOWN: 135° 到 -135°（正下方向）
     * - LEFT: -135° 到 -45°（正左方向）
     */
    public static calculateDirection4(from: MapGridData, to: MapGridData): ROLE_DIR {
        const dx = to.gridX - from.gridX;
        const dy = to.gridY - from.gridY;

        // 如果两点重合，返回默认方向
        if (dx === 0 && dy === 0) return ROLE_DIR.UP;

        // 计算角度（弧度），使用atan2获取正确的象限角度
        const angle = Math.atan2(dy, dx);

        // 将弧度转换为度数，并调整到 [0, 360) 范围
        // atan2 返回 [-π, π]，转换为 [-180, 180]
        let degree = angle * (180 / Math.PI);

        // 调整角度：由于Y轴向上为正，需要将角度系统调整为：
        // 上(90°), 右(0°), 下(-90°), 左(180°/-180°)
        // 因此我们需要旋转坐标系，让上方为0度参考
        degree = 90 - degree;

        // 标准化到 [0, 360) 范围
        if (degree < 0) degree += 360;
        if (degree >= 360) degree -= 360;

        // 四方向判断（每个方向90度范围）
        // UP: [315, 360) 和 [0, 45)
        // RIGHT: [45, 135)
        // DOWN: [135, 225)
        // LEFT: [225, 315)
        if (degree >= 315 || degree < 45) {
            return ROLE_DIR.UP;
        } else if (degree >= 45 && degree < 135) {
            return ROLE_DIR.RIGHT;
        } else if (degree >= 135 && degree < 225) {
            return ROLE_DIR.DOWN;
        } else { // degree >= 225 && degree < 315
            return ROLE_DIR.LEFT;
        }
    }
    /**
     * 检测是否到达物体附近（靠近占格位置）
     * @param curPosGrid 当前位置格子
     * @param targetObjectData 目标物体数据
     * @param distance 距离范围（0=格子本身，1=周边一圈，2=周边两圈，默认1）
     */
    public static CheckIsArriveMapObject(curPosGrid: MapGridData, targetObjectData: MapObjUserData, distance: number = 1) {
        var mgr = MapMgr.getInstance();

        // distance = 0: 只检查当前格子
        if (distance === 0) {
            return curPosGrid.CheckHasOccupy(targetObjectData);
        }

        // distance >= 1: 检查指定距离范围内的所有格子
        for (let dx = -distance; dx <= distance; dx++) {
            for (let dy = -distance; dy <= distance; dy++) {
                // 跳过当前格子本身（除非distance=0，但这种情况已在上面处理）
                if (dx === 0 && dy === 0) continue;

                // 计算切比雪夫距离（棋盘距离，八方向最大步数）
                const chebyshevDist = Math.max(Math.abs(dx), Math.abs(dy));
                if (chebyshevDist > distance) continue;

                const gridX = curPosGrid.gridX + dx;
                const gridY = curPosGrid.gridY + dy;
                const grid = mgr.getGrid(gridX, gridY);

                if (grid && grid.CheckHasOccupy(targetObjectData)) {
                    return true;
                }
            }
        }

        return false;
    }
}


