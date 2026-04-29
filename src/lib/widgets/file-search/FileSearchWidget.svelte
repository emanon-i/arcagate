<script lang="ts">
import { File, FileSearch, Folder, FolderOpen, Search, X as XIcon } from '@lucide/svelte';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { getErrorCode, getErrorMessage } from '$lib/utils/format-error';
import { formatIpcError } from '$lib/utils/ipc-error';
import { widgetMenuItems } from '../_shared/menu-items';

interface Props {
	widget?: WorkspaceWidget;
}

let { widget }: Props = $props();
let settingsOpen = $state(false);

interface FileEntry {
	path: string;
	name: string;
	isDir: boolean;
	sizeBytes: number;
}

interface FileSearchConfig {
	root?: string;
	depth?: number;
	limit?: number;
	title?: string;
}

let config = $derived.by<FileSearchConfig>(() => {
	if (!widget?.config) return {};
	try {
		return JSON.parse(widget.config) as FileSearchConfig;
	} catch {
		return {};
	}
});

let root = $derived(config.root ?? '');
let depth = $derived(Math.max(1, Math.min(3, config.depth ?? 2)));
let limit = $derived(Math.max(10, Math.min(2000, config.limit ?? 200)));

let entries = $state<FileEntry[]>([]);
let query = $state('');
let loading = $state(false);
let lastError = $state<string | null>(null);
let currentSearchId = $state<string | null>(null);
// PH-issue-018: keyboard nav state. ArrowUp/Down で動かし、Enter で起動。
let selectedIndex = $state(0);

function newSearchId(): string {
	// crypto.randomUUID は Tauri webview で利用可能 (Chromium 92+)
	return crypto.randomUUID();
}

async function refresh() {
	// PH-issue-017: 派生 state を即時 clear (root 変更時の旧 entries 残留防止)。
	entries = [];
	lastError = null;
	if (!root) {
		loading = false;
		return;
	}
	const searchId = newSearchId();
	currentSearchId = searchId;
	loading = true;
	try {
		const result = await invoke<FileEntry[]>('cmd_list_files', {
			searchId,
			root,
			depth,
			limit,
		});
		// stale response 破棄: 自分が最新の searchId でなければ書き戻さない。
		if (currentSearchId !== searchId) return;
		entries = result;
	} catch (e: unknown) {
		if (currentSearchId !== searchId) return;
		// Cancelled は silent (UI 側で「中止しました」toast を別途出す)
		// PH-445: errorCode 経由判定 (string contains から構造化判定へ)
		if (getErrorCode(e) === 'cancelled') {
			entries = [];
		} else {
			lastError = getErrorMessage(e);
			entries = [];
		}
	} finally {
		if (currentSearchId === searchId) {
			loading = false;
			currentSearchId = null;
		}
	}
}

async function cancelCurrent() {
	if (!currentSearchId) return;
	const id = currentSearchId;
	const cancelled = await invoke<boolean>('cmd_cancel_file_search', { searchId: id });
	if (cancelled) {
		toastStore.add('検索を中止しました', 'info');
	}
}

$effect(() => {
	const _root = root;
	const _depth = depth;
	const _limit = limit;
	void refresh();
});

let filtered = $derived.by(() => {
	const q = query.trim().toLowerCase();
	if (!q) return entries.slice(0, 50);
	return entries.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 50);
});

async function openEntry(entry: FileEntry) {
	try {
		await invoke('cmd_open_path', { path: entry.path });
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: 'ファイルを開く処理' }, e), 'error');
	}
}

// PH-issue-018: query が変わったら selection を先頭に戻す。
$effect(() => {
	const _q = query;
	selectedIndex = 0;
});

