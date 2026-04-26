import { Package } from '@lucide/svelte';
import type { WidgetMeta } from '../_shared/types';
import Component from './ItemWidget.svelte';

export const widgetType = 'item' as const;

export const meta: WidgetMeta = {
	Component,
	icon: Package,
	label: 'アイテム',
	addable: true,
};
