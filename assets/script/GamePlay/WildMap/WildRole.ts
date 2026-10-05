import { _decorator, Component, Layers, Node, UITransform, Vec2, Vec3 } from 'cc';
import { IActionData, UnitBase } from '../Battle/UnitBase';
import { GameLayer, ROLE_ACTION, ROLE_DIR, UNIT_ACTION } from '../../Common/GameEnum';
import { BaseComp } from '../../Component/BaseComp';
import { AnimationCom } from '../../Component/AnimationCom';
import { comp } from '../../Common/Decorator';
import { GameUrl } from '../../Common/GameUrl';
import { MapGridData } from './MapGridData';
import { MapMgr } from './MapMgr';
const { ccclass, property } = _decorator;

@ccclass('WildRole')
export class WildRole extends BaseComp {
    @comp(AnimationCom)
    animation: AnimationCom = null!;

    protected m_ActionData: Map<ROLE_ACTION, IActionData>;

    /**当前所在格子 */
    private currentGrid: MapGridData = null;
    /**目标格子 */
    private targetGrid: MapGridData = null;
    /**移动路径 */
    private movePath: MapGridData[] = [];
    /**当前路径索引 */
    private currentPathIndex: number = 0;
    /**移动速度（像素/秒） */
    private moveSpeed: number = 200;
    /**是否正在移动 */
    private isMoving: boolean = false;
    /**当前朝向 */
    private currentDir: ROLE_DIR = ROLE_DIR.DOWN;
    /**移动完成回调 */
    private moveCompleteCallback: Function = null;

    // 复用的 Vec3 对象，减少 GC
    private _tempTargetPos: Vec3 = new Vec3();
    private _tempDirection: Vec3 = new Vec3();
    private _tempCurrentPos: Vec3 = new Vec3();

    /**
     * 设置各动作帧数
     */
    protected SetActionFrame() {
        this.animation.node.setPosition(0, 60)
        this.m_ActionData = new Map<ROLE_ACTION, IActionData>();
        var frameRate = 7;
        this.m_ActionData.set(ROLE_ACTION.IDLE + ROLE_DIR.UP, { frameStart: 0, frameEnd: 2, frameRate: frameRate });
        this.m_ActionData.set(ROLE_ACTION.IDLE + ROLE_DIR.RIGHT_UP, { frameStart: 3, frameEnd: 5, frameRate: frameRate });
        this.m_ActionData.set(ROLE_ACTION.IDLE + ROLE_DIR.RIGHT, { frameStart: 6, frameEnd: 8, frameRate: frameRate });
        this.m_ActionData.set(ROLE_ACTION.IDLE + ROLE_DIR.RIGHT_DOWN, { frameStart: 9, frameEnd: 11, frameRate: frameRate });
        this.m_ActionData.set(ROLE_ACTION.IDLE + ROLE_DIR.DOWN, { frameStart: 12, frameEnd: 14, frameRate: frameRate });
        this.m_ActionData.set(ROLE_ACTION.IDLE + ROLE_DIR.LEFT_DOWN, { frameStart: 15, frameEnd: 17, frameRate: frameRate });
        this.m_ActionData.set(ROLE_ACTION.IDLE + ROLE_DIR.LEFT, { frameStart: 18, frameEnd: 20, frameRate: frameRate });
        this.m_ActionData.set(ROLE_ACTION.IDLE + ROLE_DIR.LEFT_UP, { frameStart: 21, frameEnd: 23, frameRate: frameRate });

        this.m_ActionData.set(ROLE_ACTION.MOVE + ROLE_DIR.UP, { frameStart: 24, frameEnd: 26, frameRate: frameRate });
        this.m_ActionData.set(ROLE_ACTION.MOVE + ROLE_DIR.RIGHT_UP, { frameStart: 27, frameEnd: 29, frameRate: frameRate });
        this.m_ActionData.set(ROLE_ACTION.MOVE + ROLE_DIR.RIGHT, { frameStart: 30, frameEnd: 32, frameRate: frameRate });
        this.m_ActionData.set(ROLE_ACTION.MOVE + ROLE_DIR.RIGHT_DOWN, { frameStart: 33, frameEnd: 35, frameRate: frameRate });
        this.m_ActionData.set(ROLE_ACTION.MOVE + ROLE_DIR.DOWN, { frameStart: 36, frameEnd: 38, frameRate: frameRate });
        this.m_ActionData.set(ROLE_ACTION.MOVE + ROLE_DIR.LEFT_DOWN, { frameStart: 39, frameEnd: 41, frameRate: frameRate });
        this.m_ActionData.set(ROLE_ACTION.MOVE + ROLE_DIR.LEFT, { frameStart: 42, frameEnd: 44, frameRate: frameRate });
        this.m_ActionData.set(ROLE_ACTION.MOVE + ROLE_DIR.LEFT_UP, { frameStart: 45, frameEnd: 47, frameRate: frameRate });

    }
    LoadAndPlay(id: number, dir: ROLE_DIR) {
        return new Promise(resolve => {

            this.animation.loadFramesFromAtlas(GameUrl.WildMapRoleAnimation.format(id), "").then(() => {
                this.SetActionFrame();
                this.currentDir = dir;
                this.PlayAction(ROLE_ACTION.IDLE, dir, true);
                resolve(null);
            })
        })
    }
    PlayAction(action: ROLE_ACTION, dir: ROLE_DIR, isLoop: boolean, onComplete?: Function, target?: any) {
        var actionName = action + dir;
        var actionData = this.m_ActionData.get(actionName);
        if (actionData) {
            this.animation.setFrameRate(actionData.frameRate);
            this.animation.play(actionData.frameStart, actionData.frameEnd, isLoop, onComplete, target);
        }
    }

