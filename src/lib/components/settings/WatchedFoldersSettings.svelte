<script lang="ts">
import { FolderPlus, Trash2 } from '@lucide/svelte';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import { Button } from '$lib/components/ui/button';
import { addWatchedPath, getWatchedPaths, removeWatchedPath } from '$lib/ipc/watched_paths';
import { toastStore } from '$lib/state/toast.svelte';
import type { WatchedPath } from '$lib/types/watched_path';
import { formatIpcError } from '$lib/utils/ipc-error';

// PH-428 / Codex Q5 #2: 取り込みフォルダ管理 UI
// addWatchedPath 失敗時 (= watch silent failure 修正後の WatchFailed) を toast で可視化
let paths = $state<WatchedPath[]>([]);
let loading = $state(false);
let removingId = $state<string | null>(null);

async function refresh() {
	loading = true;
	try {
		paths = await getWatchedPaths();
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: '取り込みフォルダ一覧の取得' }, e), 'error');
	} finally {
		loading = false;
	}
}

$effect(() => {
	void refresh();
});

async function handleAddFolder() {
	const selected = await openDialog({
		directory: true,
		multiple: false,
		title: '取り込むフォルダを選択',
	});
	if (!selected || Array.isArray(selected)) return;
	try {
		await addWatchedPath(selected, null);
		toastStore.add(`フォルダを追加しました: ${selected}`, 'success');
		await refresh();
	} catch (e: unknown) {
		// PH-421 で WatchFailed が返るケースがある (path 不在 / 権限なし等)
		toastStore.add(formatIpcError({ operation: '取り込みフォルダの追加' }, e), 'error');
	}
}

async function handleRemove(id: string, path: string) {
	removingId = id;
	try {
		await removeWatchedPath(id);
		toastStore.add(`フォルダ監視を停止しました: ${path}`, 'info');
		await refresh();
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: '取り込みフォルダの削除' }, e), 'error');
	} finally {
		removingId = null;
	}
}
</script>

<div class="space-y-3" data-testid="watched-folders-settings">
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm font-medium text-[var(--ag-text-primary)]">取り込みフォルダ</p>
			<p class="text-xs text-[var(--ag-text-muted)]">
				指定したフォルダ内のファイルが自動でアイテムとして追加されます。
			</p>
		</div>
		<Button
			type="button"
			variant="default"
			size="sm"
			onclick={() => void handleAddFolder()}
			data-testid="watched-folder-add"
		>
			<FolderPlus class="h-3.5 w-3.5" />
			フォルダを追加
		</Button>
	</div>

	{#if loading}
		<p class="text-xs text-[var(--ag-text-muted)]">読み込み中...</p>
	{:else if paths.length === 0}
		<EmptyState
			icon={FolderPlus}
			title="監視中のフォルダがありません"
			description="ゲーム / プロジェクトの親フォルダを追加すると、配下のファイルが自動取り込みされます。"
			testId="watched-folders-empty"
		/>
	{:else}
		<ul class="space-y-2">
			{#each paths as wp (wp.id)}
				<li
					class="flex items-center justify-between gap-2 rounded border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2"
					data-testid="watched-folder-item-{wp.id}"
				>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm text-[var(--ag-text-primary)]">{wp.label ?? wp.path}</p>
						{#if wp.label}
							<p class="truncate text-xs text-[var(--ag-text-muted)]">{wp.path}</p>
						{/if}
					</div>
					<button
						type="button"
						class="shrink-0 rounded p-1 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] hover:text-red-500 disabled:opacity-40"
						aria-label="このフォルダを削除"
						disabled={removingId === wp.id}
						onclick={() => void handleRemove(wp.id, wp.path)}
					>
						<Trash2 class="h-4 w-4" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
