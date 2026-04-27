// PH-504: Per-item settings persistence — IPC wrappers
import { invoke } from '@tauri-apps/api/core';
import type {
	UpsertWidgetItemSettingsInput,
	WidgetItemSettings,
} from '$lib/types/widget-item-settings';

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

export async function upsertWidgetItemSettings(
	input: UpsertWidgetItemSettingsInput,
): Promise<WidgetItemSettings> {
	return invoke<WidgetItemSettings>('cmd_upsert_widget_item_settings', { input });
}

export async function deleteWidgetItemSettings(widgetId: string, itemKey: string): Promise<void> {
	return invoke<void>('cmd_delete_widget_item_settings', { widgetId, itemKey });
}

export async function clearWidgetItemSettings(widgetId: string): Promise<number> {
	return invoke<number>('cmd_clear_widget_item_settings', { widgetId });
}

export async function pruneWidgetItemSettings(
	widgetId: string,
	expiryDays: number,
): Promise<number> {
	return invoke<number>('cmd_prune_widget_item_settings', { widgetId, expiryDays });
}

export async function touchWidgetItemSettings(widgetId: string, itemKeys: string[]): Promise<void> {
	return invoke<void>('cmd_touch_widget_item_settings', { widgetId, itemKeys });
}
