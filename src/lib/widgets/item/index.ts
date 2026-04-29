import { Package } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import ItemSettings from './ItemSettings.svelte';
import Component from './ItemWidget.svelte';

export const widgetType = 'item' as const;

export const meta: WidgetMeta = {
	Component,
	icon: Package,
	label: 'アイテム',
	addable: true,
	// 4/30 user 検収 #7: ItemWidget は 1 つのアイテム専用なので 1×1 default。
	defaultSize: { w: 1, h: 1 },
	// PH-issue-027: 旧 CommonMaxItemsSettings は ItemWidget の config schema (item_id のみ) と
	// 一致しない壊れた状態だったため、専用 ItemSettings に置換。
	SettingsContent: ItemSettings,
};
