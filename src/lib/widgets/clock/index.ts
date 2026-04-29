import { Clock } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import ClockSettings from './ClockSettings.svelte';
import Component from './ClockWidget.svelte';

export const widgetType = 'clock' as const;

export const meta: WidgetMeta = {
	Component,
	icon: Clock,
	label: '時計',
	defaultConfig: {
		show_seconds: true,
		show_date: true,
		show_weekday: true,
		use_24h: true,
	},
	defaultSize: { w: 2, h: 2 },
	addable: true,
	SettingsContent: ClockSettings,
};
