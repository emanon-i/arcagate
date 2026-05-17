import { FolderKanban } from '@lucide/svelte';
import { widgetLabel } from '$lib/types/workspace';
import type { WidgetMeta } from '../_shared/types';
import ProjectsSettings from './ProjectsSettings.svelte';
import Component from './ProjectsWidget.svelte';

export const widgetType = 'projects' as const;

export const meta: WidgetMeta = {
	Component,
	// PH-issue-039 / 検収項目 #12: icon を GitBranch → FolderKanban (フォルダ監視の意味と一致)。
	icon: FolderKanban,
	// PH-issue-039 / 検収項目 #12: label を 'プロジェクト' → 'フォルダ監視' (WIDGET_LABELS と統一)。
	get label() {
		return widgetLabel('projects');
	},
	defaultConfig: {
		max_items: 10,
		git_poll_interval_sec: 60,
		// PH-issue-039 / 検収項目 #12: 旧 'ウォッチフォルダー' → 空文字 (WIDGET_LABELS から fallback)。
		title: '',
		description: '',
		watched_folder: '',
		auto_add: false,
	},
	// J-2 (2026-05-12): folder card grid (container query で 1-3 列)、4:5 で複数列表示できる横幅 + 高さ。
	defaultSize: { w: 4, h: 4 },
	minViableSize: { w: 2, h: 2 },
	addable: true,
	category: 'watch',
	categoryOrder: 1,
	SettingsContent: ProjectsSettings,
};
