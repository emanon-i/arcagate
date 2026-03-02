import { invoke } from '@tauri-apps/api/core';
import type { WatchedPath } from '$lib/types/watched_path';

export async function addWatchedPath(path: string, label: string | null): Promise<WatchedPath> {
	return invoke<WatchedPath>('cmd_add_watched_path', { path, label });
}

export async function getWatchedPaths(): Promise<WatchedPath[]> {
	return invoke<WatchedPath[]>('cmd_get_watched_paths');
}

export async function removeWatchedPath(id: string): Promise<void> {
	return invoke<void>('cmd_remove_watched_path', { id });
}
