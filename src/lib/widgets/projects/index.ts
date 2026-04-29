import { FolderKanban } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import ProjectsSettings from './ProjectsSettings.svelte';
import Component from './ProjectsWidget.svelte';

export const widgetType = 'projects' as const;

export const meta: WidgetMeta = {
	Component,
	// PH-issue-039 / 検収項目 #12: icon を GitBranch → FolderKanban (フォルダ監視の意味と一致)。
	icon: FolderKanban,
	// PH-issue-039 / 検収項目 #12: label を 'プロジェクト' → 'フォルダ監視' (WIDGET_LABELS と統一)。
	label: 'フォルダ監視',
	defaultConfig: {
		max_items: 10,
		git_poll_interval_sec: 60,
		// PH-issue-039 / 検収項目 #12: 旧 'ウォッチフォルダー' → 空文字 (WIDGET_LABELS から fallback)。
		title: '',
		description: '',
		watched_folder: '',
		auto_add: false,
	},
	addable: true,
	defaultSize: { w: 2, h: 3 },
	SettingsContent: ProjectsSettings,
};
