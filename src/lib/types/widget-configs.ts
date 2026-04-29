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

export interface ClockWidgetConfig {
	show_seconds: boolean;
	show_date: boolean;
	show_weekday: boolean;
	use_24h: boolean;
	/** PH-issue-035 / 検収項目 #26: タイムゾーン (IANA 表記、'Asia/Tokyo' = JST 既定)。 */
	timezone: string;
	/** PH-issue-035: タイムゾーン名を表示するか (大きい widget で表示)。 */
	show_timezone: boolean;
}

export const CLOCK_WIDGET_DEFAULTS: ClockWidgetConfig = {
	show_seconds: true,
	show_date: true,
	show_weekday: true,
	use_24h: true,
	timezone: 'Asia/Tokyo',
	show_timezone: true,
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
