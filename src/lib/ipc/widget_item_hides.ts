import { invoke } from '@tauri-apps/api/core';

/**
 * Phase 2 (2026-05-12): per-widget hide IPC bindings。
 *
 * widget_id × item_target で hide を記録、 widget render で filter する。
 * widget 削除で FK CASCADE で自動消去 (新 widget = fresh state)。
 */
export async function addWidgetItemHide(widgetId: string, itemTarget: string): Promise<void> {
	return invoke<void>('cmd_add_widget_item_hide', { widgetId, itemTarget });
}

export async function removeWidgetItemHide(widgetId: string, itemTarget: string): Promise<void> {
	return invoke<void>('cmd_remove_widget_item_hide', { widgetId, itemTarget });
}

export async function listWidgetItemHides(widgetId: string): Promise<string[]> {
	return invoke<string[]>('cmd_list_widget_item_hides', { widgetId });
}
