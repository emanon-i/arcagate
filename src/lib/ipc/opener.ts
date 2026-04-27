// PH-505 batch-109: Opener registry IPC layer

import { invoke } from '@tauri-apps/api/core';
import type { CreateOpenerInput, Opener, UpdateOpenerInput } from '$lib/types/opener';

export async function listOpeners(): Promise<Opener[]> {
	return invoke<Opener[]>('cmd_list_openers');
}

export async function getOpener(id: string): Promise<Opener | null> {
	return invoke<Opener | null>('cmd_get_opener', { id });
}

export async function createOpener(input: CreateOpenerInput): Promise<Opener> {
	return invoke<Opener>('cmd_create_opener', { input });
}

export async function updateOpener(id: string, input: UpdateOpenerInput): Promise<Opener> {
	return invoke<Opener>('cmd_update_opener', { id, input });
}

export async function deleteOpener(id: string): Promise<void> {
	return invoke<void>('cmd_delete_opener', { id });
}

export async function launchWithOpener(openerId: string, path: string): Promise<void> {
	return invoke<void>('cmd_launch_with_opener', { openerId, path });
}
