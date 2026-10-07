import { _decorator, Component, Node, Vec2 } from 'cc';
import { BaseMgr } from '../../Common/BaseMgr';
import { MapGridData } from './MapGridData';
const { ccclass, property } = _decorator;

/**
 * 寻路节点（A*算法用）
 */
class PathNode {
    grid: MapGridData;           // 格子数据
    g: number = 0;               // 从起点到当前点的实际代价
    h: number = 0;               // 到终点的启发式估计
    f: number = 0;               // g + h 总评估值
    parent: PathNode | null = null;  // 父节点，用于回溯路径

    constructor(grid: MapGridData, g: number = 0, h: number = 0, parent: PathNode | null = null) {
        this.grid = grid;
        this.g = g;
        this.h = h;
        this.f = g + h;
        this.parent = parent;
    }
}

/**
 * 最小堆（优先队列）- 用于A*算法的开放列表
 */
class MinHeap {
    private heap: PathNode[] = [];

    get size(): number {
        return this.heap.length;
    }

    isEmpty(): boolean {
        return this.heap.length === 0;
    }

    push(node: PathNode): void {
        this.heap.push(node);
        this.bubbleUp(this.heap.length - 1);
    }

    pop(): PathNode | null {
        if (this.isEmpty()) return null;
        if (this.heap.length === 1) return this.heap.pop()!;

        const min = this.heap[0];
        this.heap[0] = this.heap.pop()!;
        this.bubbleDown(0);
        return min;
    }

    private bubbleUp(index: number): void {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.heap[index].f >= this.heap[parentIndex].f) break;

            [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
            index = parentIndex;
        }
    }

    private bubbleDown(index: number): void {
        while (true) {
            let minIndex = index;
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;

            if (leftChild < this.heap.length && this.heap[leftChild].f < this.heap[minIndex].f) {
                minIndex = leftChild;
            }
            if (rightChild < this.heap.length && this.heap[rightChild].f < this.heap[minIndex].f) {
                minIndex = rightChild;
            }

            if (minIndex === index) break;

            [this.heap[index], this.heap[minIndex]] = [this.heap[minIndex], this.heap[index]];
            index = minIndex;
        }
    }
}

/**
 * 矩形网格寻路管理器
 */
@ccclass('RectPathFindingMgr')
export class RectPathFindingMgr extends BaseMgr {
    private _gridMap: Map<string, MapGridData>;
    /**是否使用8方向寻路（默认4方向） */
    private _use8Direction: boolean = false;

    public initEvent(): void {
        super.initEvent();
    }

    /**
     * 更新当前地图格子数据
     */
    public UpdateMapGrid(gridMap: Map<string, MapGridData>) {
        this._gridMap = gridMap;
    }

    /**
     * 设置寻路方向模式
     * @param use8Direction true为8方向，false为4方向
     */
    public setDirectionMode(use8Direction: boolean) {
        this._use8Direction = use8Direction;
    }

