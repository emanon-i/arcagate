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
	// E-9 (2026-05-08 user 検収): 初期サイズを 2x2 に縮小 (旧 2x3、UI 崩れない最小)。
	defaultSize: { w: 2, h: 2 },
	addable: true,
	category: 'tool',
	categoryOrder: 1,
	SettingsContent: ClipboardHistorySettings,
};
