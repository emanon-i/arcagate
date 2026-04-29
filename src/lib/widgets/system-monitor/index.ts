import { Activity } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import SystemMonitorSettings from './SystemMonitorSettings.svelte';
import Component from './SystemMonitorWidget.svelte';

export const widgetType = 'system_monitor' as const;

export const meta: WidgetMeta = {
	Component,
	icon: Activity,
	label: 'システムモニタ',
	defaultConfig: {
		refresh_interval_ms: 2000,
		show_cpu: true,
		show_memory: true,
		show_disk: false,
	},
	defaultSize: { w: 2, h: 3 },
	addable: true,
	SettingsContent: SystemMonitorSettings,
};
