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
	// J-2 (2026-05-12): item list 縦長で max_items=10 視認。
	defaultSize: { w: 3, h: 5 },
	minViableSize: { w: 2, h: 3 },
	addable: true,
	category: 'library',
	categoryOrder: 2,
	SettingsContent: CommonMaxItemsSettings,
};
