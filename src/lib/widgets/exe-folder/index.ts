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
	// E-9 (2026-05-08 user 検収): 3x3 → 3x2 縮小 (横幅は folder list 表示維持、高さのみ -1)。
	defaultSize: { w: 3, h: 2 },
	addable: true,
	category: 'watch',
	categoryOrder: 2,
	SettingsContent: ExeFolderSettings,
};
