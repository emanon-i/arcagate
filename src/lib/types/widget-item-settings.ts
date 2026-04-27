// PH-504 batch-109: Per-item settings persistence
// (widget_id, item_key) → opener / custom_label / custom_icon / favorite を永続。
// entries 自体は揮発、本テーブルは override settings のみ。

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

/**
 * Patch payload。各 field:
 * - undefined: 変更なし (既存値維持)
 * - null: クリア (例: opener を unset)
 * - 値あり: 更新
 */
export interface WidgetItemSettingsPatch {
	opener?: string | null;
	custom_label?: string | null;
	custom_icon?: string | null;
	favorite?: boolean;
}