// PH-issue-018: ArrowUp / ArrowDown / Enter で keyboard nav。
// IME 確定中 (e.isComposing) は無視 (lessons.md IME 対応)。
function handleSearchKeydown(e: KeyboardEvent) {
	if (e.isComposing) return;
	if (filtered.length === 0) return;
	if (e.key === 'ArrowDown') {
		e.preventDefault();
		selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
	} else if (e.key === 'ArrowUp') {
		e.preventDefault();
		selectedIndex = Math.max(selectedIndex - 1, 0);
	} else if (e.key === 'Enter') {
		e.preventDefault();
		const target = filtered[selectedIndex];
		if (target) void openEntry(target);
	}
}

async function pickRoot() {
	const selected = await openDialog({
		directory: true,
		multiple: false,
		title: '検索ルートを選択',
	});
	if (!selected || Array.isArray(selected)) return;
	// config 直接更新は workspaceStore 経由（settings dialog と同じ振る舞い）
	const { workspaceStore } = await import('$lib/state/workspace.svelte');
	if (!widget) return;
	const next: FileSearchConfig = { ...config, root: selected };
	await workspaceStore.updateWidgetConfig(widget.id, JSON.stringify(next));
}

let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));
</script>

<WidgetShell title={config.title || 'ファイル検索'} icon={FileSearch} {menuItems}>
	{#if !root}
		<!-- PH-issue-022: 共通 EmptyState component で統一 (P12 整合性、§7 Do/Don't) -->
		<EmptyState
			icon={FolderOpen}
			title="検索ルートを選んでください"
			description="選んだフォルダ以下のファイルを部分一致でフィルタして開けます。"
			action={{
				label: 'ルートを選択',
				icon: FolderOpen,
				onClick: () => void pickRoot(),
			}}
			testId="file-search-empty-state"
		/>
	{:else}
		<!-- PH-issue-018: 検索バー sticky で scroll 中も検索可能。z-1 で結果リストより上。 -->
		<div class="sticky top-0 z-[1] mb-2 flex items-center gap-1 bg-[var(--ag-surface-opaque)] pb-1">
			<div class="flex flex-1 items-center gap-1 rounded border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2">
				<Search class="h-3 w-3 text-[var(--ag-text-muted)]" />
				<input
					type="text"
					class="min-w-0 flex-1 bg-transparent py-1 text-xs text-[var(--ag-text-primary)] focus-visible:outline-none"
					placeholder="ファイル名でフィルタ (↑↓ Enter)"
					autocomplete="off"
					bind:value={query}
					onkeydown={handleSearchKeydown}
				/>
			</div>
		</div>
		{#if loading}
			<div class="flex items-center justify-between gap-2">
				<p class="text-xs text-[var(--ag-text-muted)]">検索中...</p>
				<button
					type="button"
					class="flex items-center gap-1 rounded border border-[var(--ag-border)] px-2 py-0.5 text-xs text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]"
					aria-label="検索を中止"
					data-testid="file-search-cancel"
					onclick={() => void cancelCurrent()}
				>
					<XIcon class="h-3 w-3" />
					中止
				</button>
			</div>
		{:else if lastError}
			<p class="text-xs text-[var(--ag-text-warning,red)]">{lastError}</p>
		{:else if filtered.length === 0}
			<p class="text-xs text-[var(--ag-text-muted)]">
				{query ? '一致するファイルがありません' : 'ファイルがありません'}
			</p>
		{:else}
			<ul class="space-y-1">
				{#each filtered as entry, idx (entry.path)}
					{@const isSelected = idx === selectedIndex}
					<li>
						<button
							type="button"
							class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] {isSelected
								? 'bg-[var(--ag-surface-3)] ring-1 ring-[var(--ag-accent)]'
								: ''}"
							aria-label="{entry.name} を開く"
							aria-selected={isSelected}
							onclick={() => {
								selectedIndex = idx;
								void openEntry(entry);
							}}
						>
							{#if entry.isDir}
								<Folder class="h-3 w-3 shrink-0 text-[var(--ag-text-muted)]" />
							{:else}
								<File class="h-3 w-3 shrink-0 text-[var(--ag-text-muted)]" />
							{/if}
							<span class="min-w-0 flex-1 truncate text-[var(--ag-text-primary)]">{entry.name}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
