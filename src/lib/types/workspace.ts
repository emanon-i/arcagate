export type WidgetType =
	| 'favorites'
	| 'recent'
	| 'projects'
	| 'watched_folders'
	| 'item'
	| 'clock'
	| 'stats'
	| 'quick_note'
	| 'exe_folder'
	| 'daily_task'
	| 'snippet'
	| 'clipboard_history'
	| 'file_search'
	| 'system_monitor';

export const WIDGET_LABELS: Partial<Record<WidgetType, string>> = {
	favorites: 'よく使うもの',
	recent: '最近使ったもの',
	projects: 'プロジェクト',
	exe_folder: 'Exe Folders',
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
