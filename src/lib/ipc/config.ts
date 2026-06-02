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
 * PH-CF-1300: データ透明化 — 設定 → About → Data location section が表示する
 * 絶対 path 群を取得。 個人 PC 上の username が含まれるため、 log / commit / PR
 * description に転記しないこと。
 */
export interface AppPaths {
	db: string;
	app_data_dir: string;
	log_dir: string;
}

export async function getAppPaths(): Promise<AppPaths> {
	return invoke<AppPaths>('cmd_get_app_paths');
}
