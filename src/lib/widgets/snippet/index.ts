import { Clipboard } from '@lucide/svelte';
import { widgetLabel } from '$lib/types/workspace';
import type { WidgetMeta } from '../_shared/types';
import SnippetSettings from './SnippetSettings.svelte';
import Component from './SnippetWidget.svelte';

export const widgetType = 'snippet' as const;

export const meta: WidgetMeta = {
	Component,
	icon: Clipboard,
	get label() {
		return widgetLabel('snippet');
	},
	defaultConfig: {},
	// J-2 (2026-05-12): snippet list 縦長で 10 件視認。
	defaultSize: { w: 4, h: 4 },
	minViableSize: { w: 2, h: 2 },
	addable: true,
	category: 'memo',
	categoryOrder: 3,
	// PH-issue-027: 旧 CommonMaxItemsSettings は config schema 不一致 (max_items 無し) のため
	// 専用 SnippetSettings (title のみ) に置換。
	SettingsContent: SnippetSettings,
};
