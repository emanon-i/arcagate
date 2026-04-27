// PH-504: Per-item settings persistence types
export interface WidgetItemSettings {
	widget_id: string;
	item_key: string;
	opener: string | null;
	custom_label: string | null;
	custom_icon: string | null;
	favorite: boolean;
	last_seen_at: number | null;
	created_at: number;
	updated_at: number;
}

export interface UpsertWidgetItemSettingsInput {
	widget_id: string;
	item_key: string;
	opener?: string | null;
	custom_label?: string | null;
	custom_icon?: string | null;
	favorite?: boolean;
	last_seen_at?: number | null;
}