    // ==================== A* 寻路核心 ====================
    /**
     * A* 寻路算法
     * @param start 起点格子
     * @param end 终点格子
     * @param ignoreEndOccupied 是否忽略终点被占据（用于攻击移动）
     * @param gridMap 地图数据（可选，默认使用当前地图）
     * @returns 路径数组（包含起点和终点），如果无法到达返回空数组
     */
    public findPath(
        start: MapGridData,
        end: MapGridData,
        ignoreEndOccupied: boolean = false,
        gridMap: Map<string, MapGridData> = this._gridMap
    ): MapGridData[] {
        // 验证起点和终点
        if (!start || !end || !gridMap) {
            console.warn('[RectPathFinding] 起点或终点无效');
            return [];
        }

        if (start.equals(end)) {
            return [start];
        }

        // 获取地图中的实际格子数据
        const startCell = gridMap.get(start.getHashKey());
        const endCell = gridMap.get(end.getHashKey());

        if (!startCell || !endCell) {
            console.warn('[RectPathFinding] 起点或终点不在地图上');
            return [];
        }

        if (!endCell.walkable && !ignoreEndOccupied) {
            console.warn('[RectPathFinding] 终点不可行走');
            return [];
        }

        // 初始化开放列表和关闭列表
        const openList = new MinHeap();
        const closedSet = new Set<string>();
        const gScores = new Map<string, number>();

        // 起点入队
        const startNode = new PathNode(startCell, 0, startCell.distanceTo(endCell), null);
        openList.push(startNode);
        gScores.set(startCell.getHashKey(), 0);

        // A* 主循环
        while (!openList.isEmpty()) {
            const current = openList.pop()!;
            const currentKey = current.grid.getHashKey();

            // 到达终点
            if (current.grid.equals(endCell)) {
                return this.reconstructPath(current);
            }

            // 加入关闭列表
            closedSet.add(currentKey);

            // 遍历所有邻居
            const neighborPositions = this._use8Direction
                ? current.grid.getNeighbors8()
                : current.grid.getNeighbors4();

            for (const neighborPos of neighborPositions) {
                const neighborKey = `${neighborPos.x},${neighborPos.y}`;
                const neighborCell = gridMap.get(neighborKey);

                // 检查邻居是否有效
                if (!neighborCell) continue;
                if (closedSet.has(neighborKey)) continue;

                // 检查是否可通行
                const isEnd = neighborCell.equals(endCell);
                if (!isEnd) {
                    // 非终点：必须可行走且未被占据
                    if (!neighborCell.walkable || !neighborCell.isEmpty()) {
                        continue;
                    }
                } else {
                    // 终点处理
                    if (ignoreEndOccupied) {
                        // 忽略终点占据的情况下
                        // 判断占据单位是否为地图物体（IMapObject）
                        const isMapObject = neighborCell.occupyUnit &&
                            typeof neighborCell.occupyUnit === 'object' &&
                            'resourcePath' in neighborCell.occupyUnit;

                        if (!isMapObject && !neighborCell.walkable) {
                            // 不是地图物体占据，且不可行走，则跳过
                            continue;
                        }
                        // 如果是地图物体占据，即使walkable为false也允许通过
                    } else {
                        // 不忽略占据，终点必须为空
                        if (!neighborCell.isEmpty()) {
                            continue;
                        }
                    }
                }

                // 计算新的 g 值（对角线移动代价为1.414，直线为1）
                const isDiagonal = neighborPos.x !== current.grid.gridX && neighborPos.y !== current.grid.gridY;
                const moveCost = isDiagonal ? 1.414 : 1;
                const tentativeG = current.g + moveCost;

                // 如果找到更好的路径
                const oldG = gScores.get(neighborKey);
                if (oldG === undefined || tentativeG < oldG) {
                    gScores.set(neighborKey, tentativeG);
                    const h = neighborCell.distanceTo(endCell);
                    const neighborNode = new PathNode(neighborCell, tentativeG, h, current);
                    openList.push(neighborNode);
                }
            }
        }

        // 无法找到路径，尝试寻找最近的可达格子
        console.log('[RectPathFinding] 目标不可达，寻找最近的可达点');
        const nearestReachable = this.findNearestReachableGrid(startCell, endCell, gridMap);
        if (nearestReachable && !nearestReachable.equals(startCell)) {
            // 递归寻路到最近的可达格子
            return this.findPath(start, nearestReachable, false, gridMap);
        }

        console.warn('[RectPathFinding] 完全无法找到路径');
        return [];
    }

    /**
     * 重建路径（从终点回溯到起点）
     */
    private reconstructPath(endNode: PathNode): MapGridData[] {
        const path: MapGridData[] = [];
        let current: PathNode | null = endNode;

        while (current !== null) {
            path.push(current.grid);
            current = current.parent;
        }

        return path.reverse();
    }

    /**
     * 查找距离目标最近的可达格子
     */
    private findNearestReachableGrid(
        start: MapGridData,
        target: MapGridData,
        gridMap: Map<string, MapGridData>
    ): MapGridData | null {
        const visited = new Set<string>();
        const queue: MapGridData[] = [start];
        visited.add(start.getHashKey());

        let nearestGrid: MapGridData | null = null;
        let minDistance = Infinity;

        // BFS 遍历所有可达格子
        while (queue.length > 0) {
            const current = queue.shift()!;
            const distance = current.distanceTo(target);

            // 更新最近的格子
            if (distance < minDistance) {
                minDistance = distance;
                nearestGrid = current;
            }

            // 遍历邻居
            const neighborPositions = this._use8Direction
                ? current.getNeighbors8()
                : current.getNeighbors4();

            for (const neighborPos of neighborPositions) {
                const neighborKey = `${neighborPos.x},${neighborPos.y}`;
                if (visited.has(neighborKey)) continue;

                const neighborCell = gridMap.get(neighborKey);
                if (!neighborCell) continue;
                if (!neighborCell.walkable || !neighborCell.isEmpty()) continue;

                visited.add(neighborKey);
                queue.push(neighborCell);
            }
        }

        return nearestGrid;
    }

