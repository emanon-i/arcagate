import { FileSearch } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import FileSearchSettings from './FileSearchSettings.svelte';
import Component from './FileSearchWidget.svelte';

export const widgetType = 'file_search' as const;

export const meta: WidgetMeta = {
	Component,
	icon: FileSearch,
	label: 'ファイル検索',
	defaultConfig: { depth: 2, limit: 200 },
	// E-9 (2026-05-08 user 検収): 2x4 → 2x3 縮小 (検索結果リスト表示分は高さ確保)。
	defaultSize: { w: 2, h: 3 },
	addable: true,
	category: 'tool',
	categoryOrder: 2,
	SettingsContent: FileSearchSettings,
};
