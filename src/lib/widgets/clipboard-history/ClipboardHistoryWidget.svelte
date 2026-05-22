<script lang="ts">
import { ClipboardList, Search, X } from '@lucide/svelte';
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import { t } from '$lib/i18n.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import {
	type ClipboardEntry,
	deleteClipboardEntry,
	pushClipboardEntry,
} from '$lib/utils/clipboard-history';
import { formatIpcError } from '$lib/utils/ipc-error';
import { widgetMenuItems } from '../_shared/menu-items';

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
		toastStore.add(t('toast.copied_to_clipboard'), 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: t('error.op.clipboard_copy') }, e), 'error');
	}
}

function deleteEntry(id: string) {
	const next = deleteClipboardEntry(history, id);
	void persist({ ...config, history: next });
}

let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));

function previewText(text: string): string {
	const oneline = text.replace(/\s+/g, ' ').trim();
	return oneline.length > 80 ? `${oneline.slice(0, 80)}…` : oneline;
}
</script>

<WidgetShell title={config.title || t('widgets.clipboard_history.default_title')} icon={ClipboardList} {menuItems}>
	{#if history.length === 0}
		<EmptyState
			icon={ClipboardList}
			title={t('widgets.clipboard_history.empty_title')}
			description={t('widgets.clipboard_history.empty_desc')}
			testId="clipboard-history-empty-state"
		/>
	{:else}
		<div class="mb-2 flex items-center gap-1 rounded border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2">
			<Search class="h-3 w-3 text-[var(--ag-text-muted)]" />
			<input
				type="text"
				class="min-w-0 flex-1 bg-transparent py-1 text-xs text-[var(--ag-text-primary)] focus-visible:outline-none"
				placeholder={t('widgets.clipboard_history.search_placeholder')}
				autocomplete="off"
				bind:value={query}
				data-testid="clipboard-history-search"
			/>
			{#if query}
				<button
					type="button"
					class="rounded p-0.5 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]"
					aria-label={t('widgets.clipboard_history.clear_search_aria')}
					onclick={() => (query = '')}
				>
					<X class="h-3 w-3" />
				</button>
			{/if}
		</div>
		{#if query}
			<p class="mb-1 text-xs text-[var(--ag-text-muted)]">
				{t('widgets.clipboard_history.filter_count', { total: history.length, shown: filteredHistory.length })}
			</p>
		{/if}
		{#if filteredHistory.length === 0}
			<EmptyState
				icon={Search}
				title={t('widgets.clipboard_history.no_match', { query })}
				testId="clipboard-history-no-match-state"
			/>
		{:else}
		<!-- PH-widget-polish: list-row に min-w-0、active:scale-[0.97] で再コピー触覚フィードバック、
		     title 属性で全文 tooltip (長文クリップボードは preview しか出ないため重要) -->
		<ul class="space-y-1">
			{#each filteredHistory as entry (entry.id)}
				<li class="group flex min-w-0 items-center gap-1">
					<button
						type="button"
						class="min-w-0 flex-1 rounded-md px-2 py-1 text-left text-xs transition-[background-color,transform] duration-[var(--ag-duration-fast)] motion-reduce:transition-none active:scale-[0.97] hover:bg-[var(--ag-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
						aria-label={t('widgets.clipboard_history.recopy_aria')}
						title={entry.text}
						onclick={() => void copyEntry(entry)}
					>
						<span class="block truncate text-[var(--ag-text-primary)]">{previewText(entry.text)}</span>
					</button>
					<button
						type="button"
						class="shrink-0 rounded p-0.5 text-[var(--ag-text-muted)] opacity-0 transition-opacity duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:opacity-100 group-hover:opacity-100"
						aria-label={t('widgets.clipboard_history.delete_entry_aria')}
						onclick={() => deleteEntry(entry.id)}
					>
						<X class="h-3 w-3" />
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
