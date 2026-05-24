import { FolderOpen } from '@lucide/svelte';
import { widgetLabel } from '$lib/types/workspace';
import type { WidgetMeta } from '../_shared/types';
import ExeFolderSettings from './ExeFolderSettings.svelte';
import Component from './ExeFolderWatchWidget.svelte';

export const widgetType = 'exe_folder' as const;

/// PH-CF-400: 監視拡張子の default。 backend にハードコードせず frontend 設定起点で
/// 配布する。 default は user 検収 U-4 (2026-05-12) の互換維持 set。 user が config の
/// extensions UI で .blend / .clip 等を追加できる。
export const DEFAULT_EXE_FOLDER_EXTENSIONS = ['exe', 'bat', 'cmd', 'ps1', 'sh'] as const;

/// PH-CF-400: scan_depth の上限。 backend の MAX_SCAN_DEPTH と一致させる
/// (input UI 側の clamp 値、 真の判定は backend 側で再 clamp される)。
export const MAX_EXE_FOLDER_SCAN_DEPTH = 10;

export const meta: WidgetMeta = {
	Component,
	icon: FolderOpen,
	get label() {
		return widgetLabel('exe_folder');
	},
	defaultConfig: {
		scan_depth: 2,
		extensions: [...DEFAULT_EXE_FOLDER_EXTENSIONS],
	},
	// J-2 (2026-05-12): folder list 多数を縦に流すため W:H=3:6 で高さ重視。
	defaultSize: { w: 3, h: 3 },
	minViableSize: { w: 2, h: 2 },
	addable: true,
	category: 'watch',
	categoryOrder: 2,
	SettingsContent: ExeFolderSettings,
};
