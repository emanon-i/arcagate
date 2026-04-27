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
	/** 単一アイテムモード (PH-003-J 旧仕様、後方互換) */
	item_id: string | null;
	/** PH-474: 複数アイテムモード (新仕様、 picker で複数選択) */
	item_ids?: string[];
}

export const ITEM_WIDGET_DEFAULTS: ItemWidgetConfig = {
	item_id: null,
	item_ids: [],
};

export interface ClockWidgetConfig {
	show_seconds: boolean;
	show_date: boolean;
	show_weekday: boolean;
	use_24h: boolean;
}

export const CLOCK_WIDGET_DEFAULTS: ClockWidgetConfig = {
	show_seconds: true,
	show_date: true,
	show_weekday: true,
	use_24h: true,
};

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
