import { FolderOpen } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import Component from './ExeFolderWatchWidget.svelte';

export const widgetType = 'exe_folder' as const;

export const meta: WidgetMeta = {
	Component,
	icon: FolderOpen,
	label: 'Exe フォルダ監視',
	defaultConfig: { scan_depth: 2 },
	addable: true,
};
