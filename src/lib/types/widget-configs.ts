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
	/** 旧仕様: 単一 item id (legacy、後方互換のため残す)。新規は item_ids[] 経由で設定する。 */
	item_id?: string | null;
	/** 5/03 user 検収 (C): collection の item id 配列。空 = 未設定。 */
	item_ids?: string[];
	view_mode?: 'grid' | 'list';
	sort_field?: 'manual' | 'name';
}

export const ITEM_WIDGET_DEFAULTS: ItemWidgetConfig = {
	item_id: null,
	item_ids: [],
	view_mode: 'grid',
	sort_field: 'manual',
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
