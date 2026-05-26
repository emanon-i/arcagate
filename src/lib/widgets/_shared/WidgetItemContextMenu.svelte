<script lang="ts">
import { Copy, EyeOff, FolderMinus, FolderOpen, Play, Settings2, Trash2 } from '@lucide/svelte';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import ContextMenu from '$lib/components/common/ContextMenu.svelte';
import { t } from '$lib/i18n.svelte';
import { deleteItem, removeItemFromWorkspace } from '$lib/ipc/items';
import { revealInExplorer } from '$lib/ipc/launch';
import { itemStore } from '$lib/state/items.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { widgetItemHidesStore } from '$lib/state/widget-item-hides.svelte';
import { workspaceConfig } from '$lib/state/workspace-config.svelte';
import { getErrorMessage } from '$lib/utils/format-error';
import { launchItemWithCascade } from '$lib/utils/launch-cascade';
import { formatLaunchError } from '$lib/utils/launch-error';

/**
 * I-2 (2026-05-10 user 検収): 全 widget 共通 context menu。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P5 OS 文脈 (Windows 右クリック慣習)
 * - E:/tmp/arcagate-refactor-guidelines.md anti-pattern §6 (Leaky abstraction 回避: prop 数最小化)
 *
 * Menu items (graceful degradation):
 * - (a) パスをコピー / (b) Explorer で開く: `path` が指定された時のみ
 * - (c) アイテムを削除: `itemId` が指定された時のみ (Library item DB delete)
 * - (d) 設定を開く: `onOpenSettings` callback が指定された時のみ (widget settings dialog)
 *
 * 「全 widget 共通の基本機能」「実装漏れ禁止」: item-row widget は path + itemId 経由、
 * widget body 右 click は onOpenSettings のみで graceful に表示項目を減らす。
 */
interface Props {
	open: boolean;
	x: number;
	y: number;
	path?: string | null;
	itemId?: string | null;
	/** Phase 2 (2026-05-12): per-widget hide menu を表示する場合の widget id。
	 * widgetId + path が両方ある時のみ「この widget から外す」 button が出る。 */
	widgetId?: string | null;
	/**
	 * PH-CF-1200 ⑨: caller widget の config.default_opener_id。
	 * 右クリック「デフォルトアプリで開く」 が `widget opener → item.default_app → system` の
	 * cascade を通るために使う。 未指定 (null) なら item-level / system default の cascade のみ。
	 * widget 内 click 経路 (handleLaunch 等) と同等の opener 解決を保証する。
	 */
	widgetDefaultOpenerId?: string | null;
	onOpenSettings?: (() => void) | null;
	onClose: () => void;
}

let {
	open,
	x,
	y,
	path,
	itemId,
	widgetId,
	widgetDefaultOpenerId = null,
	onOpenSettings,
	onClose,
}: Props = $props();

let item = $derived(itemId ? (itemStore.items.find((i) => i.id === itemId) ?? null) : null);

async function handleCopyPath(): Promise<void> {
	if (!path) return;
	try {
		await writeText(path);
		toastStore.add(t('toast.path_copied'), 'success');
	} catch (e: unknown) {
		toastStore.add(t('toast.copy_failed', { error: getErrorMessage(e) }), 'error');
	} finally {
		onClose();
	}
}

async function handleRevealInExplorer(): Promise<void> {
	if (!path) return;
	try {
		await revealInExplorer(path);
	} catch (e: unknown) {
		toastStore.add(t('toast.explorer_failed', { error: getErrorMessage(e) }), 'error');
	} finally {
		onClose();
	}
}

async function handleDeleteItem(): Promise<void> {
	if (!itemId) return;
	const label = item?.label ?? t('widgets.context_menu.item_fallback');
	try {
		await deleteItem(itemId);
		await itemStore.loadItems();
		toastStore.add(t('toast.deleted_label', { label }), 'info');
	} catch (e: unknown) {
		toastStore.add(t('toast.delete_failed', { error: getErrorMessage(e) }), 'error');
	} finally {
		onClose();
	}
}

