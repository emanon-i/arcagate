<script lang="ts">
import { ClipboardList, Search, X } from '@lucide/svelte';
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import {
	type ClipboardEntry,
	deleteClipboardEntry,
	pushClipboardEntry,
} from '$lib/utils/clipboard-history';
import { formatIpcError } from '$lib/utils/ipc-error';

interface Props {
	widget?: WorkspaceWidget;
}

let { widget }: Props = $props();
let settingsOpen = $state(false);

interface ClipboardHistoryConfig {
	max_items?: number;
	poll_interval_ms?: number;
	title?: string;
	history?: ClipboardEntry[];
}

let config = $derived.by<ClipboardHistoryConfig>(() => {
	if (!widget?.config) return {};
	try {
		return JSON.parse(widget.config) as ClipboardHistoryConfig;
	} catch {
		return {};
	}
});

let history = $derived(config.history ?? []);
let maxItems = $derived(config.max_items ?? 20);
let pollMs = $derived(Math.max(500, Math.min(10_000, config.poll_interval_ms ?? 1500)));

// PH-437: 検索 (Nielsen H7) — 部分一致 case-insensitive
let query = $state('');
let filteredHistory = $derived.by(() => {
	const q = query.trim().toLowerCase();
	if (!q) return history;
	return history.filter((e) => e.text.toLowerCase().includes(q));
});

// PH-512: ArrowUp/Down + Enter で row 選択 + コピー (ExeFolder/FileSearch と同 UX)
let selectedIndex = $state(0);
let listEl = $state<HTMLUListElement | null>(null);

// filtered 件数変化で selectedIndex 0 reset
$effect(() => {
	const _len = filteredHistory.length;
	selectedIndex = 0;
});

function handleListKeydown(e: KeyboardEvent) {
	if (e.isComposing) return; // IME 中は無視
	if (filteredHistory.length === 0) return;
	if (e.key === 'ArrowDown') {
		e.preventDefault();
		selectedIndex = Math.min(selectedIndex + 1, filteredHistory.length - 1);
		scrollSelectedIntoView();
	} else if (e.key === 'ArrowUp') {
		e.preventDefault();
		selectedIndex = Math.max(selectedIndex - 1, 0);
		scrollSelectedIntoView();
	} else if (e.key === 'Enter') {
		const sel = filteredHistory[selectedIndex];
		if (sel) {
			e.preventDefault();
			void copyEntry(sel);
		}
	}
}

function scrollSelectedIntoView() {
	if (!listEl) return;
	const el = listEl.querySelector<HTMLElement>(`[data-row-idx="${selectedIndex}"]`);
	el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

async function persist(next: ClipboardHistoryConfig) {
	if (!widget) return;
	await workspaceStore.updateWidgetConfig(widget.id, JSON.stringify(next));
}

async function handlePoll() {
	try {
		const text = await readText();
		if (!text) return;
		const next = pushClipboardEntry(history, text, { maxItems });
		if (next === history) return;
		await persist({ ...config, history: next });
	} catch {
		// 権限失敗 / 空クリップは無視
	}
}

$effect(() => {
	const interval = pollMs;
	const id = window.setInterval(() => {
		void handlePoll();
	}, interval);
	return () => window.clearInterval(id);
});

async function copyEntry(entry: ClipboardEntry) {
	try {
		await writeText(entry.text);
		toastStore.add('クリップボードにコピーしました', 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: 'クリップボードへのコピー' }, e), 'error');
	}
}

function deleteEntry(id: string) {
	const next = deleteClipboardEntry(history, id);
	void persist({ ...config, history: next });
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

// PH-512: truncate は CSS で実施 (title attribute で full text tooltip)
// 旧: manual 80 char cutoff → CSS truncate (responsive 化対応)
function singleLinePreview(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}
</script>

<WidgetShell title={config.title || 'クリップボード履歴'} icon={ClipboardList} {menuItems}>
	<div class="clip-container flex h-full flex-col">
		{#if history.length === 0}
			<div
				class="rounded-md border border-dashed border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-2 text-ag-xs text-[var(--ag-text-muted)]"
				data-testid="clipboard-history-empty"
			>
				<p class="mb-0.5 font-medium text-[var(--ag-text-secondary)]">履歴は空です</p>
				<p>テキストをコピーすると ここに溜まり、クリックで再コピーできます。</p>
			</div>
		{:else}
			<!-- PH-512: 検索バーは S サイズ (< 200px) で非表示 (狭い widget では history 表示優先) -->
			<div
				class="clip-search mb-2 flex items-center gap-1 rounded border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2"
			>
				<Search class="h-3 w-3 shrink-0 text-[var(--ag-text-muted)]" />
				<input
					type="text"
					class="min-w-0 flex-1 bg-transparent py-1 text-ag-xs text-[var(--ag-text-primary)] focus-visible:outline-none"
					placeholder="履歴を検索..."
					autocomplete="off"
					bind:value={query}
					data-testid="clipboard-history-search"
				/>
				{#if query}
					<button
						type="button"
						class="shrink-0 rounded p-0.5 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]"
						aria-label="検索クエリをクリア"
						onclick={() => (query = '')}
					>
						<X class="h-3 w-3" />
					</button>
				{/if}
			</div>
			{#if query}
				<p class="clip-search mb-1 text-[10px] text-[var(--ag-text-muted)]">
					{history.length} 件中 {filteredHistory.length} 件表示
				</p>
			{/if}
			{#if filteredHistory.length === 0}
				<p class="text-ag-xs text-[var(--ag-text-muted)]">
					「{query}」に一致する履歴はありません
				</p>
			{:else}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<ul
					class="space-y-1 outline-none"
					role="listbox"
					tabindex="0"
					aria-label="クリップボード履歴"
					aria-activedescendant={filteredHistory.length > 0
						? `clip-row-${selectedIndex}`
						: undefined}
					bind:this={listEl}
					onkeydown={handleListKeydown}
				>
					{#each filteredHistory as entry, idx (entry.id)}
						{@const isSelected = idx === selectedIndex}
						<li
							class="group flex items-center gap-1"
							id="clip-row-{idx}"
							role="option"
							aria-selected={isSelected}
							data-row-idx={idx}
						>
							<button
								type="button"
								class="min-w-0 flex-1 rounded-md px-2 py-1 text-left text-ag-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {isSelected
									? 'bg-[var(--ag-surface-3)]'
									: 'hover:bg-[var(--ag-surface-3)]'}"
								aria-label="クリップボードに再コピー"
								title={entry.text}
								onclick={() => void copyEntry(entry)}
							>
								<span class="block truncate text-[var(--ag-text-primary)]">
									{singleLinePreview(entry.text)}
								</span>
							</button>
							<button
								type="button"
								class="shrink-0 rounded p-0.5 text-[var(--ag-text-muted)] opacity-0 hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:opacity-100 group-hover:opacity-100"
								aria-label="履歴から削除"
								onclick={() => deleteEntry(entry.id)}
							>
								<X class="h-3 w-3" />
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</div>
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}

<style>
.clip-container {
	container-type: inline-size;
}
/* S サイズ (< 200px): 検索バー / 件数表示を非表示 (history 表示優先) */
@container (max-width: 200px) {
	.clip-search {
		display: none;
	}
}
</style>
