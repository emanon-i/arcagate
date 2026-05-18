import { invoke } from '@tauri-apps/api/core';
import { scriptConfirm } from '$lib/state/script-confirm.svelte';
import { isConfirmationRequired } from './launch-errors';

/**
 * #11: スクリプト監視 widget の IPC。
 * scan は監視フォルダ配下の allowlist スクリプトを列挙、run は service 層で
 * path traversal / 拡張子 allowlist を検証してから実行する。
 */
export interface ScriptEntry {
	path: string;
	name: string;
	/** 拡張子 (小文字、ドットなし)。 */
	ext: string;
	mtimeMs: number;
}

export async function scanScriptFolder(root: string, depth: number): Promise<ScriptEntry[]> {
	return invoke<ScriptEntry[]>('cmd_scan_script_folder', { root, depth });
}

/** スクリプトを実行確認済みとして記録する (audit F15)。 */
export async function confirmScript(folder: string, scriptPath: string): Promise<void> {
	return invoke<void>('cmd_confirm_script', { folder, scriptPath });
}

/**
 * 監視フォルダ配下のスクリプトを実行する。
 *
 * audit F15 (2026-05-18): 初回実行時、backend は `launch.confirmation_required` を返す。
 * ここで確認ダイアログ (Command / Script アイテムと共通の scriptConfirm store) を表示し、
 * ユーザーが承認したら confirm を記録して再実行する。cancel 時は no-op。
 */
export async function runScript(folder: string, scriptPath: string): Promise<void> {
	try {
		await invoke<void>('cmd_run_script', { folder, scriptPath });
	} catch (e) {
		if (!isConfirmationRequired(e)) throw e;
		const confirmed = await scriptConfirm.request(e.message ?? scriptPath);
		if (!confirmed) return;
		await confirmScript(folder, scriptPath);
		await invoke<void>('cmd_run_script', { folder, scriptPath });
	}
}
