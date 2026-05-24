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
	// PH-CF-1100 ④ (2026-05-25 user 検収): 単一 item 表示のため最小 tile (2x2) で十分。
	// 旧 4x4 は配置時の占有面積が大きすぎ「全部でかすぎる」 (user 指摘)。 user resize で拡大は可能。
	defaultSize: { w: 2, h: 2 },
	minViableSize: { w: 2, h: 2 },
	addable: true,
	category: 'library',
	categoryOrder: 3,
	// PH-issue-027: 旧 CommonMaxItemsSettings は ItemWidget の config schema (item_id のみ) と
	// 一致しない壊れた状態だったため、専用 ItemSettings に置換。
	SettingsContent: ItemSettings,
};
