<script lang="ts">
import { Copy, EyeOff, FolderOpen, Play, Settings2, Trash2 } from '@lucide/svelte';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import ContextMenu from '$lib/components/common/ContextMenu.svelte';
import { deleteItem } from '$lib/ipc/items';
import { revealInExplorer } from '$lib/ipc/launch';
import { itemStore } from '$lib/state/items.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { widgetItemHidesStore } from '$lib/state/widget-item-hides.svelte';
import { launchItemWithCascade } from '$lib/utils/launch-cascade';

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
	onOpenSettings?: (() => void) | null;
	onClose: () => void;
}

let { open, x, y, path, itemId, widgetId, onOpenSettings, onClose }: Props = $props();

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

// audit batch deferred (2026-05-13) #11: Default app (Opener) で起動。
// item.default_app (per-item override) > widget config (widgetDefaultOpenerId) > global default の cascade。
// widget config からの opener id は context menu props に無いので item-level のみ resolve、 fallback は cmd_open_path 経由。
async function handleLaunchDefault(): Promise<void> {
	if (!item) return;
	try {
		await launchItemWithCascade(item);
	} catch (e: unknown) {
		toastStore.add(`起動に失敗: ${String(e)}`, 'error');
	} finally {
		onClose();
	}
}

/** Phase 2: per-widget hide。 Library / 他 widget には影響しない、 この widget からだけ非表示。 */
async function handleHideFromWidget(): Promise<void> {
	if (!widgetId || !path) return;
	try {
		await widgetItemHidesStore.add(widgetId, path);
		toastStore.add('この widget から外しました', 'info');
	} catch (e: unknown) {
		toastStore.add(`非表示にできませんでした: ${String(e)}`, 'error');
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
			Default app で開く
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
			この widget から外す
		</button>
	{/if}

	{#if itemId}
		{#if path || widgetId}
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
			アイテムを削除 (Library から)
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
