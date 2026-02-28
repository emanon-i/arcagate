import { invoke } from '@tauri-apps/api/core';

export async function exportJson(outputPath: string): Promise<void> {
	return invoke('cmd_export_json', { outputPath });
}

export async function importJson(inputPath: string): Promise<void> {
	return invoke('cmd_import_json', { inputPath });
}
