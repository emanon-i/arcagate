import { AppWindow } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import ExeFolderSettings from './ExeFolderSettings.svelte';
import Component from './ExeFolderWatchWidget.svelte';

export const widgetType = 'exe_folder' as const;

export const meta: WidgetMeta = {
	Component,
	icon: AppWindow,
	label: 'Exe フォルダ監視',
	defaultConfig: { scan_depth: 2 },
	addable: true,
	SettingsContent: ExeFolderSettings,
};
