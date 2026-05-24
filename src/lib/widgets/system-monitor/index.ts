import { Activity } from '@lucide/svelte';
import { widgetLabel } from '$lib/types/workspace';
import type { WidgetMeta } from '../_shared/types';
import SystemMonitorSettings from './SystemMonitorSettings.svelte';
import Component from './SystemMonitorWidget.svelte';

export const widgetType = 'system_monitor' as const;

/**
 * PH-CF-500 D7: widget の config default は ここで一括定義する単一情報源 (single source of truth)。
 * widget 本体 / settings dialog の双方が SYSTEM_MONITOR_DEFAULTS を import し、
 * `?? <literal>` のフォールバックを各所に書かない (defaultConfig 一本契約)。
 *
 * 旧実装は widget 本体 (`cpu_chart_type ?? 'bar'`) と settings (`?? 'sparkline'`) で
 * literal が食い違い、 クリーン config (キー未設定) だと「widget は bar 表示」 / 「設定を
 * 開くと sparkline と表示」 のズレが起きていた (= D7 真因)。
 *
 * `as const` で literal 型推論を保ち、 型安全に default を share する。
 */
export const SYSTEM_MONITOR_DEFAULTS = {
	refresh_interval_ms: 2000,
	show_cpu: true,
	show_memory: true,
	show_disk: false,
	show_network: false,
	cpu_chart_type: 'bar',
	memory_chart_type: 'bar',
	disk_chart_type: 'gauge',
	network_chart_type: 'sparkline',
} as const;

export const meta: WidgetMeta = {
	Component,
	icon: Activity,
	get label() {
		return widgetLabel('system_monitor');
	},
	defaultConfig: SYSTEM_MONITOR_DEFAULTS,
	// J-2 (2026-05-12): chart 系で横幅広め (W:H=4:3)、CPU/RAM/Disk 3 metric 横並び。
	defaultSize: { w: 3, h: 3 },
	minViableSize: { w: 2, h: 2 },
	addable: true,
	category: 'info',
	categoryOrder: 2,
	SettingsContent: SystemMonitorSettings,
};