function handleOpenSettings(): void {
	if (!onOpenSettings) return;
	onOpenSettings();
	onClose();
}

// PH-CF-1200 ⑨: Default app (Opener) で起動。 click 経路 (widget.launchEntry / handleLaunch 等)
// と同じ cascade を通す: card_override.opener_id → widget.default_opener_id → item.default_app /
// system default。 widgetDefaultOpenerId は openMenuFor 経由で caller widget が伝播する。
// 旧実装は ctx 引数を渡さず widget opener を完全無視 + エラー表示も `launch_failed` 生 message で
// 「clicking と右クリックで挙動が食い違う」 状態 (PH-CF-1200 ⑨ の root cause)。
// toast 文言も click 経路の `formatLaunchError(label, e)` + `toast.launched_label` と揃えて、
// 「Path not found - check the item setting」 等の i18n 化された案内が同じく出るようにする。
async function handleLaunchDefault(): Promise<void> {
	if (!item) return;
	const label = item.label;
	try {
		// PH-CF-1210 ⑨ (B): folder + opener_not_found → cascade が Explorer フォールバック →
		// info toast で誘導。 通常成功 / 非 folder の opener 失敗 → 既存挙動 (success / error)。
		const r = await launchItemWithCascade(item, { widgetDefaultOpenerId });
		if (r.kind === 'fallback-explorer') {
			toastStore.add(t('toast.launched_with_explorer_fallback', { label }), 'info');
		} else {
			toastStore.add(t('toast.launched_label', { label }), 'success');
		}
	} catch (e: unknown) {
		toastStore.add(formatLaunchError(label, e), 'error');
	} finally {
		onClose();
	}
}

/** Phase 2: per-widget hide。 Library / 他 widget には影響しない、 この widget からだけ非表示。 */
async function handleHideFromWidget(): Promise<void> {
	if (!widgetId || !path) return;
	try {
		await widgetItemHidesStore.add(widgetId, path);
		toastStore.add(t('toast.removed_from_widget'), 'info');
	} catch (e: unknown) {
		toastStore.add(t('toast.hide_failed', { error: getErrorMessage(e) }), 'error');
	} finally {
		onClose();
	}
}

/**
 * アイテムライフサイクル契約 U-5: 「Library に残しつつ当該 workspace から外す」 専用操作。
 * 削除 (handleDeleteItem) と意図的に区別する。 sys-ws-* tag 解除 + 当該 workspace の
 * widget config item 参照を strip するが item 行は Library に残る。
 */
async function handleRemoveFromWorkspace(): Promise<void> {
	if (!itemId) return;
	const wsId = workspaceConfig.activeWorkspaceId;
	if (!wsId) return;
	const label = item?.label ?? t('widgets.context_menu.item_fallback');
	try {
		await removeItemFromWorkspace(wsId, itemId);
		await itemStore.loadItems();
		toastStore.add(t('toast.removed_from_workspace', { label }), 'info');
	} catch (e: unknown) {
		toastStore.add(t('toast.remove_from_workspace_failed', { error: getErrorMessage(e) }), 'error');
	} finally {
		onClose();
	}
}
</script>