    // ==================== 移动范围计算 ====================
    /**
     * 获取移动范围内所有可达格子（使用Dijkstra算法）
     * @param start 起点
     * @param moveRange 移动力
     * @param includeOccupied 是否包含被占据的格子（作为终点）
     * @param gridMap 地图数据
     * @returns 可达格子数组
     */
    public getReachableRange(
        start: MapGridData,
        moveRange: number,
        includeOccupied: boolean = false,
        gridMap: Map<string, MapGridData> = this._gridMap
    ): MapGridData[] {
        if (!start || moveRange <= 0 || !gridMap) {
            return [];
        }

        const startCell = gridMap.get(start.getHashKey());
        if (!startCell) {
            return [];
        }

        const reachable: MapGridData[] = [];
        const visited = new Set<string>();
        const queue: Array<{ grid: MapGridData, cost: number }> = [];

        // 起点入队
        queue.push({ grid: startCell, cost: 0 });
        visited.add(startCell.getHashKey());

        while (queue.length > 0) {
            // 取出代价最小的节点
            const current = queue.shift()!;

            // 加入可达列表
            if (current.cost > 0) { // 不包含起点
                reachable.push(current.grid);
            }

            // 如果已达最大移动力，不再扩展
            if (current.cost >= moveRange) {
                continue;
            }

            // 遍历邻居
            const neighborPositions = this._use8Direction
                ? current.grid.getNeighbors8()
                : current.grid.getNeighbors4();

            for (const neighborPos of neighborPositions) {
                const neighborKey = `${neighborPos.x},${neighborPos.y}`;
                const neighborCell = gridMap.get(neighborKey);

                if (!neighborCell) continue;
                if (visited.has(neighborKey)) continue;
                if (!neighborCell.walkable) continue;

                // 检查是否被占据
                const isOccupied = !neighborCell.isEmpty();
                if (isOccupied && !includeOccupied) {
                    // 如果被占据且不包含占据格，标记为已访问但不入队
                    visited.add(neighborKey);
                    continue;
                }

                visited.add(neighborKey);

                // 如果被占据，可以作为终点但不能穿过
                if (isOccupied) {
                    reachable.push(neighborCell);
                } else {
                    // 未被占据，可以继续扩展
                    queue.push({ grid: neighborCell, cost: current.cost + 1 });
                }
            }
        }

        return reachable;
    }

    // ==================== 辅助功能 ====================
    /**
     * 获取路径总代价
     */
    public getPathCost(path: MapGridData[]): number {
        if (!path || path.length <= 1) {
            return 0;
        }
        return path.length - 1;
    }

    /**
     * 检查路径是否有效
     */
    public isPathValid(path: MapGridData[], gridMap: Map<string, MapGridData> = this._gridMap): boolean {
        if (!path || path.length === 0 || !gridMap) {
            return false;
        }

        for (let i = 0; i < path.length; i++) {
            const cell = gridMap.get(path[i].getHashKey());
            if (!cell) return false;
            if (!cell.walkable) return false;

            // 除了起点和终点，中间格子不能被占据
            if (i > 0 && i < path.length - 1 && !cell.isEmpty()) {
                return false;
            }
        }

        return true;
    }

    /**
     * 获取指定范围内的所有格子（不考虑障碍）
     * @param center 中心点
     * @param range 范围
     * @param gridMap 地图数据
     * @returns 范围内的格子数组
     */
    public getCellsInRange(
        center: MapGridData,
        range: number,
        gridMap: Map<string, MapGridData> = this._gridMap
    ): MapGridData[] {
        if (!gridMap || !center) {
            return [];
        }

        const cells: MapGridData[] = [];
        const centerX = center.gridX;
        const centerY = center.gridY;

        // 遍历范围内的所有格子
        for (let x = centerX - range; x <= centerX + range; x++) {
            for (let y = centerY - range; y <= centerY + range; y++) {
                const key = `${x},${y}`;
                const cell = gridMap.get(key);
                if (cell && !cell.equals(center)) {
                    const distance = center.distanceTo(cell);
                    if (distance <= range) {
                        cells.push(cell);
                    }
                }
            }
        }

        return cells;
    }

    /**
     * 计算两点之间的距离
     */
    public getDistance(from: MapGridData, to: MapGridData): number {
        return from.distanceTo(to);
    }

    /**
     * 检查两个格子是否相邻
     */
    public isAdjacent(grid1: MapGridData, grid2: MapGridData): boolean {
        const dx = Math.abs(grid1.gridX - grid2.gridX);
        const dy = Math.abs(grid1.gridY - grid2.gridY);
        if (this._use8Direction) {
            return dx <= 1 && dy <= 1 && (dx + dy) > 0;
        } else {
            return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
        }
    }

    /**
     * 获取最近的格子
     * @param fromGrid 起始格子
     * @param targetGrids 目标格子数组
     * @returns 距离最近的格子，如果目标数组为空则返回 null
     */
    public GetNearestGrids(fromGrid: MapGridData, targetGrids: MapGridData[]): MapGridData | null {
        if (!fromGrid || !targetGrids || targetGrids.length === 0) {
            return null;
        }

        let nearestGrid: MapGridData | null = null;
        let minDistance = Infinity;

        for (const targetGrid of targetGrids) {
            const distance = fromGrid.distanceTo(targetGrid);
            if (distance < minDistance) {
                minDistance = distance;
                nearestGrid = targetGrid;
            }
        }

        return nearestGrid;
    }

    /**
     * 世界坐标转格子坐标
     */
    public worldPosToGrid(worldX: number, worldY: number): Vec2 {
        const gridX = Math.floor(worldX / MapGridData.WIDTH_PX);
        const gridY = Math.floor(worldY / MapGridData.HEIGHT_PX);
        return new Vec2(gridX, gridY);
    }

    /**
     * 格子坐标转世界坐标（格子中心）
     */
    public gridToWorldPos(gridX: number, gridY: number): Vec2 {
        const worldX = gridX * MapGridData.WIDTH_PX + MapGridData.WIDTH_PX / 2;
        const worldY = gridY * MapGridData.HEIGHT_PX + MapGridData.HEIGHT_PX / 2;
        return new Vec2(worldX, worldY);
    }
 
}
