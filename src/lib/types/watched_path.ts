export interface WatchedPath {
	id: string;
	path: string;
	label: string | null;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface CreateWatchedPathInput {
	path: string;
	label: string | null;
}