<ContextMenu {open} {x} {y} {onClose}>
	{#if item}
		<div class="border-b border-[var(--ag-border)] px-3 py-1.5 text-xs text-[var(--ag-text-muted)]">
			<p class="truncate font-medium text-[var(--ag-text-secondary)]">{item.label}</p>
			{#if path}
				<p class="truncate font-mono">{path}</p>
			{/if}
		</div>
	{:else if path}
		<div class="border-b border-[var(--ag-border)] px-3 py-1.5 text-xs text-[var(--ag-text-muted)]">
			<p class="truncate font-mono">{path}</p>
		</div>
	{/if}

	<!-- audit batch deferred (2026-05-13) #11: Default app (Opener) で起動。 item 必要 (widget body 右クリックでは出ない)。
	     item.default_app > global default の cascade。 -->
	{#if item}
		<button
			type="button"
			role="menuitem"
			class="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:bg-[var(--ag-surface-3)] hover:bg-[var(--ag-surface-3)]"
			data-testid="widget-context-launch-default"
			onclick={() => void handleLaunchDefault()}
		>
			<Play class="h-3.5 w-3.5" />
			{t('widgets.context_menu.open_default_app')}
		</button>
	{/if}

	{#if path}
		<button
			type="button"
			role="menuitem"
			class="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:bg-[var(--ag-surface-3)] hover:bg-[var(--ag-surface-3)]"
			data-testid="widget-context-copy-path"
			onclick={() => void handleCopyPath()}
		>
			<Copy class="h-3.5 w-3.5" />
			{t('widgets.context_menu.copy_path')}
		</button>
		<button
			type="button"
			role="menuitem"
			class="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:bg-[var(--ag-surface-3)] hover:bg-[var(--ag-surface-3)]"
			data-testid="widget-context-reveal-explorer"
			onclick={() => void handleRevealInExplorer()}
		>
			<FolderOpen class="h-3.5 w-3.5" />
			{t('widgets.context_menu.reveal_in_explorer')}
		</button>
	{/if}

	{#if widgetId && path}
		{#if path}
			<div class="my-1 border-t border-[var(--ag-border)]"></div>
		{/if}
		<!-- Phase 2 (2026-05-12): per-widget hide。 Library や他 widget には影響しない、 この widget からだけ外す。 -->
		<button
			type="button"
			role="menuitem"
			class="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[var(--ag-text-secondary)] focus-visible:outline-none focus-visible:bg-[var(--ag-surface-3)] hover:bg-[var(--ag-surface-3)]"
			data-testid="widget-context-hide-from-widget"
			onclick={() => void handleHideFromWidget()}
		>
			<EyeOff class="h-3.5 w-3.5" />
			{t('widgets.context_menu.hide_from_widget')}
		</button>
	{/if}

	{#if itemId && workspaceConfig.activeWorkspaceId}
		{#if path || widgetId}
			<div class="my-1 border-t border-[var(--ag-border)]"></div>
		{/if}
		<!-- アイテムライフサイクル契約 U-5: Library 残しの workspace 配置解除。 削除と区別。 -->
		<button
			type="button"
			role="menuitem"
			class="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[var(--ag-text-secondary)] focus-visible:outline-none focus-visible:bg-[var(--ag-surface-3)] hover:bg-[var(--ag-surface-3)]"
			data-testid="widget-context-remove-from-workspace"
			onclick={() => void handleRemoveFromWorkspace()}
		>
			<FolderMinus class="h-3.5 w-3.5" />
			{t('widgets.context_menu.remove_from_workspace')}
		</button>
	{/if}

	{#if itemId}
		{#if path || widgetId || workspaceConfig.activeWorkspaceId}
			<div class="my-1 border-t border-[var(--ag-border)]"></div>
		{/if}
		<button
			type="button"
			role="menuitem"
			class="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-destructive focus-visible:outline-none focus-visible:bg-destructive/10 hover:bg-destructive/10"
			data-testid="widget-context-delete-item"
			onclick={() => void handleDeleteItem()}
		>
			<Trash2 class="h-3.5 w-3.5" />
			{t('widgets.context_menu.delete_item')}
		</button>
	{/if}

	{#if onOpenSettings}
		{#if path || itemId}
			<div class="my-1 border-t border-[var(--ag-border)]"></div>
		{/if}
		<button
			type="button"
			role="menuitem"
			class="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[var(--ag-text-secondary)] focus-visible:outline-none focus-visible:bg-[var(--ag-surface-3)] hover:bg-[var(--ag-surface-3)]"
			data-testid="widget-context-open-settings"
			onclick={handleOpenSettings}
		>
			<Settings2 class="h-3.5 w-3.5" />
			{t('widgets.context_menu.open_settings')}
		</button>
	{/if}
</ContextMenu>
