import { invoke } from '@tauri-apps/api/core';

export async function exportJson(outputPath: string): Promise<void> {
	return invoke<void>('cmd_export_json', { outputPath });
}

export async function importJson(inputPath: string): Promise<void> {
	return invoke<void>('cmd_import_json', { inputPath });
}
