import { TrendingUp } from '@lucide/svelte';
import CommonMaxItemsSettings from '../_shared/CommonMaxItemsSettings.svelte';
import type { WidgetMeta } from '../_shared/types';
import Component from './StatsWidget.svelte';

export const widgetType = 'stats' as const;

export const meta: WidgetMeta = {
	Component,
	icon: TrendingUp,
	label: 'よく起動',
	defaultConfig: { max_items: 10 },
	addable: true,
	SettingsContent: CommonMaxItemsSettings,
};
