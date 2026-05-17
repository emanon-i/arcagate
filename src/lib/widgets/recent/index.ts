import { Clock3 } from '@lucide/svelte';
import { widgetLabel } from '$lib/types/workspace';
import CommonMaxItemsSettings from '../_shared/CommonMaxItemsSettings.svelte';
import type { WidgetMeta } from '../_shared/types';
import Component from './RecentLaunchesWidget.svelte';

export const widgetType = 'recent' as const;

export const meta: WidgetMeta = {
	Component,
	icon: Clock3,
	get label() {
		return widgetLabel('recent');
	},
	defaultConfig: { max_items: 10 },
	// J-2 (2026-05-12): item list 縦長で max_items=10 視認。
	defaultSize: { w: 4, h: 4 },
	minViableSize: { w: 2, h: 2 },
	addable: true,
	category: 'library',
	categoryOrder: 2,
	SettingsContent: CommonMaxItemsSettings,
};
