import type { Page } from '@playwright/test';

export interface Item {
	id: string;
	item_type: string;
	label: string;
	target: string;
	created_at: string;
	updated_at: string;
}

export interface Workspace {
	id: string;
	name: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

export interface Widget {
	id: string;
	workspace_id: string;
	widget_type: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

// Rust の CreateItemInput に合わせた型定義
// aliases / category_ids / tag_ids は Vec<String> のため必須（空配列でも可）
export interface CreateItemInput {
	item_type: string;
	label: string;
	target: string;
	args?: string;
	working_dir?: string;
	icon_path?: string;
	aliases: string[];
	category_ids: string[];
	tag_ids: string[];
}

export async function invoke<T>(
	page: Page,
	cmd: string,
	args?: Record<string, unknown>,
): Promise<T> {
	return page.evaluate(
		([command, arguments_]) =>
			(
				window as unknown as {
					__TAURI_INTERNALS__: { invoke: (cmd: string, args?: unknown) => Promise<unknown> };
				}
			).__TAURI_INTERNALS__.invoke(command, arguments_),
		[cmd, args ?? {}] as [string, Record<string, unknown>],
	) as unknown as T;
}

export async function createItem(
	page: Page,
	input: Pick<CreateItemInput, 'item_type' | 'label' | 'target'> & Partial<CreateItemInput>,
): Promise<Item> {
	const fullInput: CreateItemInput = {
		aliases: [],
		category_ids: [],
		tag_ids: [],
		...input,
	};
	return invoke<Item>(page, 'cmd_create_item', { input: fullInput });
}

export async function listItems(page: Page): Promise<Item[]> {
	return invoke<Item[]>(page, 'cmd_list_items');
}

export async function deleteItem(page: Page, id: string): Promise<void> {
	return invoke<void>(page, 'cmd_delete_item', { id });
}

export async function markSetupComplete(page: Page): Promise<void> {
	return invoke<void>(page, 'cmd_mark_setup_complete');
}

export async function listWorkspaces(page: Page): Promise<Workspace[]> {
	return invoke<Workspace[]>(page, 'cmd_list_workspaces');
}

// cmd_create_workspace は name: String を直接受け取る（input ラッパー不要）
export async function createWorkspace(page: Page, name: string): Promise<Workspace> {
	return invoke<Workspace>(page, 'cmd_create_workspace', { name });
}

export async function deleteWorkspace(page: Page, id: string): Promise<void> {
	return invoke<void>(page, 'cmd_delete_workspace', { id });
}

export async function updateItem(
	page: Page,
	id: string,
	input: { is_enabled?: boolean; label?: string; target?: string },
): Promise<Item> {
	return invoke<Item>(page, 'cmd_update_item', { id, input });
}

export async function isSetupComplete(page: Page): Promise<boolean> {
	return invoke<boolean>(page, 'cmd_is_setup_complete');
}