    // ==================== 移动相关方法 ====================

    /**
     * 获取当前所在格子
     */
    public getCurrentGrid(): MapGridData {
        return this.currentGrid;
    }

    /**
     * 设置当前格子（初始化位置用）
     * @param grid 目标格子
     */
    public setGrid(grid: MapGridData) {
        // 清除旧格子的占据
        if (this.currentGrid) {
            this.currentGrid.clearOccupied();
        }

        this.currentGrid = grid;

        // 设置新格子的占据
        if (grid) {
            grid.setOccupied(this);
            // 更新角色位置到格子中心
            this.setPositionFromGrid(grid);
        }
    }

    /**
     * 根据格子设置角色位置（处理坐标转换）
     */
    private setPositionFromGrid(grid: MapGridData) {
        const mapContainer = MapMgr.getInstance().getMapContainer();
        if (!mapContainer) {
            console.error('[WildRole] setPositionFromGrid: mapContainer 未初始化');
            return;
        }

        // grid.GetXPx() 和 GetYPx() 现在返回的是 mapContainer 的本地坐标
        const gridLocalPos = this._tempTargetPos.set(grid.GetXPx(), grid.GetYPx(), 0);

        // 转换为世界坐标
        const mapTransform = mapContainer.getComponent(UITransform);
        const worldPos = mapTransform?.convertToWorldSpaceAR(gridLocalPos);

        if (worldPos && this.node.parent) {
            // 转换为角色父容器的本地坐标
            const parentTransform = this.node.parent.getComponent(UITransform);
            const localPos = parentTransform?.convertToNodeSpaceAR(worldPos);
            if (localPos) {
                this.node.setPosition(localPos);
            }
        }
    }

    /**
     * 将格子坐标转换为角色父容器的本地坐标（复用 Vec3 对象）
     */
    private gridToLocalPos(grid: MapGridData, outPos: Vec3): boolean {
        const mapContainer = MapMgr.getInstance().getMapContainer();
        if (!mapContainer) {
            return false;
        }

        const mapTransform = mapContainer.getComponent(UITransform);
        if (!mapTransform) {
            return false;
        }

        // grid.GetXPx() 和 GetYPx() 现在返回的是 mapContainer 的本地坐标
        outPos.set(grid.GetXPx(), grid.GetYPx(), 0);

        // mapContainer 本地坐标 → 世界坐标
        const worldPos = mapTransform.convertToWorldSpaceAR(outPos);

        // 世界坐标 → roleContainer 本地坐标
        if (worldPos && this.node.parent) {
            const parentTransform = this.node.parent.getComponent(UITransform);
            const localPos = parentTransform?.convertToNodeSpaceAR(worldPos);
            if (localPos) {
                outPos.set(localPos);
                return true;
            }
        }

        return false;
    }

    /**
     * 是否正在移动
     */
    public getIsMoving(): boolean {
        return this.isMoving;
    }

