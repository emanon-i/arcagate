import { Star } from '@lucide/svelte';
import CommonMaxItemsSettings from '../_shared/CommonMaxItemsSettings.svelte';
import type { WidgetMeta } from '../_shared/types';
import Component from './FavoritesWidget.svelte';

export const widgetType = 'favorites' as const;

export const meta: WidgetMeta = {
	Component,
	icon: Star,
	label: 'お気に入り',
	defaultConfig: { max_items: 10 },
	// E-9 (2026-05-08 user 検収): 2x3 → 2x2 縮小。
	defaultSize: { w: 2, h: 2 },
	addable: true,
	category: 'library',
	categoryOrder: 1,
	SettingsContent: CommonMaxItemsSettings,
};
