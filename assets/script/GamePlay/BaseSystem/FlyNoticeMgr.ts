import { _decorator, Component, Node, Vec2, Vec3 } from 'cc';
import { BaseMgr } from '../../Common/BaseMgr';
import { FlyNotice } from './FlyNotice';
import { AssetMgr } from '../../Common/AssetMgr';
import { GameUrl } from '../../Common/GameUrl';
import { UIMananger } from '../../Component/UIMananger';
const { ccclass, property } = _decorator;

@ccclass('FlyNoticeMgr')
export class FlyNoticeMgr extends BaseMgr {
    private arr_Active: FlyNotice[];
    private noticeHeight: number = 60; // 每条飘字的高度间隔
    
    public initEvent(): void {
        super.initEvent();
        this.arr_Active = [];
    }

    public async showTexts(text: string) {
        const item = await AssetMgr.createPrefabFromPool(
            GameUrl.BaseSystemPrefab.format("FlyNotice"),
            Vec2.ZERO,
            UIMananger.instance.tipsLayer,
            FlyNotice
        );

        // 新飘字始终出现在底部（y=0位置）
        item.node.setPosition(new Vec3(0, 0, 0));

        // 将所有已存在的飘字向上移动，为新飘字腾出空间
        for (const notice of this.arr_Active) {
            notice.moveUp(this.noticeHeight);
        }

        this.arr_Active.push(item);

        // 显示飘字动画，完成后回收
        item.showTips(text, () => {
            this.removeNotice(item);
        });
    }

    private removeNotice(notice: FlyNotice): void {
        const index = this.arr_Active.indexOf(notice);
        if (index !== -1) {
            this.arr_Active.splice(index, 1);
        }
        AssetMgr.removeNode(notice.node);
    }
}

