import { _decorator, Vec2, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 六边形方向枚举（尖顶六边形）
 */
export enum HexDirection {
    EAST = 0,       // 右 (东)
    NORTHEAST = 1,  // 右上 (东北)
    NORTHWEST = 2,  // 左上 (西北)
    WEST = 3,       // 左 (西)
    SOUTHWEST = 4,  // 左下 (西南)
    SOUTHEAST = 5   // 右下 (东南)
}

/**
 * 六边形轴坐标数据结构（尖顶六边形）
 * 使用轴坐标系统 (q, r)
 */
@ccclass('HexagonData')
export class HexagonData {
    // ==================== 坐标属性 ====================
    /** q 轴坐标（向右偏下方向） */
    public q: number = 0;

    /** r 轴坐标（垂直向下方向） */
    public r: number = 0;

    // ==================== 基础属性 ====================
    /** 是否可移动 */
    public walkable: boolean = true;

    // ==================== 游戏状态 ====================
    /** 占据该格子的单位ID（null表示空） */
    public occupiedUnitId: string | null = null;

    /** 是否可见（战争迷雾） */
    public visible: boolean = true;

    /** 是否被选中 */
    public selected: boolean = false;

    /** 是否高亮显示 */
    public highlighted: boolean = false;

    // ==================== 六边形方向偏移量（尖顶） ====================
    private static readonly DIRECTIONS: Array<[number, number]> = [
        [+1, 0],   // EAST - 右 (东)
        [+1, -1],  // NORTHEAST - 右上 (东北)
        [0, -1],   // NORTHWEST - 左上 (西北)
        [-1, 0],   // WEST - 左 (西)
        [-1, +1],  // SOUTHWEST - 左下 (西南)
        [0, +1]    // SOUTHEAST - 右下 (东南)
    ];

    // ==================== 构造函数 ====================
    /**
     * 创建六边形数据
     * @param q 轴坐标 q
     * @param r 轴坐标 r
     * @param walkable 是否可移动
     */
    constructor(q: number = 0, r: number = 0, walkable: boolean = true) {
        this.q = q;
        this.r = r;
        this.walkable = walkable;
    }

    // ==================== 初始化和重置 ====================
    /**
     * 重置数据到初始状态
     */
    public reset(): void {
        this.walkable = true;
        this.occupiedUnitId = null;
        this.visible = true;
        this.selected = false;
        this.highlighted = false;
    }

    // ==================== 坐标系统 ====================
    /**
     * 获取立方体坐标的 s 值
     * 约束条件: q + r + s = 0
     */
    public get s(): number {
        return -this.q - this.r;
    }

    /**
     * 设置坐标
     */
    public setCoordinates(q: number, r: number): void {
        this.q = q;
        this.r = r;
    }

    /**
     * 转换为世界坐标（像素坐标）
     * @param hexWidth 六边形宽度（左右两边的距离，默认98）
     * @param hexHeight 六边形高度（上下顶点的距离，默认86）
     * @returns 世界坐标 Vec2
     */
    public toPixel(hexWidth: number = 98, hexHeight: number = 86): Vec2 {
        // 对于尖顶六边形的偏移坐标系统（奇数行偏移）：
        // - 横向：每列间距 hexWidth，奇数行向右偏移 hexWidth/2
        // - 纵向：每行间距 hexHeight * 3/4（因为相邻行重叠 1/4）

        const x = hexWidth * this.q + (this.r % 2) * (hexWidth / 2);
        const y = (hexHeight * 3 / 4) * this.r;

        return new Vec2(x, y);
    }

    /**
     * 转换为世界坐标 Vec3
     * @param hexWidth 六边形宽度（左右两边的距离，默认98）
     * @param hexHeight 六边形高度（上下顶点的距离，默认86）
     * @param z z 轴坐标
     */
    public toPixel3D(hexWidth: number = 98, hexHeight: number = 86, z: number = 0): Vec3 {
        const pixel = this.toPixel(hexWidth, hexHeight);
        return new Vec3(pixel.x, pixel.y, z);
    }

    /**
     * 从世界坐标创建六边形数据
     * @param x 世界坐标 x
     * @param y 世界坐标 y
     * @param hexWidth 六边形宽度（左右两边的距离，默认98）
     * @param hexHeight 六边形高度（上下顶点的距离，默认86）
     * @returns 新的 HexagonData
     */
    public static fromPixel(x: number, y: number, hexWidth: number = 98, hexHeight: number = 86): HexagonData {
        // 先计算行（r）
        const r = Math.round(y / (hexHeight * 3 / 4));

        // 根据行的奇偶性计算列（q）
        const offsetX = (r % 2) * (hexWidth / 2);
        const q = Math.round((x - offsetX) / hexWidth);

        return new HexagonData(q, r);
    }

    /**
     * 轴坐标四舍五入到最近的六边形
     * @param q 浮点 q 坐标
     * @param r 浮点 r 坐标
     */
    private static axialRound(q: number, r: number): { q: number, r: number } {
        const s = -q - r;
        let rq = Math.round(q);
        let rr = Math.round(r);
        let rs = Math.round(s);

        const qDiff = Math.abs(rq - q);
        const rDiff = Math.abs(rr - r);
        const sDiff = Math.abs(rs - s);

        if (qDiff > rDiff && qDiff > sDiff) {
            rq = -rr - rs;
        } else if (rDiff > sDiff) {
            rr = -rq - rs;
        }

        return { q: rq, r: rr };
    }

    // ==================== 邻居和方向 ====================
    /**
     * 获取所有邻居的坐标
     * @returns 6个邻居的坐标数组
     */
    public getNeighbors(): HexagonData[] {
        const neighbors: HexagonData[] = [];
        for (let dir = 0; dir < 6; dir++) {
            neighbors.push(this.getNeighborAt(dir));
        }
        return neighbors;
    }

    /**
     * 获取指定方向的邻居
     * @param direction 方向（0-5 或 HexDirection 枚举）
     * @returns 邻居六边形数据
     */
    public getNeighborAt(direction: number | HexDirection): HexagonData {
        const offset = HexagonData.DIRECTIONS[direction];
        return new HexagonData(
            this.q + offset[0],
            this.r + offset[1],
            this.walkable
        );
    }

    /**
     * 判断另一个六边形是否是邻居
     */
    public isNeighbor(other: HexagonData): boolean {
        return this.distanceTo(other) === 1;
    }

    /**
     * 获取到另一个六边形的方向
     * @returns 方向枚举，如果不是邻居返回 -1
     */
    public getDirectionTo(other: HexagonData): number {
        if (!this.isNeighbor(other)) return -1;

        const dq = other.q - this.q;
        const dr = other.r - this.r;

        for (let dir = 0; dir < 6; dir++) {
            const offset = HexagonData.DIRECTIONS[dir];
            if (offset[0] === dq && offset[1] === dr) {
                return dir;
            }
        }
        return -1;
    }

    // ==================== 距离计算 ====================
    /**
     * 计算到另一个六边形的距离
     * @param other 另一个六边形
     * @returns 曼哈顿距离
     */
    public distanceTo(other: HexagonData): number {
        return HexagonData.distance(this.q, this.r, other.q, other.r);
    }

    /**
     * 静态方法：计算两个坐标之间的距离
     */
    public static distance(q1: number, r1: number, q2: number, r2: number): number {
        const dq = Math.abs(q1 - q2);
        const dr = Math.abs(r1 - r2);
        const ds = Math.abs((-q1 - r1) - (-q2 - r2));
        return (dq + dr + ds) / 2;
    }

    /**
     * 判断是否在指定范围内
     * @param center 中心六边形
     * @param range 范围
     */
    public isInRange(center: HexagonData, range: number): boolean {
        return this.distanceTo(center) <= range;
    }

    // ==================== 基础属性 ====================
    /**
     * 是否可移动
     */
    public isWalkable(): boolean {
        return this.walkable;
    }

    /**
     * 设置是否可移动
     */
    public setWalkable(walkable: boolean): void {
        this.walkable = walkable;
    }

    // ==================== 游戏状态 ====================
    /**
     * 是否为空（没有单位占据）
     */
    public isEmpty(): boolean {
        return this.occupiedUnitId === null;
    }

    /**
     * 设置占据的单位
     */
    public setOccupiedUnit(unitId: string | null): void {
        this.occupiedUnitId = unitId;
    }

    /**
     * 获取占据的单位ID
     */
    public getOccupiedUnit(): string | null {
        return this.occupiedUnitId;
    }

    /**
     * 设置可见性
     */
    public setVisible(visible: boolean): void {
        this.visible = visible;
    }

    /**
     * 设置选中状态
     */
    public setSelected(selected: boolean): void {
        this.selected = selected;
    }

    /**
     * 设置高亮状态
     */
    public setHighlighted(highlighted: boolean): void {
        this.highlighted = highlighted;
    }

    // ==================== 寻路支持 ====================
    /**
     * 计算到达另一个格子的实际代价
     * @param other 目标格子
     * @returns 移动代价，如果不可达返回 Infinity
     */
    public getCostTo(other: HexagonData): number {
        if (!other.walkable) return Infinity;
        if (!this.isNeighbor(other)) return Infinity;
        return 1;
    }

    /**
     * 获取从当前位置可到达的范围内所有格子
     * @param range 移动范围
     * @returns 范围内的所有六边形坐标
     */
    public static getReachableArea(center: HexagonData, range: number): HexagonData[] {
        const results: HexagonData[] = [];

        for (let q = -range; q <= range; q++) {
            for (let r = Math.max(-range, -q - range); r <= Math.min(range, -q + range); r++) {
                results.push(new HexagonData(center.q + q, center.r + r));
            }
        }

        return results;
    }

    /**
     * 获取两个六边形之间的直线路径
     * @param start 起点
     * @param end 终点
     * @returns 路径上的所有六边形
     */
    public static getLine(start: HexagonData, end: HexagonData): HexagonData[] {
        const N = HexagonData.distance(start.q, start.r, end.q, end.r);
        if (N === 0) return [start.clone()];

        const results: HexagonData[] = [];

        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const q = start.q * (1 - t) + end.q * t;
            const r = start.r * (1 - t) + end.r * t;
            const rounded = HexagonData.axialRound(q, r);
            results.push(new HexagonData(rounded.q, rounded.r));
        }

        return results;
    }

    /**
     * 获取环形区域（指定距离的所有六边形）
     * @param center 中心
     * @param radius 半径
     */
    public static getRing(center: HexagonData, radius: number): HexagonData[] {
        if (radius === 0) return [center.clone()];

        const results: HexagonData[] = [];
        let hex = new HexagonData(
            center.q + HexagonData.DIRECTIONS[4][0] * radius,
            center.r + HexagonData.DIRECTIONS[4][1] * radius
        );

        for (let dir = 0; dir < 6; dir++) {
            for (let step = 0; step < radius; step++) {
                results.push(hex.clone());
                hex = hex.getNeighborAt(dir);
            }
        }

        return results;
    }

    // ==================== 工具方法 ====================
    /**
     * 判断两个六边形是否相等
     */
    public equals(other: HexagonData): boolean {
        return this.q === other.q && this.r === other.r;
    }

    /**
     * 克隆当前六边形数据
     */
    public clone(): HexagonData {
        const cloned = new HexagonData(this.q, this.r, this.walkable);
        cloned.occupiedUnitId = this.occupiedUnitId;
        cloned.visible = this.visible;
        cloned.selected = this.selected;
        cloned.highlighted = this.highlighted;
        return cloned;
    }

    /**
     * 转换为字符串（调试用）
     */
    public toString(): string {
        return `Hex(q:${this.q}, r:${this.r}, s:${this.s}, walkable:${this.walkable})`;
    }

    /**
     * 转换为简短字符串
     */
    public toShortString(): string {
        return `(${this.q},${this.r})`;
    }

    /**
     * 创建坐标哈希键（用于Map/Set）
     */
    public getHashKey(): string {
        return `${this.q},${this.r}`;
    }

    /**
     * 从哈希键创建六边形
     */
    public static fromHashKey(key: string): HexagonData {
        const [q, r] = key.split(',').map(Number);
        return new HexagonData(q, r);
    }
}
