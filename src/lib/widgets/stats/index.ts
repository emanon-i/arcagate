import { TrendingUp } from '@lucide/svelte';
import CommonMaxItemsSettings from '../_shared/CommonMaxItemsSettings.svelte';
import type { WidgetMeta } from '../_shared/types';
import Component from './StatsWidget.svelte';

export const widgetType = 'stats' as const;

export const meta: WidgetMeta = {
	Component,
	icon: TrendingUp,
	label: 'よく使うもの',
	defaultConfig: { max_items: 10 },
	// J-2 (2026-05-12): top-items list 縦長で max_items=10 視認。
	defaultSize: { w: 3, h: 5 },
	addable: true,
	category: 'library',
	categoryOrder: 4,
	SettingsContent: CommonMaxItemsSettings,
};