    /**
     * 沿路径移动
     * @param path 移动路径（包含起点和终点）
     * @returns Promise，移动完成时resolve
     */
    public moveAlongPath(path: MapGridData[]): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!path || path.length === 0) {
                console.warn('[WildRole] 移动路径为空');
                reject();
                return;
            }

            if (this.isMoving) {
                console.warn('[WildRole] 角色正在移动中');
                reject();
                return;
            }

            this.movePath = path;
            this.currentPathIndex = 0;
            this.isMoving = true;

            // 从第1个格子开始移动（0是当前位置）
            if (path.length > 1) {
                this.currentPathIndex = 1;
                this.moveToNextGridInPath(resolve);
            } else {
                // 只有一个格子，直接完成
                this.isMoving = false;
                resolve();
            }
        });
    }

    /**
     * 移动到路径中的下一个格子
     */
    private moveToNextGridInPath(onComplete: Function) {
        if (this.currentPathIndex >= this.movePath.length) {
            // 路径走完
            this.onMoveComplete(onComplete);
            return;
        }

        const nextGrid = this.movePath[this.currentPathIndex];
        this.moveToGrid(nextGrid).then(() => {
            this.currentPathIndex++;
            this.moveToNextGridInPath(onComplete);
        });
    }

    /**
     * 移动到指定格子
     * @param targetGrid 目标格子
     * @returns Promise
     */
    private moveToGrid(targetGrid: MapGridData): Promise<void> {
        return new Promise((resolve) => {
            if (!targetGrid) {
                resolve();
                return;
            }

            this.targetGrid = targetGrid;

            // 计算移动方向
            const dir = this.calculateDirection(this.currentGrid, targetGrid);
            this.currentDir = dir;

            // 播放移动动画
            this.PlayAction(ROLE_ACTION.MOVE, dir, true);

            // 保存移动完成回调
            this.moveCompleteCallback = () => {
                this.onSingleGridMoveComplete(targetGrid);
                resolve();
            };
        });
    }

    /**
     * 单格移动完成回调（抽离出来，避免在 Promise 中创建函数）
     */
    private onSingleGridMoveComplete(targetGrid: MapGridData) {
        // 更新格子占据状态
        if (this.currentGrid) {
            this.currentGrid.clearOccupied();
        }
        this.currentGrid = targetGrid;
        targetGrid.setOccupied(this);
    }

    /**
     * 每帧更新移动
     */
    protected lateUpdate(dt: number): void {
        if (!this.isMoving || !this.targetGrid) {
            return;
        }

        // 目标位置（转换为角色父容器的本地坐标，复用 _tempTargetPos）
        if (!this.gridToLocalPos(this.targetGrid, this._tempTargetPos)) {
            return;
        }

        const targetPos = this._tempTargetPos;
        this._tempCurrentPos.set(this.node.position);
        const currentPos = this._tempCurrentPos;

        // 计算移动方向（复用 _tempDirection）
        Vec3.subtract(this._tempDirection, targetPos, currentPos);
        const direction = this._tempDirection;

        // 检查是否到达目标
        const distance = direction.length();
        if (distance < 1) {
            // 到达目标
            this.node.setPosition(targetPos);
            this.callMoveCompleteCallback();
            return;
        }

        // 计算本帧移动距离
        const moveDistance = this.moveSpeed * dt;

        if (moveDistance >= distance) {
            // 本帧可以到达目标
            this.node.setPosition(targetPos);
            this.callMoveCompleteCallback();
        } else {
            // 继续移动
            direction.normalize();
            direction.multiplyScalar(moveDistance);
            Vec3.add(currentPos, currentPos, direction);
            this.node.setPosition(currentPos);
        }
    }

    /**
     * 调用移动完成回调（抽离出来，避免重复代码）
     */
    private callMoveCompleteCallback() {
        if (this.moveCompleteCallback) {
            const callback = this.moveCompleteCallback;
            this.moveCompleteCallback = null;
            callback();
        }
    }

    /**
     * 移动完成回调
     */
    private onMoveComplete(callback: Function) {
        this.isMoving = false;
        this.movePath = [];
        this.currentPathIndex = 0;
        this.targetGrid = null;
        this.moveCompleteCallback = null;

        // 播放待机动画
        this.PlayAction(ROLE_ACTION.IDLE, this.currentDir, true);

        if (callback) {
            callback();
        }
    }

    /**
     * 计算移动方向（八方向）
     */
    private calculateDirection(from: MapGridData, to: MapGridData): ROLE_DIR {
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

        return this.currentDir; // 默认返回当前方向
    }

    /**
     * 停止移动
     */
    public stopMove() {
        if (this.isMoving) {
            this.isMoving = false;
            this.movePath = [];
            this.currentPathIndex = 0;
            this.targetGrid = null;
            this.moveCompleteCallback = null;

            // 播放待机动画
            this.PlayAction(ROLE_ACTION.IDLE, this.currentDir, true);
        }
    }

    /**
     * 设置移动速度
     */
    public setMoveSpeed(speed: number) {
        this.moveSpeed = speed;
    }

    public clear(): void {
        this.stopMove();

        // 清除格子占据
        if (this.currentGrid) {
            this.currentGrid.clearOccupied();
            this.currentGrid = null;
        }

        super.clear();
        this.animation.clear();
    }
}


