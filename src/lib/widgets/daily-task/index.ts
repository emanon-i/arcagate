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
	// E-9 (2026-05-08 user 検収): 2x3 → 2x2 縮小。
	defaultSize: { w: 2, h: 2 },
	addable: true,
	category: 'memo',
	categoryOrder: 2,
	// PH-issue-027: 旧 CommonMaxItemsSettings は config schema 不一致 (max_items 無し) のため
	// 専用 DailyTaskSettings (title + hideCompleted) に置換。
	SettingsContent: DailyTaskSettings,
};
