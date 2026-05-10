<script lang="ts">
import { Copy, FolderOpen, Settings2, Trash2 } from '@lucide/svelte';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import ContextMenu from '$lib/components/common/ContextMenu.svelte';
import { deleteItem } from '$lib/ipc/items';
import { revealInExplorer } from '$lib/ipc/launch';
import { itemStore } from '$lib/state/items.svelte';
import { toastStore } from '$lib/state/toast.svelte';

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
	onOpenSettings?: (() => void) | null;
	onClose: () => void;
}

let { open, x, y, path, itemId, onOpenSettings, onClose }: Props = $props();

let item = $derived(itemId ? (itemStore.items.find((i) => i.id === itemId) ?? null) : null);

async function handleCopyPath(): Promise<void> {
	if (!path) return;
	try {
		await writeText(path);
		toastStore.add('パスをコピーしました', 'success');
	} catch (e: unknown) {
		toastStore.add(`コピー失敗: ${String(e)}`, 'error');
	} finally {
		onClose();
	}
}

async function handleRevealInExplorer(): Promise<void> {
	if (!path) return;
	try {
		await revealInExplorer(path);
	} catch (e: unknown) {
		toastStore.add(`Explorer で開く失敗: ${String(e)}`, 'error');
	} finally {
		onClose();
	}
}

async function handleDeleteItem(): Promise<void> {
	if (!itemId) return;
	const label = item?.label ?? 'アイテム';
	try {
		await deleteItem(itemId);
		await itemStore.loadItems();
		toastStore.add(`${label} を削除しました`, 'info');
	} catch (e: unknown) {
		toastStore.add(`削除失敗: ${String(e)}`, 'error');
	} finally {
		onClose();
	}
}

function handleOpenSettings(): void {
	if (!onOpenSettings) return;
	onOpenSettings();
	onClose();
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

	{#if path}
		<button
			type="button"
			role="menuitem"
			class="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:bg-[var(--ag-surface-3)] hover:bg-[var(--ag-surface-3)]"
			data-testid="widget-context-copy-path"
			onclick={() => void handleCopyPath()}
		>
			<Copy class="h-3.5 w-3.5" />
			パスをコピー
		</button>
		<button
			type="button"
			role="menuitem"
			class="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:bg-[var(--ag-surface-3)] hover:bg-[var(--ag-surface-3)]"
			data-testid="widget-context-reveal-explorer"
			onclick={() => void handleRevealInExplorer()}
		>
			<FolderOpen class="h-3.5 w-3.5" />
			Explorer で開く
		</button>
	{/if}

	{#if itemId}
		{#if path}
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
			アイテムを削除
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
			ウィジェット設定を開く
		</button>
	{/if}
</ContextMenu>
