import { ClipboardList } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import ClipboardHistorySettings from './ClipboardHistorySettings.svelte';
import Component from './ClipboardHistoryWidget.svelte';

export const widgetType = 'clipboard_history' as const;

export const meta: WidgetMeta = {
	Component,
	icon: ClipboardList,
	label: 'クリップボード履歴',
	defaultConfig: { max_items: 20, poll_interval_ms: 1500 },
	addable: true,
	defaultSize: { w: 2, h: 3 },
	SettingsContent: ClipboardHistorySettings,
};
