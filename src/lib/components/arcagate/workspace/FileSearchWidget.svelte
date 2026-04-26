<script lang="ts">
import { File, FileSearch, Folder, Search } from '@lucide/svelte';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';

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

async function refresh() {
	if (!root) {
		entries = [];
		return;
	}
	loading = true;
	lastError = null;
	try {
		entries = await invoke<FileEntry[]>('cmd_list_files', { root, depth, limit });
	} catch (e: unknown) {
		lastError = String(e);
		entries = [];
	} finally {
		loading = false;
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
		toastStore.add(`開けませんでした: ${String(e)}`, 'error');
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

let menuItems = $derived(
	widget
		? [
				{
					label: '設定',
					onclick: () => {
						settingsOpen = true;
					},
				},
			]
		: [],
);
</script>

<WidgetShell title={config.title || 'ファイル検索'} icon={FileSearch} {menuItems}>
	{#if !root}
		<div class="space-y-2">
			<p class="text-xs text-[var(--ag-text-muted)]">検索ルートが未設定です</p>
			<button
				type="button"
				class="rounded bg-[var(--ag-accent-bg)] px-2 py-1 text-xs text-[var(--ag-accent-text)] hover:bg-[var(--ag-accent-active-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
				onclick={() => void pickRoot()}
			>
				ルートを選択
			</button>
		</div>
	{:else}
		<div class="mb-2 flex items-center gap-1">
			<div class="flex flex-1 items-center gap-1 rounded border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2">
				<Search class="h-3 w-3 text-[var(--ag-text-muted)]" />
				<input
					type="text"
					class="min-w-0 flex-1 bg-transparent py-1 text-xs text-[var(--ag-text-primary)] focus-visible:outline-none"
					placeholder="ファイル名でフィルタ..."
					autocomplete="off"
					bind:value={query}
				/>
			</div>
		</div>
		{#if loading}
			<p class="text-xs text-[var(--ag-text-muted)]">読み込み中...</p>
		{:else if lastError}
			<p class="text-xs text-[var(--ag-text-warning,red)]">{lastError}</p>
		{:else if filtered.length === 0}
			<p class="text-xs text-[var(--ag-text-muted)]">
				{query ? '一致するファイルがありません' : 'ファイルがありません'}
			</p>
		{:else}
			<ul class="space-y-1">
				{#each filtered as entry (entry.path)}
					<li>
						<button
							type="button"
							class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-[var(--ag-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
							aria-label="{entry.name} を開く"
							onclick={() => void openEntry(entry)}
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
