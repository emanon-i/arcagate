import { Clock3 } from '@lucide/svelte';
import CommonMaxItemsSettings from '../_shared/CommonMaxItemsSettings.svelte';
import type { WidgetMeta } from '../_shared/types';
import Component from './RecentLaunchesWidget.svelte';

export const widgetType = 'recent' as const;

export const meta: WidgetMeta = {
	Component,
	icon: Clock3,
	label: '最近起動',
	defaultConfig: { max_items: 10 },
	defaultSize: { w: 2, h: 3 },
	addable: true,
	SettingsContent: CommonMaxItemsSettings,
};
