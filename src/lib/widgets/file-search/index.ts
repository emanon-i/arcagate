import { FileSearch } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import Component from './FileSearchWidget.svelte';

export const widgetType = 'file_search' as const;

export const meta: WidgetMeta = {
	Component,
	icon: FileSearch,
	label: 'ファイル検索',
	defaultConfig: { depth: 2, limit: 200 },
	addable: true,
};
