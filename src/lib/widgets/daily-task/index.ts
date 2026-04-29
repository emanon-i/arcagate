import { CheckSquare } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import DailyTaskSettings from './DailyTaskSettings.svelte';
import Component from './DailyTaskWidget.svelte';

export const widgetType = 'daily_task' as const;

export const meta: WidgetMeta = {
	Component,
	icon: CheckSquare,
	label: 'デイリータスク',
	defaultConfig: {},
	addable: true,
	// PH-issue-027: 旧 CommonMaxItemsSettings は config schema 不一致 (max_items 無し) のため
	// 専用 DailyTaskSettings (title + hideCompleted) に置換。
	SettingsContent: DailyTaskSettings,
};
