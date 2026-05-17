import { Terminal } from '@lucide/svelte';
import { widgetLabel } from '$lib/types/workspace';
import type { WidgetMeta } from '../_shared/types';
import ScriptFolderSettings from './ScriptFolderSettings.svelte';
import Component from './ScriptFolderWatchWidget.svelte';

export const widgetType = 'script_folder' as const;

export const meta: WidgetMeta = {
	Component,
	icon: Terminal,
	get label() {
		return widgetLabel('script_folder');
	},
	defaultConfig: { scan_depth: 2 },
	defaultSize: { w: 4, h: 4 },
	minViableSize: { w: 2, h: 2 },
	addable: true,
	category: 'watch',
	categoryOrder: 3,
	SettingsContent: ScriptFolderSettings,
};
