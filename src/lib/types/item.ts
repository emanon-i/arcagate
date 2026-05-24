export type ItemType = 'exe' | 'url' | 'folder' | 'script' | 'command';
export type DefaultApp = 'vscode' | 'terminal' | (string & {});

export interface Item {
	id: string;
	item_type: ItemType;
	label: string;
	target: string;
	args: string | null;
	working_dir: string | null;
	icon_path: string | null;
	icon_type: string | null;
	aliases: string[];
	sort_order: number;
	is_enabled: boolean;
	is_tracked: boolean;
	default_app: DefaultApp | null;
	/** PH-290: per-card 背景・文字 override（JSON 文字列、null = global default） */
	card_override_json: string | null;
	/** アイテムライフサイクル契約 (PH-CF-100): 監視ウィジェット由来 item の back-link。
	 *  null = 手動 item / 監視非由来。 source_entry_key と 2 列セット (片肺禁止)。 */
	source_widget_id: string | null;
	/** アイテムライフサイクル契約: scan reconcile の entry id (正規化済 絶対パス)。 */
	source_entry_key: string | null;
	created_at: string;
	updated_at: string;
}

export interface CreateItemInput {
	item_type: ItemType;
	label: string;
	target: string;
	args: string | null;
	working_dir: string | null;
	icon_path: string | null;
	aliases: string[];
	tag_ids: string[];
	is_tracked: boolean;
	/** アイテムライフサイクル契約 U-6: Undo / JSON import の back-link 完全復元用。
	 *  指定された source_widget_id が backend に存在しない場合は NULL にフォールバック。 */
	source_widget_id?: string | null;
	/** source_entry_key も同時指定 (片肺禁止)。 */
	source_entry_key?: string | null;
}

export interface LibraryStats {
	total_items: number;
	total_tags: number;
	recent_launch_count: number;
}

export interface ItemStats {
	item_id: string;
	launch_count: number;
	last_launched_at: string | null;
}

export interface UpdateItemInput {
	label?: string;
	target?: string;
	args?: string | null;
	working_dir?: string | null;
	icon_path?: string | null;
	aliases?: string[];
	is_enabled?: boolean;
	is_tracked?: boolean;
	default_app?: DefaultApp | null;
	tag_ids?: string[];
	/** PH-290: card_override_json: null で明示的に解除、undefined で変更なし */
	card_override_json?: string | null;
}
