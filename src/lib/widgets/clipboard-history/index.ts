import { ClipboardList } from '@lucide/svelte';
import { widgetLabel } from '$lib/types/workspace';
import type { WidgetMeta } from '../_shared/types';
import ClipboardHistorySettings from './ClipboardHistorySettings.svelte';
import Component from './ClipboardHistoryWidget.svelte';

export const widgetType = 'clipboard_history' as const;

export const meta: WidgetMeta = {
	Component,
	icon: ClipboardList,
	get label() {
		return widgetLabel('clipboard_history');
	},
	defaultConfig: { max_items: 20, poll_interval_ms: 1500 },
	// J-2 (2026-05-12 user 検収): defaultSize を縦長 (W:H=3:5) に再設計。
	// 履歴 list の縦スクロールが基本動作、高さ確保で 8-10 件視認できる目安。
	defaultSize: { w: 3, h: 3 },
	minViableSize: { w: 2, h: 2 },
	addable: true,
	category: 'tool',
	categoryOrder: 1,
	SettingsContent: ClipboardHistorySettings,
};
