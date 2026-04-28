/**
 * PH-issue-024: Opener registry IPC client.
 *
 * builtin (compiled-in) と user-defined (DB) を統一して扱う。
 * `id` の prefix で区別: "builtin:*" / "user:*"
 */
import { invoke } from '@tauri-apps/api/core';

export interface Opener {
	id: string;
	name: string;
	command_template: string;
	icon_path: string | null;
	sort_order: number;
	is_builtin: boolean;
}

export interface SaveOpenerInput {
	id: string | null;
	name: string;
	command_template: string;
	icon_path: string | null;
	sort_order: number | null;
}

export async function listOpeners(): Promise<Opener[]> {
	return invoke<Opener[]>('cmd_list_openers');
}

export async function saveOpener(input: SaveOpenerInput): Promise<Opener> {
	return invoke<Opener>('cmd_save_opener', { input });
}

export async function deleteOpener(id: string): Promise<void> {
	return invoke<void>('cmd_delete_opener', { id });
}

export async function launchWithOpener(openerId: string, target: string): Promise<void> {
	return invoke<void>('cmd_launch_with_opener', { openerId, target });
}
