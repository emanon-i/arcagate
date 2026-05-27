import { invoke } from '@tauri-apps/api/core';

export async function getConfig(key: string): Promise<string | null> {
	return invoke<string | null>('cmd_get_config', { key });
}

export async function setConfig(key: string, value: string): Promise<void> {
	return invoke<void>('cmd_set_config', { key, value });
}

export async function getHotkey(): Promise<string> {
	return invoke<string>('cmd_get_hotkey');
}

export async function setHotkey(hotkey: string): Promise<void> {
	return invoke<void>('cmd_set_hotkey', { hotkey });
}

export async function getAutostart(): Promise<boolean> {
	return invoke<boolean>('cmd_get_autostart');
}

export async function setAutostart(enabled: boolean): Promise<void> {
	return invoke<void>('cmd_set_autostart', { enabled });
}

export async function isSetupComplete(): Promise<boolean> {
	return invoke<boolean>('cmd_is_setup_complete');
}

export async function markSetupComplete(): Promise<void> {
	return invoke<void>('cmd_mark_setup_complete');
}

/**
 * PH-PQ-200 T6: 初回体験 (SetupWizard + OnboardingTour) を再実行可能な状態に戻す。
 * setup / onboarding 完了フラグを両方 reset する。
 */
export async function resetFirstRun(): Promise<void> {
	return invoke<void>('cmd_reset_first_run');
}

/**
 * #5: クリーン状態リセット (factory reset)。
 * library / workspace の DB データを段階選択で初期化する (設定リセットは別経路)。
 */
export async function factoryReset(resetLibrary: boolean, resetWorkspace: boolean): Promise<void> {
	return invoke<void>('cmd_factory_reset', { resetLibrary, resetWorkspace });
}

/**
 * PH-PQ-100 T4: 起動時 self-recovery 通知 (例: 破損 hotkey の default 縮退) を
 * 取得してクリアする。 frontend は mount 直後に 1 度だけ呼ぶ。
 * 返るのは i18n キーに対応する notice code の配列。
 */
export async function takeStartupNotices(): Promise<string[]> {
	return invoke<string[]>('cmd_take_startup_notices');
}

/**
 * DB 破損 self-recovery が発生したことを示す永続 marker (app data dir
 * 直下 `db-recovery-notice.json`)。 `cmd_ack_db_recovery_notice` で消されるまで
 * 起動毎に banner で再表示される。
 *
 * 動機 (2026-05-27): 旧実装は recovery 発生時に native dialog を一度出すだけで、
 * dialog を閉じ忘れた / 控え忘れた user は「気づいたらデータが消えていた」 状態に
 * なり得た。 永続 marker に置換し、 明示的に「了解」 されるまで surface し続ける。
 */
export interface DbRecoveryNotice {
	backup_path: string;
	recovered_at_unix: number;
}

export async function getDbRecoveryNotice(): Promise<DbRecoveryNotice | null> {
	return invoke<DbRecoveryNotice | null>('cmd_get_db_recovery_notice');
}

export async function ackDbRecoveryNotice(): Promise<void> {
	return invoke<void>('cmd_ack_db_recovery_notice');
}
