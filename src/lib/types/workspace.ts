export type WidgetType = 'favorites' | 'recent' | 'projects' | 'watched_folders';

export const WIDGET_LABELS: Record<WidgetType, string> = {
	favorites: 'よく使うもの',
	recent: '最近使ったもの',
	projects: 'プロジェクト',
	watched_folders: '監視フォルダ',
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
