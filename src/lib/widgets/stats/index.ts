import { TrendingUp } from '@lucide/svelte';
import { widgetLabel } from '$lib/types/workspace';
import CommonMaxItemsSettings from '../_shared/CommonMaxItemsSettings.svelte';
import type { WidgetMeta } from '../_shared/types';
import Component from './StatsWidget.svelte';

export const widgetType = 'stats' as const;

export const meta: WidgetMeta = {
	Component,
	icon: TrendingUp,
	get label() {
		return widgetLabel('stats');
	},
	defaultConfig: { max_items: 10 },
	// J-2 (2026-05-12): top-items list 縦長で max_items=10 視認。
	defaultSize: { w: 2, h: 2 },
	minViableSize: { w: 2, h: 2 },
	addable: true,
	category: 'library',
	categoryOrder: 4,
	SettingsContent: CommonMaxItemsSettings,
};
