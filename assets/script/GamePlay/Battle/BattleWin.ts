import { _decorator, Component, Node, EventTouch, Vec2, Vec3, UITransform } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BattleUnit } from './BattleUnit';
import { UNIT_ACTION } from '../../Common/GameEnum';
import { BattleMgr } from './BattleMgr';
import { BattleMapMgr } from './BattleMapMgr';
import { HexagonData } from './HexagonData';
import { HexagonCell } from './HexagonCell';
import { PathFindingMgr } from '../../Common/PathFindingMgr';
const { ccclass, property } = _decorator;

@ccclass('BattleWin')
export class BattleWin extends BaseWin {

    @property(Node)
    mapContainer: Node;

    @property(BaseBtn)
    btn_close: BaseBtn = null!;

    @property(BattleUnit)
    testUnit: BattleUnit;



    public initEvent(): void {

        super.initEvent();

        // 添加地图点击事件
        if (this.mapContainer) {
            this.addNodeEvent(this.mapContainer, Node.EventType.TOUCH_END, this.onMapClick);
        }
    }
    async OnRefreshUI() {
        super.OnRefreshUI();


        //战斗地图初始化
        var mapMgr = BattleMapMgr.getInstance();
        mapMgr.mapContainer = this.mapContainer;
        await mapMgr.initMap();

        //战斗主逻辑初始化
        BattleMgr.getInstance().Init();

        //战斗单位初始化
        await this.testUnit.SetUnitId(1001);
        this.testUnit.PlayAction(UNIT_ACTION.IDLE, true);
        // this.testUnit.PlayActions([UNIT_ACTION.IDLE, UNIT_ACTION.MOVE, UNIT_ACTION.BE_HIT]);


        var mapDatas = mapMgr.getAllHexData();
        var bornPos = mapDatas[0];
        this.testUnit.SetMapGridPos(bornPos.pos);
        // this.testUnit.SetWorldPos(bornPosCell.GetWorldPos())
    }
    closeWin(): void {
        super.closeWin();

        var mapMgr = BattleMapMgr.getInstance();
        mapMgr.clearMap();
    }

    /**
     * 地图点击事件处理
     */
    private onMapClick(event: EventTouch): void {
        // 获取点击位置（世界坐标）
        const touchPos = event.getUILocation();

        // 将触摸位置转换为mapContainer的本地坐标
        const uiTransform = this.mapContainer.getComponent(UITransform);
        if (!uiTransform) {
            console.warn('mapContainer没有UITransform组件');
            return;
        }

        const localPos = new Vec3();
        uiTransform.convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0), localPos);

        // 将本地坐标转换为六边形坐标（不创建实例，性能更好）
        const coord = HexagonData.pixelToCoord(localPos.x, localPos.y);

        // 获取地图管理器
        const mapMgr = BattleMapMgr.getInstance();

        // 检查点击的格子是否在地图上
        const clickedCell = mapMgr.getHexCell(coord.q, coord.r);

        if (clickedCell) {
            const cellData = clickedCell.GetData();
            console.log(`点击了六边形格子: (${cellData.q}, ${cellData.r})`);

            // 这里可以添加你的业务逻辑
            this.onHexCellClicked(clickedCell, cellData);

        } else {
            console.log(`点击位置不在有效格子上: (${coord.q}, ${coord.r})`);
        }
    }

    /**
     * 六边形格子点击回调（可以在这里添加业务逻辑）
     * @param cell 点击的格子视图
     * @param data 点击的格子数据
     */
    private onHexCellClicked(cell: HexagonCell, data: HexagonData): void {
        // 示例：高亮显示点击的格子
        // 可以在这里添加你的业务逻辑，比如：
        // - 移动单位到该格子
        // - 显示格子信息
        // - 标记选中状态
        // - 显示可移动范围等

        console.log(`格子信息: 坐标(${data.q},${data.r}), 可行走:${data.walkable}, 占据:${data.occupiedUnitId || '无'}`);

        var mapMgr = BattleMapMgr.getInstance();


        var fromData = mapMgr.getHexDataFromPos(this.testUnit.GetMapPos());
        this.testUnit.StartMove(PathFindingMgr.getInstance().findPath(fromData, data));
    }
}


