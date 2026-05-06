import type { Page } from '@playwright/test';

/**
 * minimal IPC helper for T1 smoke。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T1 phase、SetupWizard / Onboarding skip)
 *
 * 旧版 (PR-Z で削除済) の subset。markSetupComplete / markOnboardingComplete /
 * listWorkspaces のみ。T2 以降で必要時に追加 (createItem / deleteItem 等)。
 */

interface TauriWindow {
	__TAURI_INTERNALS__: {
		invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
	};
}

export async function invoke<T>(
	page: Page,
	cmd: string,
	args?: Record<string, unknown>,
): Promise<T> {
	return page.evaluate(
		([command, arguments_]) =>
			(window as unknown as TauriWindow).__TAURI_INTERNALS__.invoke(
				command as string,
				arguments_ as Record<string, unknown>,
			),
		[cmd, args ?? {}] as const,
	) as unknown as T;
}

export async function markSetupComplete(page: Page): Promise<void> {
	return invoke<void>(page, 'cmd_mark_setup_complete');
}

export async function markOnboardingComplete(page: Page): Promise<void> {
	return invoke<void>(page, 'cmd_mark_onboarding_complete');
}

export interface Workspace {
	id: string;
	name: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

export async function listWorkspaces(page: Page): Promise<Workspace[]> {
	return invoke<Workspace[]>(page, 'cmd_list_workspaces');
}

// T2-1 で追加した helper

export interface Item {
	id: string;
	item_type: string;
	label: string;
	target: string;
	created_at: string;
	updated_at: string;
}

export interface CreateItemInput {
	item_type: string;
	label: string;
	target: string;
	args?: string | null;
	working_dir?: string | null;
	icon_path?: string | null;
	is_tracked?: boolean;
	aliases: string[];
	tag_ids?: string[];
}

export async function createItem(page: Page, input: CreateItemInput): Promise<Item> {
	return invoke<Item>(page, 'cmd_create_item', { input });
}

export async function listItems(page: Page): Promise<Item[]> {
	return invoke<Item[]>(page, 'cmd_list_items');
}

export async function deleteItem(page: Page, id: string): Promise<void> {
	return invoke<void>(page, 'cmd_delete_item', { id });
}

export async function createWorkspace(page: Page, name: string): Promise<Workspace> {
	return invoke<Workspace>(page, 'cmd_create_workspace', { name });
}

export async function deleteWorkspace(page: Page, id: string): Promise<void> {
	return invoke<void>(page, 'cmd_delete_workspace', { id });
}

export interface Widget {
	id: string;
	workspace_id: string;
	widget_type: string;
}

export async function listWidgets(page: Page, workspaceId: string): Promise<Widget[]> {
	return invoke<Widget[]>(page, 'cmd_list_widgets', { workspaceId });
}

export async function launchItem(page: Page, itemId: string): Promise<void> {
	return invoke<void>(page, 'cmd_launch_item', { itemId });
}
