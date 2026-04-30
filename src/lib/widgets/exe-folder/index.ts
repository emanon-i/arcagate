import { FolderOpen } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import ExeFolderSettings from './ExeFolderSettings.svelte';
import Component from './ExeFolderWatchWidget.svelte';

export const widgetType = 'exe_folder' as const;

export const meta: WidgetMeta = {
	Component,
	icon: FolderOpen,
	label: 'Exe フォルダ監視',
	defaultConfig: { scan_depth: 2 },
	defaultSize: { w: 3, h: 3 },
	addable: true,
	category: 'watch',
	categoryOrder: 2,
	SettingsContent: ExeFolderSettings,
};
