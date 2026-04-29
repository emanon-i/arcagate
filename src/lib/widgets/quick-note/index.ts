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
	addable: true,
	defaultSize: { w: 2, h: 2 },
	SettingsContent: QuickNoteSettings,
};
