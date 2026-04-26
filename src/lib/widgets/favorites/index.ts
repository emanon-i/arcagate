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
	addable: true,
	SettingsContent: CommonMaxItemsSettings,
};
