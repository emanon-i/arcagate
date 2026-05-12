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
	// J-2 (2026-05-12): chart 系で横幅広め (W:H=4:3)、CPU/RAM/Disk 3 metric 横並び。
	defaultSize: { w: 4, h: 3 },
	minViableSize: { w: 3, h: 3 },
	addable: true,
	category: 'info',
	categoryOrder: 2,
	SettingsContent: SystemMonitorSettings,
};
