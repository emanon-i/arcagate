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
	// E-9 (2026-05-08 user 検収): 2x3 → 2x2 縮小。
	defaultSize: { w: 2, h: 2 },
	addable: true,
	category: 'library',
	categoryOrder: 4,
	SettingsContent: CommonMaxItemsSettings,
};
