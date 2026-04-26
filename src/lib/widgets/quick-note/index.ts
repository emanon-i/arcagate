import { NotebookPen } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import Component from './QuickNoteWidget.svelte';

export const widgetType = 'quick_note' as const;

export const meta: WidgetMeta = {
	Component,
	icon: NotebookPen,
	label: 'クイックメモ',
	defaultConfig: { font_size: 'md' },
	addable: true,
};
