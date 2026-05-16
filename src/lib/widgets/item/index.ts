import { Package } from '@lucide/svelte';
import { widgetLabel } from '$lib/types/workspace';
import type { WidgetMeta } from '../_shared/types';
import ItemSettings from './ItemSettings.svelte';
import Component from './ItemWidget.svelte';

export const widgetType = 'item' as const;

export const meta: WidgetMeta = {
	Component,
	icon: Package,
	get label() {
		return widgetLabel('item');
	},
	// J-2 (2026-05-12): ItemWidget は単一 item 表示 (list 不要)、tile 形状で 2:3 縦長。
	defaultSize: { w: 4, h: 4 },
	minViableSize: { w: 2, h: 2 },
	addable: true,
	category: 'library',
	categoryOrder: 3,
	// PH-issue-027: 旧 CommonMaxItemsSettings は ItemWidget の config schema (item_id のみ) と
	// 一致しない壊れた状態だったため、専用 ItemSettings に置換。
	SettingsContent: ItemSettings,
};
