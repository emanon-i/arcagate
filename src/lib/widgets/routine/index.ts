import { Rocket } from '@lucide/svelte';
import { widgetLabel } from '$lib/types/workspace';
import type { WidgetMeta } from '../_shared/types';
import RoutineSettings from './RoutineSettings.svelte';
import Component from './RoutineWidget.svelte';

export const widgetType = 'routine' as const;

export const meta: WidgetMeta = {
	Component,
	icon: Rocket,
	get label() {
		return widgetLabel('routine');
	},
	// config: { items: item_id[], label, launch_delay_ms? }。
	defaultConfig: { items: [], label: '' },
	// item list を縦に並べる + 起動 button、Item widget と同じ縦長サイズ。
	defaultSize: { w: 3, h: 3 },
	minViableSize: { w: 2, h: 2 },
	addable: true,
	category: 'library',
	categoryOrder: 5,
	SettingsContent: RoutineSettings,
};
