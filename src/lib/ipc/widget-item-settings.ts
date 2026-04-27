// PH-504 batch-109: Per-item settings IPC layer

import { invoke } from '@tauri-apps/api/core';
import type { WidgetItemSettings, WidgetItemSettingsPatch } from '$lib/types/widget-item-settings';

export async function getWidgetItemSettings(
	widgetId: string,
	itemKey: string,
): Promise<WidgetItemSettings | null> {
	return invoke<WidgetItemSettings | null>('cmd_get_widget_item_settings', {
		widgetId,
		itemKey,
	});
}

export async function listWidgetItemSettings(widgetId: string): Promise<WidgetItemSettings[]> {
	return invoke<WidgetItemSettings[]>('cmd_list_widget_item_settings', { widgetId });
}

export async function patchWidgetItemSettings(
	widgetId: string,
	itemKey: string,
	patch: WidgetItemSettingsPatch,
	lastSeenAt: number | null = null,
): Promise<WidgetItemSettings> {
	return invoke<WidgetItemSettings>('cmd_patch_widget_item_settings', {
		widgetId,
		itemKey,
		patch,
		lastSeenAt,
	});
}

export async function touchWidgetItemSettings(
	widgetId: string,
	itemKeys: string[],
	timestamp: number,
): Promise<number> {
	return invoke<number>('cmd_touch_widget_item_settings', {
		widgetId,
		itemKeys,
		timestamp,
	});
}

export async function deleteWidgetItemSettings(
	widgetId: string,
	itemKey: string,
): Promise<boolean> {
	return invoke<boolean>('cmd_delete_widget_item_settings', { widgetId, itemKey });
}

export async function deleteAllWidgetItemSettings(widgetId: string): Promise<number> {
	return invoke<number>('cmd_delete_all_widget_item_settings', { widgetId });
}

export async function pruneOrphanWidgetItemSettings(
	widgetId: string,
	cutoffUnix: number,
): Promise<number> {
	return invoke<number>('cmd_prune_orphan_widget_item_settings', { widgetId, cutoffUnix });
}
