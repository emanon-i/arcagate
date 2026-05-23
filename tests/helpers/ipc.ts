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

/**
 * PH-PQ-200: 初回体験 (SetupWizard + OnboardingTour) を未完了状態に戻す。
 * setup-wizard.spec が skip ではなく実 setup path を駆動するために使う。
 */
export async function resetFirstRun(page: Page): Promise<void> {
	return invoke<void>(page, 'cmd_reset_first_run');
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

/**
 * Home workspace の auto-create を待つ。
 *
 * workspace-config store の `loadWorkspaces()` は workspaces 0 件のとき非同期で
 * 'Home' を作る。spec 開始直後に `cmd_list_workspaces` を呼ぶとこの作成と race して
 * 空配列が返ることがあるため、非空になるまで polling する (first spec で顕在化)。
 */
export async function waitForHomeWorkspace(page: Page): Promise<Workspace> {
	for (let i = 0; i < 80; i++) {
		const list = await listWorkspaces(page);
		if (list.length > 0) return list[0];
		await page.waitForTimeout(250);
	}
	throw new Error('Home workspace did not auto-create within 20s');
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

// PH-CF-100: deleteItems は必須引数 (implicit default なし)。
export async function deleteWorkspace(page: Page, id: string, deleteItems: boolean): Promise<void> {
	return invoke<void>(page, 'cmd_delete_workspace', { id, deleteItems });
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

export async function addWidget(
	page: Page,
	workspaceId: string,
	widgetType: string,
): Promise<Widget> {
	return invoke<Widget>(page, 'cmd_add_widget', { workspaceId, widgetType });
}

export async function deleteWidget(page: Page, id: string): Promise<void> {
	return invoke<void>(page, 'cmd_remove_widget', { id });
}

export async function updateWidgetConfig(
	page: Page,
	id: string,
	config: string | null,
): Promise<Widget> {
	return invoke<Widget>(page, 'cmd_update_widget_config', { id, config });
}

// T2-2 で追加した helper

export interface UpdateItemInput {
	label?: string | null;
	target?: string | null;
	args?: string | null;
	working_dir?: string | null;
	icon_path?: string | null;
	is_tracked?: boolean | null;
	aliases?: string[] | null;
	tag_ids?: string[] | null;
}

export async function updateItem(page: Page, id: string, input: UpdateItemInput): Promise<Item> {
	return invoke<Item>(page, 'cmd_update_item', { id, input });
}

export interface LibraryStats {
	total_items: number;
	total_tags: number;
	recent_launch_count: number;
}

export async function getLibraryStats(page: Page): Promise<LibraryStats> {
	return invoke<LibraryStats>(page, 'cmd_get_library_stats');
}

export interface Tag {
	id: string;
	name: string;
	is_system: boolean;
}

export async function getTags(page: Page): Promise<Tag[]> {
	return invoke<Tag[]>(page, 'cmd_get_tags');
}

export async function searchItems(page: Page, query: string): Promise<Item[]> {
	return invoke<Item[]>(page, 'cmd_search_items', { query });
}

// T3-1 で追加した helper

export async function bulkDeleteItems(page: Page, itemIds: string[]): Promise<number> {
	return invoke<number>(page, 'cmd_bulk_delete_items', { itemIds });
}

export async function bulkAddTag(page: Page, itemIds: string[], tagId: string): Promise<number> {
	return invoke<number>(page, 'cmd_bulk_add_tag', { itemIds, tagId });
}

export async function searchItemsInTag(page: Page, tagId: string, query: string): Promise<Item[]> {
	return invoke<Item[]>(page, 'cmd_search_items_in_tag', { tagId, query });
}

// T3-2 で追加した helper

export async function toggleStar(page: Page, itemId: string, starred: boolean): Promise<Item> {
	return invoke<Item>(page, 'cmd_toggle_star', { itemId, starred });
}

export interface CreateTagInput {
	name: string;
	is_hidden: boolean;
}

export async function createTag(page: Page, input: CreateTagInput): Promise<Tag> {
	return invoke<Tag>(page, 'cmd_create_tag', { input });
}

export async function deleteTag(page: Page, id: string): Promise<void> {
	return invoke<void>(page, 'cmd_delete_tag', { id });
}

export async function updateWorkspace(page: Page, id: string, name: string): Promise<Workspace> {
	return invoke<Workspace>(page, 'cmd_update_workspace', { id, name });
}

export async function bulkRemoveTag(page: Page, itemIds: string[], tagId: string): Promise<number> {
	return invoke<number>(page, 'cmd_bulk_remove_tag', { itemIds, tagId });
}

export async function getItemTags(page: Page, itemId: string): Promise<Tag[]> {
	return invoke<Tag[]>(page, 'cmd_get_item_tags', { itemId });
}

/**
 * PH-CF-200: OS file drop の simulate 用 helper。
 *
 * Tauri v2.11 の `tauri://drag-drop` / `tauri://drag-enter` は OS から webview に届く
 * payload に `{ paths, position: PhysicalPosition }` を持つ (`@tauri-apps/api/webview.d.ts`)。
 * Playwright から本物の OS drop は起こせないため、 frontend の `emit()` で **同じ payload を持つ
 * 同じ event 名**を発火し、 +page.svelte の `listen('tauri://drag-drop', …)` を駆動する。
 *
 * emit による simulate は OS 由来の event と同一の listener 経路を通る (Tauri の event bus は
 * `emit` / OS 由来を区別しない)。 ただし HTML5 `drop` イベントは発火しないため、 HTML5 drop
 * 経由の URL D&D (`+page.svelte:handleHtmlDrop`) は別途 `page.dispatchEvent('drop', …)` が必要。
 *
 * `position` は **device pixel** (PhysicalPosition)。 caller は client (CSS px) × DPR で渡す。
 */
export async function emitTauriDragEnter(
	page: Page,
	payload: { paths: string[]; position: { x: number; y: number } },
): Promise<void> {
	await page.evaluate(async (p) => {
		const { emit } = await import('@tauri-apps/api/event');
		await emit('tauri://drag-enter', p);
	}, payload);
}

export async function emitTauriDragDrop(
	page: Page,
	payload: { paths: string[]; position: { x: number; y: number } },
): Promise<void> {
	await page.evaluate(async (p) => {
		const { emit } = await import('@tauri-apps/api/event');
		await emit('tauri://drag-drop', p);
	}, payload);
}

export async function emitTauriDragLeave(page: Page): Promise<void> {
	await page.evaluate(async () => {
		const { emit } = await import('@tauri-apps/api/event');
		await emit('tauri://drag-leave', {});
	});
}

export interface WidgetWithPosition extends Widget {
	position_x: number;
	position_y: number;
	width: number;
	height: number;
	config: string | null;
}

/** widget の position / config を含む 1 件取得 (e2e の配置検証で使う)。 */
export async function listWidgetsWithPosition(
	page: Page,
	workspaceId: string,
): Promise<WidgetWithPosition[]> {
	return invoke<WidgetWithPosition[]>(page, 'cmd_list_widgets', { workspaceId });
}
