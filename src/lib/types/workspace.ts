// WidgetType は src-tauri の Rust enum から ts-rs で自動生成（batch-79 PH-352）
import type { WidgetType } from '$lib/bindings/WidgetType';

export type { WidgetType };

// WIDGET_LABELS は batch-79 で widget-registry に統合予定（後方互換のため当面残す）
// Library 側「お気に入り」と統一 (PH-416 H4 一貫性)
export const WIDGET_LABELS: Record<WidgetType, string> = {
	favorites: 'お気に入り',
	recent: '最近起動',
	projects: 'プロジェクト',
	item: 'アイテム',
	clock: '時計',
	stats: 'よく使うもの',
	quick_note: 'メモ',
	exe_folder: 'Exe フォルダ監視',
	daily_task: 'デイリータスク',
	snippet: 'スニペット',
	clipboard_history: 'クリップボード履歴',
	file_search: 'ファイル検索',
	system_monitor: 'システムモニタ',
};

export interface Workspace {
	id: string;
	name: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

export interface WorkspaceWidget {
	id: string;
	workspace_id: string;
	widget_type: WidgetType;
	position_x: number;
	position_y: number;
	width: number;
	height: number;
	config: string | null;
	created_at: string;
	updated_at: string;
}
