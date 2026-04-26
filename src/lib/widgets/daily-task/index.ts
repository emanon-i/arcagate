import { CheckSquare } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import Component from './DailyTaskWidget.svelte';

export const widgetType = 'daily_task' as const;

export const meta: WidgetMeta = {
	Component,
	icon: CheckSquare,
	label: 'デイリータスク',
	defaultConfig: {},
	addable: true,
};
