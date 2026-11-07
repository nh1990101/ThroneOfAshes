import { game, sys } from 'cc';
import { BaseMgr } from './BaseMgr';

const STORAGE_KEY = 'system_setting';

export const GRAPHIC_QUALITY_LOW = 1;
export const GRAPHIC_QUALITY_MID = 2;
export const GRAPHIC_QUALITY_HIGH = 3;

export const GRAPHIC_FPS_LOW = 1;
export const GRAPHIC_FPS_HIGH = 2;

const DEFAULT_MUSIC_VOLUME = 1;
const DEFAULT_SOUND_VOLUME = 1;
const DEFAULT_GRAPHIC_QUALITY = GRAPHIC_QUALITY_HIGH;
const DEFAULT_GRAPHIC_FPS = GRAPHIC_FPS_HIGH;

interface SystemSettingRecord {
    music_volume: number;
    sound_volume: number;
    graphic_quality: number;
    graphic_fps: number;
}

/** 音乐、音效、画质、帧率。音量和画质只保存，帧率写入 game.frameRate。 */
export class SystemSettingMgr extends BaseMgr {
    private setting_record: SystemSettingRecord;

    public constructor() {
        super();
        this.setting_record = this.loadRecord();
    }

    public getMusicVolume(): number {
        return this.setting_record.music_volume;
    }

    public setMusicVolume(volume: number): void {
        this.setting_record.music_volume = this.normalizeVolume(volume, DEFAULT_MUSIC_VOLUME);
        this.saveRecord();
    }

    public getSoundVolume(): number {
        return this.setting_record.sound_volume;
    }

    public setSoundVolume(volume: number): void {
        this.setting_record.sound_volume = this.normalizeVolume(volume, DEFAULT_SOUND_VOLUME);
        this.saveRecord();
    }

    public getGraphicQuality(): number {
        return this.setting_record.graphic_quality;
    }

    public setGraphicQuality(level: number): void {
        this.setting_record.graphic_quality = this.normalizeQuality(level);
        this.saveRecord();
    }

    public getGraphicFps(): number {
        return this.setting_record.graphic_fps;
    }

    public setGraphicFps(level: number): void {
        this.setting_record.graphic_fps = this.normalizeFps(level);
        this.saveRecord();
        this.applyGraphicFps();
    }

    public applyGraphicFps(): void {
        game.frameRate = this.setting_record.graphic_fps === GRAPHIC_FPS_LOW ? 30 : 60;
    }

    private loadRecord(): SystemSettingRecord {
        const stored = this.readStoredRecord();
        return {
            music_volume: this.normalizeVolume(stored ? stored.music_volume : undefined, DEFAULT_MUSIC_VOLUME),
            sound_volume: this.normalizeVolume(stored ? stored.sound_volume : undefined, DEFAULT_SOUND_VOLUME),
            graphic_quality: this.normalizeQuality(stored ? stored.graphic_quality : undefined),
            graphic_fps: this.normalizeFps(stored ? stored.graphic_fps : undefined),
        };
    }

    private readStoredRecord(): Record<string, unknown> | null {
        const raw = sys.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }
        try {
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return null;
            }
            return parsed as Record<string, unknown>;
        } catch {
            return null;
        }
    }

    private normalizeVolume(value: unknown, fallback: number): number {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
            return fallback;
        }
        return value;
    }

    private normalizeQuality(value: unknown): number {
        if (value === GRAPHIC_QUALITY_LOW || value === GRAPHIC_QUALITY_MID || value === GRAPHIC_QUALITY_HIGH) {
            return value;
        }
        return DEFAULT_GRAPHIC_QUALITY;
    }

    private normalizeFps(value: unknown): number {
        if (value === GRAPHIC_FPS_LOW || value === GRAPHIC_FPS_HIGH) {
            return value;
        }
        return DEFAULT_GRAPHIC_FPS;
    }

    private saveRecord(): void {
        sys.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.setting_record));
    }
}
