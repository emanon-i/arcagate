import { NotebookPen } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import QuickNoteSettings from './QuickNoteSettings.svelte';
import Component from './QuickNoteWidget.svelte';

export const widgetType = 'quick_note' as const;

export const meta: WidgetMeta = {
	Component,
	icon: NotebookPen,
	label: 'メモ',
	defaultConfig: { font_size: 'md' },
	// E-9 (2026-05-08 user 検収): 3x2 → 2x2 縮小 (textarea は flex で adjust)。
	defaultSize: { w: 2, h: 2 },
	addable: true,
	category: 'memo',
	categoryOrder: 1,
	SettingsContent: QuickNoteSettings,
};
