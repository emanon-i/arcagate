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
	// J-2 (2026-05-12): item list 縦長で max_items=10 を視認できる高さ。
	defaultSize: { w: 3, h: 5 },
	addable: true,
	category: 'library',
	categoryOrder: 1,
	SettingsContent: CommonMaxItemsSettings,
};
