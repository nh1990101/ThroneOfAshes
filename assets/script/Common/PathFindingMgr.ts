import { _decorator, Component, Node } from 'cc';
import { BaseMgr } from './BaseMgr';
import { HexagonData } from '../GamePlay/Battle/HexagonData';
const { ccclass, property } = _decorator;

/**
 * 寻路节点（A*算法用）
 */
class PathNode {
    hex: HexagonData;           // 六边形数据
    g: number = 0;              // 从起点到当前点的实际代价
    h: number = 0;              // 到终点的启发式估计
    f: number = 0;              // g + h 总评估值
    parent: PathNode | null = null;  // 父节点，用于回溯路径

    constructor(hex: HexagonData, g: number = 0, h: number = 0, parent: PathNode | null = null) {
        this.hex = hex;
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
 * 寻路管理工具
 */
@ccclass('PathFindingMgr')
export class PathFindingMgr extends BaseMgr {
    private _gridMap: Map<string, HexagonData>;
    public initEvent(): void {
        super.initEvent();
    }
    /**
     * 更新当前地图格子数据
     */
    public UpdateMapGrid(gridMap: Map<string, HexagonData>) {
        this._gridMap = gridMap;
    }
    // ==================== A* 寻路核心 ====================
    /**
     * A* 寻路算法
     * @param start 起点六边形
     * @param end 终点六边形
     * @param gridMap 地图数据（key为"q,r"格式）
     * @param ignoreEndOccupied 是否忽略终点被占据（用于攻击移动）
     * @returns 路径数组（包含起点和终点），如果无法到达返回空数组
     */
    public findPath(
        start: HexagonData,
        end: HexagonData,
        ignoreEndOccupied: boolean = false,
        gridMap: Map<string, HexagonData> = this._gridMap
    ): HexagonData[] {
        // 验证起点和终点
        if (!start || !end || !gridMap) {
            console.warn('[PathFinding] 起点或终点无效');
            return [];
        }

        if (start.equals(end)) {
            return [start];
        }

        // 获取地图中的实际格子数据
        const startCell = gridMap.get(start.getHashKey());
        const endCell = gridMap.get(end.getHashKey());

        if (!startCell || !endCell) {
            console.warn('[PathFinding] 起点或终点不在地图上');
            return [];
        }

        if (!endCell.walkable && !ignoreEndOccupied) {
            console.warn('[PathFinding] 终点不可行走');
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
            const currentKey = current.hex.getHashKey();

            // 到达终点
            if (current.hex.equals(endCell)) {
                return this.reconstructPath(current);
            }

            // 加入关闭列表
            closedSet.add(currentKey);

            // 遍历所有邻居
            const neighbors = current.hex.getNeighbors();
            for (const neighbor of neighbors) {
                const neighborKey = neighbor.getHashKey();
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
                } else if (!ignoreEndOccupied) {
                    // 终点：如果不忽略占据，则必须为空
                    if (!neighborCell.isEmpty()) {
                        continue;
                    }
                }

                // 计算新的 g 值
                const tentativeG = current.g + 1; // 移动代价固定为1

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

        // 无法找到路径
        console.warn('[PathFinding] 无法找到路径');
        return [];
    }

    /**
     * 重建路径（从终点回溯到起点）
     */
    private reconstructPath(endNode: PathNode): HexagonData[] {
        const path: HexagonData[] = [];
        let current: PathNode | null = endNode;

        while (current !== null) {
            path.push(current.hex);
            current = current.parent;
        }

        return path.reverse();
    }

    // ==================== 移动范围计算 ====================
    /**
     * 获取移动范围内所有可达格子（使用Dijkstra算法）
     * @param start 起点
     * @param moveRange 移动力
     * @param gridMap 地图数据
     * @param includeOccupied 是否包含被占据的格子（作为终点）
     * @returns 可达格子数组
     */
    public getReachableRange(
        start: HexagonData,
        moveRange: number,
        includeOccupied: boolean = false,
        gridMap: Map<string, HexagonData> = this._gridMap
    ): HexagonData[] {
        if (!start || moveRange <= 0 || !gridMap) {
            return [];
        }

        const startCell = gridMap.get(start.getHashKey());
        if (!startCell) {
            return [];
        }

        const reachable: HexagonData[] = [];
        const visited = new Set<string>();
        const queue: Array<{ hex: HexagonData, cost: number }> = [];

        // 起点入队
        queue.push({ hex: startCell, cost: 0 });
        visited.add(startCell.getHashKey());

        while (queue.length > 0) {
            // 取出代价最小的节点（简化版Dijkstra，这里用BFS）
            const current = queue.shift()!;

            // 加入可达列表
            if (current.cost > 0) { // 不包含起点
                reachable.push(current.hex);
            }

            // 如果已达最大移动力，不再扩展
            if (current.cost >= moveRange) {
                continue;
            }

            // 遍历邻居
            const neighbors = current.hex.getNeighbors();
            for (const neighbor of neighbors) {
                const neighborKey = neighbor.getHashKey();
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
                    queue.push({ hex: neighborCell, cost: current.cost + 1 });
                }
            }
        }

        return reachable;
    }

    // ==================== 辅助功能 ====================
    /**
     * 获取路径总代价
     */
    public getPathCost(path: HexagonData[]): number {
        if (!path || path.length <= 1) {
            return 0;
        }
        return path.length - 1; // 简化版，每步代价为1
    }

    /**
     * 检查路径是否有效
     */
    public isPathValid(path: HexagonData[], gridMap: Map<string, HexagonData> = this._gridMap): boolean {
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
        center: HexagonData,
        range: number,
        gridMap: Map<string, HexagonData> = this._gridMap
    ): HexagonData[] {
        if (!gridMap) {
            return [];
        }
        const cells: HexagonData[] = [];
        const area = HexagonData.getReachableArea(center, range);

        for (const hex of area) {
            const cell = gridMap.get(hex.getHashKey());
            if (cell && !cell.equals(center)) {
                cells.push(cell);
            }
        }

        return cells;
    }

    /**
     * 获取攻击范围内的目标
     * @param position 攻击者位置
     * @param minRange 最小攻击范围
     * @param maxRange 最大攻击范围
     * @param gridMap 地图数据
     * @param targetFilter 目标过滤函数（例如：只选择敌方单位）
     * @returns 可攻击的目标格子数组
     */
    public getAttackTargets(
        position: HexagonData,
        minRange: number,
        maxRange: number,
        targetFilter?: (hex: HexagonData) => boolean,
        gridMap: Map<string, HexagonData> = this._gridMap,
    ): HexagonData[] {
        if (!gridMap) {
            return [];
        }
        const targets: HexagonData[] = [];
        const area = HexagonData.getReachableArea(position, maxRange);

        for (const hex of area) {
            const distance = position.distanceTo(hex);
            if (distance < minRange || distance > maxRange) {
                continue;
            }

            const cell = gridMap.get(hex.getHashKey());
            if (!cell) continue;

            // 应用过滤器
            if (targetFilter && !targetFilter(cell)) {
                continue;
            }

            targets.push(cell);
        }

        return targets;
    }

    /**
     * 计算两点之间的直线距离（六边形格子数）
     */
    public getDistance(from: HexagonData, to: HexagonData): number {
        return from.distanceTo(to);
    }

    /**
     * 检查两个格子是否相邻
     */
    public isAdjacent(hex1: HexagonData, hex2: HexagonData): boolean {
        return hex1.isNeighbor(hex2);
    }
}


