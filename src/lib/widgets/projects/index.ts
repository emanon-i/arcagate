import { GitBranch } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import Component from './ProjectsWidget.svelte';

export const widgetType = 'projects' as const;

export const meta: WidgetMeta = {
	Component,
	icon: GitBranch,
	label: 'プロジェクト',
	defaultConfig: {
		max_items: 10,
		git_poll_interval_sec: 60,
		title: 'ウォッチフォルダー',
		description: '',
		watched_folder: '',
		auto_add: false,
	},
	addable: true,
};
