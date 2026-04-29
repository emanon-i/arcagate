import { Package } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import ItemSettings from './ItemSettings.svelte';
import Component from './ItemWidget.svelte';

export const widgetType = 'item' as const;

export const meta: WidgetMeta = {
	Component,
	icon: Package,
	label: 'アイテム',
	defaultSize: { w: 2, h: 2 },
	addable: true,
	// PH-issue-027: 旧 CommonMaxItemsSettings は ItemWidget の config schema (item_id のみ) と
	// 一致しない壊れた状態だったため、専用 ItemSettings に置換。
	SettingsContent: ItemSettings,
};
