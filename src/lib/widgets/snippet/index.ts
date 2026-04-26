import { Clipboard } from '@lucide/svelte';
import CommonMaxItemsSettings from '../_shared/CommonMaxItemsSettings.svelte';
import type { WidgetMeta } from '../_shared/types';
import Component from './SnippetWidget.svelte';

export const widgetType = 'snippet' as const;

export const meta: WidgetMeta = {
	Component,
	icon: Clipboard,
	label: 'スニペット',
	defaultConfig: {},
	addable: true,
	SettingsContent: CommonMaxItemsSettings,
};
