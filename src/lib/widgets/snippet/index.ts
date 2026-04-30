import { Clipboard } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import SnippetSettings from './SnippetSettings.svelte';
import Component from './SnippetWidget.svelte';

export const widgetType = 'snippet' as const;

export const meta: WidgetMeta = {
	Component,
	icon: Clipboard,
	label: 'スニペット',
	defaultConfig: {},
	defaultSize: { w: 2, h: 2 },
	addable: true,
	category: 'memo',
	categoryOrder: 3,
	// PH-issue-027: 旧 CommonMaxItemsSettings は config schema 不一致 (max_items 無し) のため
	// 専用 SnippetSettings (title のみ) に置換。
	SettingsContent: SnippetSettings,
};
