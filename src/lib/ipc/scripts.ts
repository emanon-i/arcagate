import { invoke } from '@tauri-apps/api/core';

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

export async function runScript(folder: string, scriptPath: string): Promise<void> {
	return invoke<void>('cmd_run_script', { folder, scriptPath });
}
