<script lang="ts">
import { ClipboardList, X } from '@lucide/svelte';
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
		toastStore.add(`コピーに失敗しました: ${String(e)}`, 'error');
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

function previewText(text: string): string {
	const oneline = text.replace(/\s+/g, ' ').trim();
	return oneline.length > 80 ? `${oneline.slice(0, 80)}…` : oneline;
}
</script>

<WidgetShell title={config.title || 'クリップボード履歴'} icon={ClipboardList} {menuItems}>
	{#if history.length === 0}
		<div class="rounded-md border border-dashed border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-2 text-xs text-[var(--ag-text-muted)]">
			<p class="mb-0.5 font-medium text-[var(--ag-text-secondary)]">履歴は空です</p>
			<p>テキストをコピーすると ここに溜まり、クリックで再コピーできます。</p>
		</div>
	{:else}
		<ul class="space-y-1">
			{#each history as entry (entry.id)}
				<li class="group flex items-center gap-1">
					<button
						type="button"
						class="min-w-0 flex-1 rounded-md px-2 py-1 text-left text-xs hover:bg-[var(--ag-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
						aria-label="クリップボードに再コピー"
						onclick={() => void copyEntry(entry)}
					>
						<span class="block truncate text-[var(--ag-text-primary)]">{previewText(entry.text)}</span>
					</button>
					<button
						type="button"
						class="rounded p-0.5 text-[var(--ag-text-muted)] opacity-0 hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:opacity-100 group-hover:opacity-100"
						aria-label="履歴から削除"
						onclick={() => deleteEntry(entry.id)}
					>
						<X class="h-3 w-3" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog {widget} open={settingsOpen} onClose={() => (settingsOpen = false)} />
{/if}
