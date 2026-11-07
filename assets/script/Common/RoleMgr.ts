import { BaseMgr } from './BaseMgr';

/** 角色基础信息。目前只有阵营 */
export interface RoleInfo {
    faction_id: number;
}

/** 角色数据。阵营默认 1，接到服务器同步后再写入 */
export class RoleMgr extends BaseMgr {
    private role_info: RoleInfo = { faction_id: 1 };

    public getRoleFactionId(): number {
        return this.role_info.faction_id;
    }

    public setRoleFactionId(faction_id: number): void {
        this.role_info.faction_id = faction_id;
    }
}
