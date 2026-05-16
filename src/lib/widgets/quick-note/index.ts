import { NotebookPen } from '@lucide/svelte';
import { widgetLabel } from '$lib/types/workspace';
import type { WidgetMeta } from '../_shared/types';
import QuickNoteSettings from './QuickNoteSettings.svelte';
import Component from './QuickNoteWidget.svelte';

export const widgetType = 'quick_note' as const;

export const meta: WidgetMeta = {
	Component,
	icon: NotebookPen,
	get label() {
		return widgetLabel('quick_note');
	},
	defaultConfig: { font_size: 'md' },
	// J-2 (2026-05-12): textarea は記述スペースを取りたい、4:5 で書きやすい広さ。
	defaultSize: { w: 2, h: 2 },
	minViableSize: { w: 2, h: 2 },
	addable: true,
	category: 'memo',
	categoryOrder: 1,
	SettingsContent: QuickNoteSettings,
};
