import { _decorator, Node, Tween, tween, UIOpacity, Vec2, Vec3 } from 'cc';
import { BaseMgr } from '../../Common/BaseMgr';
import { AssetMgr } from '../../Common/AssetMgr';
import { GameUrl } from '../../Common/GameUrl';
import { BattleDamageTxt } from './BattleDamageTxt';
import { BattleMgr } from './BattleMgr';
const { ccclass, property } = _decorator;

@ccclass('DamageTextMgr')
export class DamageTextMgr extends BaseMgr {
    // protected arrDamages: string[];
    public initEvent(): void {
        super.initEvent();
    }
    /**伤害飘字 */
    public async showDamageText(content: string, pos: Vec2, parent: Node): Promise<void> {
        return new Promise(async resolve => {
            var battleMgr = BattleMgr.getInstance();
            var speedRate = 1 / battleMgr.playSpeedRate;
            const damageText = await AssetMgr.createPrefabFromPool(
                GameUrl.Battle_Prefab.format("BattleDamageTxt"),
                pos,
                parent,
                BattleDamageTxt
            );
            const node = damageText.node;
            const uiOpacity = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);

            // 节点可能来自对象池，先停止上次未结束的动画，再重置显示状态。
            Tween.stopAllByTarget(node);
            Tween.stopAllByTarget(uiOpacity);
            damageText.showText(content);
            node.setScale(0.8, 0.8, 1);
            uiOpacity.opacity = 255;

            const appearDuration = 0.15 * speedRate;
            const stayDuration = 0.2 * speedRate;
            const fadeDuration = 0.65 * speedRate;
            const totalDuration = appearDuration + stayDuration + fadeDuration;

            // 先由 0.8 倍放大到正常大小，随后慢慢缩小。
            tween(node)
                .to(appearDuration, { scale: Vec3.ONE }, { easing: 'sineOut' })
                .delay(stayDuration)
                .to(fadeDuration, { scale: new Vec3(0.5, 0.5, 1) }, { easing: 'sineIn' })
                .start();

            // 整个生命周期持续向上飘动。
            tween(node)
                .by(totalDuration, { position: new Vec3(0, 80, 0) }, { easing: 'sineOut' })
                .start();

            // 缩小的同时逐渐透明，结束后回收到对象池。
            tween(uiOpacity)
                .delay(appearDuration + stayDuration)
                .to(fadeDuration, { opacity: 0 }, { easing: 'sineIn' })
                .call(() => {
                    if (node.isValid) {
                        AssetMgr.removeNode(node);
                        resolve(null);
                    }
                })
                .start();
        })
    }
}


