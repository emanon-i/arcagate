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
	// J-2 (2026-05-12): folder list 多数を縦に流すため W:H=3:6 で高さ重視。
	defaultSize: { w: 2, h: 2 },
	minViableSize: { w: 2, h: 2 },
	addable: true,
	category: 'watch',
	categoryOrder: 2,
	SettingsContent: ExeFolderSettings,
};
