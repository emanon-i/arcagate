import { FileSearch } from '@lucide/svelte';
import { widgetLabel } from '$lib/types/workspace';
import type { WidgetMeta } from '../_shared/types';
import FileSearchSettings from './FileSearchSettings.svelte';
import Component from './FileSearchWidget.svelte';

export const widgetType = 'file_search' as const;

export const meta: WidgetMeta = {
	Component,
	icon: FileSearch,
	get label() {
		return widgetLabel('file_search');
	},
	defaultConfig: { depth: 2, limit: 200 },
	// J-2 (2026-05-12): 検索結果 list を多めに表示できる縦長サイズ。
	defaultSize: { w: 2, h: 2 },
	minViableSize: { w: 2, h: 2 },
	addable: true,
	category: 'tool',
	categoryOrder: 2,
	SettingsContent: FileSearchSettings,
};
