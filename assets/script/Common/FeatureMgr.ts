import { UIMananger } from '../Component/UIMananger';
import { ConfigMgr } from '../Config/ConfigMgr';
import { FlyNoticeMgr } from '../GamePlay/BaseSystem/FlyNoticeMgr';
import { BaseMgr } from './BaseMgr';
import { EventManager } from './EventManager';
import { GameEvent } from './GameEnum';
import { GlobalData } from './GlobalData';
import { lang } from './LangMgr';

interface FeatureState {
    is_unlock: boolean;
    is_block: boolean;
}

/** 功能能不能进，以及按跳转表打开窗口。解锁结果由服务器写入 */
export class FeatureMgr extends BaseMgr {
    private feature_state = new Map<string, FeatureState>();
    private has_server_state = false;

    /** 全量解锁。没出现的功能写成未解锁，不改屏蔽。单机全开也从这里切到服务器结果 */
    public applyFeatureUnlockAll(feature_dict: Record<string, boolean>): void {
        let changed = this.markServer();
        for (const feature_id of ConfigMgr.instance.FeatureData.keys()) {
            if (this.setUnlock(feature_id, feature_dict[feature_id] === true)) {
                changed = true;
            }
        }
        if (changed) {
            this.dispatchChange();
        }
    }

    /** 单条解锁。不能用来重新锁上，也不结束单机全开 */
    public applyFeatureUnlock(feature_id: string): void {
        if (this.hasFeature(feature_id) && this.setUnlock(feature_id, true)) {
            this.dispatchChange();
        }
    }

    /** 整表替换屏蔽。表里有且字典为 true 的才屏蔽 */
    public applyFeatureBlock(block_dict: Record<string, boolean>): void {
        let changed = this.markServer();
        for (const feature_id of ConfigMgr.instance.FeatureData.keys()) {
            if (this.setBlock(feature_id, block_dict[feature_id] === true)) {
                changed = true;
            }
        }
        if (changed) {
            this.dispatchChange();
        }
    }

    /** 已解锁且未屏蔽。表里没有这个 id 时返回 false */
    public canEnterFeature(feature_id: string): boolean {
        if (!this.hasFeature(feature_id)) {
            return false;
        }
        if (this.isSingleOpen()) {
            return true;
        }
        const state = this.feature_state.get(feature_id);
        if (!state) {
            return false;
        }
        return state.is_unlock && !state.is_block;
    }

    /**
     * 入口要不要画出来。
     * 没配功能 id 就显示。屏蔽一律隐藏。
     * hide_locked 为 true 时，未解锁也隐藏。
     */
    public isFeatureVisible(feature_id?: string, hide_locked?: boolean): boolean {
        if (!feature_id) {
            return true;
        }
        if (this.isBlocked(feature_id)) {
            return false;
        }
        if (hide_locked && !this.canEnterFeature(feature_id)) {
            return false;
        }
        return true;
    }

    /** 未解锁文案。没有配文案时返回空串 */
    public getFeatureLockDesc(feature_id: string): string {
        const row = ConfigMgr.instance.FeatureData.get(feature_id);
        if (!row || row.lock_desc == null) {
            return '';
        }
        return lang(row.lock_desc);
    }

    /** 按跳转表打开。不能进时有文案就飘字 */
    public openNavigate(navigate_id: string): void {
        const row = ConfigMgr.instance.NavigateData.get(navigate_id);
        if (!row || !row.nav_data || row.nav_data.length < 2) {
            throw new Error(`跳转表没有这个配置：${navigate_id}`);
        }
        if (row.feature && !this.canEnterFeature(row.feature)) {
            const desc = this.getFeatureLockDesc(row.feature);
            if (desc) {
                void FlyNoticeMgr.getInstance().showTexts(desc);
            }
            return;
        }
        const action = row.nav_data[0];
        if (action !== 'OpenUI') {
            throw new Error(`跳转动作还没接：${action}`);
        }
        void UIMananger.instance.showWinByName(row.nav_data[1]);
    }

    private hasFeature(feature_id: string): boolean {
        return ConfigMgr.instance.FeatureData.has(feature_id);
    }

    /** 单机还没收到服务器时，表内功能先放开，避免入口全锁死 */
    private isSingleOpen(): boolean {
        return !this.has_server_state && GlobalData.IsSingleMode;
    }

    private isBlocked(feature_id: string): boolean {
        if (!this.hasFeature(feature_id) || this.isSingleOpen()) {
            return false;
        }
        const state = this.feature_state.get(feature_id);
        if (!state) {
            return false;
        }
        return state.is_block;
    }

    /** 第一次收到服务器数据。单机从全开切到服务器结果，算一次变化 */
    private markServer(): boolean {
        if (this.has_server_state) {
            return false;
        }
        const single_open = GlobalData.IsSingleMode;
        this.has_server_state = true;
        return single_open;
    }

    private setUnlock(feature_id: string, is_unlock: boolean): boolean {
        const state = this.feature_state.get(feature_id);
        if (!state) {
            if (!is_unlock) {
                return false;
            }
            this.feature_state.set(feature_id, { is_unlock: true, is_block: false });
            return true;
        }
        if (state.is_unlock === is_unlock) {
            return false;
        }
        state.is_unlock = is_unlock;
        return true;
    }

    private setBlock(feature_id: string, is_block: boolean): boolean {
        const state = this.feature_state.get(feature_id);
        if (!state) {
            if (!is_block) {
                return false;
            }
            this.feature_state.set(feature_id, { is_unlock: false, is_block: true });
            return true;
        }
        if (state.is_block === is_block) {
            return false;
        }
        state.is_block = is_block;
        return true;
    }

    private dispatchChange(): void {
        EventManager.Instance.dispatch(GameEvent.Feature_State);
    }
}
