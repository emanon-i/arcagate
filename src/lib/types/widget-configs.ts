export type WidgetSortField = 'default' | 'name';

export interface ListWidgetConfig {
	max_items: number;
	sort_field: WidgetSortField;
}

export const LIST_WIDGET_DEFAULTS: ListWidgetConfig = {
	max_items: 10,
	sort_field: 'default',
};

export interface ItemWidgetConfig {
	item_id: string | null;
}

export const ITEM_WIDGET_DEFAULTS: ItemWidgetConfig = {
	item_id: null,
};

// 5/01 user 判断: ClockWidget 廃止のため ClockWidgetConfig / CLOCK_WIDGET_DEFAULTS を削除。
// 既存 widget instance は migration v021 で DB から除去される。

export interface StatsWidgetConfig {
	max_items: number;
}

export const STATS_WIDGET_DEFAULTS: StatsWidgetConfig = {
	max_items: 5,
};

export type QuickNoteFontSize = 'sm' | 'md' | 'lg';

export interface QuickNoteConfig {
	note: string;
	font_size: QuickNoteFontSize;
}

export const QUICK_NOTE_DEFAULTS: QuickNoteConfig = {
	note: '',
	font_size: 'md',
};
