<script lang="ts">
/**
 * 5/04 user 検収 (post-redo3 #5): SnippetWidget の inline 操作対応 + 用途明示。
 *
 * user 原文:
 *   「結局スニペットウィジットてなに？設定から追加もよく分からんし、
 *    ウィジット上でスニペット増やしたり消したりできるべきでは？」
 *
 * 旧実装の問題:
 *   - 空状態 button が WidgetSettingsDialog を開くが、Settings dialog には「title」しか
 *     ないため snippet を追加できない**死んだ**導線だった。
 *   - 一覧表示時も「+」 button が無く、追加経路 0 (Settings 経由不能 = 完全に詰み)。
 *   - 各 row の delete (×) はあるが edit が無い、誤入力したら削除→再追加が必要。
 *
 * 新実装:
 *   - widget header に「+」 button を常時配置 (compose mode を toggle)。
 *   - compose mode: inline form で label + body 入力 → Save で snippet 追加 / 編集。
 *   - 各 row hover: 編集 (✎) + 削除 (×) icon 表示、Settings dialog 不要で完結。
 *   - 空状態: 用途説明 + 「+」 button (compose mode 起動)。
 *   - WidgetSettingsDialog は title など詳細管理用に残す (menu 経由)。
 *
 * 引用元 guideline:
 *   - docs/desktop_ui_ux_agent_rules.md P3 (主要 vs 補助、頻度高い操作は inline)
 *   - docs/l1_requirements/ux_standards.md §6-1 widget compact UI
 *   - CLAUDE.md「設定変えたら即見た目が変わる」
 */
import { Check, Clipboard, Pencil, Plus, X } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import { t } from '$lib/i18n.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { formatIpcError } from '$lib/utils/ipc-error';
import { widgetMenuItems } from '../_shared/menu-items';

interface Props {
	widget?: WorkspaceWidget;
}

let { widget }: Props = $props();
let settingsOpen = $state(false);

interface Snippet {
	id: string;
	label: string;
	body: string;
}

interface SnippetConfig {
	snippets?: Snippet[];
	title?: string;
}

let config = $derived.by<SnippetConfig>(() => {
	if (!widget?.config) return {};
	try {
		return JSON.parse(widget.config) as SnippetConfig;
	} catch {
		return {};
	}
});

let snippets = $derived(config.snippets ?? []);

// compose mode 状態: 'add' = 新規追加 / { id } = 編集中の snippet id / null = 一覧表示
let composeMode = $state<'add' | { editId: string } | null>(null);
let composeLabel = $state('');
let composeBody = $state('');

async function persist(next: SnippetConfig) {
	if (!widget) return;
	await workspaceStore.updateWidgetConfig(widget.id, JSON.stringify(next));
}

function startAdd() {
	composeMode = 'add';
	composeLabel = '';
	composeBody = '';
}

function startEdit(snip: Snippet) {
	composeMode = { editId: snip.id };
	composeLabel = snip.label;
	composeBody = snip.body;
}

function cancelCompose() {
	composeMode = null;
	composeLabel = '';
	composeBody = '';
}

function saveCompose() {
	const label = composeLabel.trim();
	const body = composeBody;
	if (!label || !body) {
		toastStore.add(t('toast.snippet_label_body_required'), 'error');
		return;
	}
	let next: Snippet[];
	if (composeMode === 'add') {
		const id =
			typeof crypto !== 'undefined' && 'randomUUID' in crypto
				? crypto.randomUUID()
				: `snip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		next = [...snippets, { id, label, body }];
	} else if (composeMode && 'editId' in composeMode) {
		const editId = composeMode.editId;
		next = snippets.map((s) => (s.id === editId ? { ...s, label, body } : s));
	} else {
		return;
	}
	void persist({ ...config, snippets: next });
	cancelCompose();
}

async function copySnippet(snip: Snippet) {
	try {
		await navigator.clipboard.writeText(snip.body);
		toastStore.add(t('toast.snippet_copied', { label: snip.label }), 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: t('error.op.clipboard_copy') }, e), 'error');
	}
}

function deleteSnippet(id: string) {
	const next = snippets.filter((s) => s.id !== id);
	void persist({ ...config, snippets: next });
}

let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));
</script>

<WidgetShell title={config.title || t('widgets.snippet.default_title')} icon={Clipboard} {menuItems}>
	<!-- compose mode: 新規追加 / 編集 inline form -->
	{#if composeMode}
		<div class="space-y-2">
			<input
				type="text"
				autocomplete="off"
				placeholder={t('widgets.snippet.label_placeholder')}
				class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-1 text-xs text-[var(--ag-text-primary)] focus-visible:border-[var(--ag-accent)] focus-visible:outline-none"
				bind:value={composeLabel}
			/>
			<textarea
				autocomplete="off"
				placeholder={t('widgets.snippet.body_placeholder')}
				rows="3"
				class="w-full resize-none rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-1 font-mono text-xs text-[var(--ag-text-primary)] focus-visible:border-[var(--ag-accent)] focus-visible:outline-none"
				bind:value={composeBody}
			></textarea>
			<div class="flex items-center justify-end gap-1.5">
				<button
					type="button"
					class="rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-1 text-xs text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
					onclick={cancelCompose}
				>
					{t('common.cancel')}
				</button>
				<button
					type="button"
					class="flex items-center gap-1 rounded-md border border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] px-2 py-1 text-xs text-[var(--ag-accent-text)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-accent)] hover:text-[var(--ag-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
					onclick={saveCompose}
				>
					<Check class="h-3 w-3" />
					{t('common.save')}
				</button>
			</div>
		</div>
	{:else if snippets.length === 0}
		<!-- 空状態: 用途説明 + 「+」 button (Settings ではなく compose mode 起動) -->
		<button
			type="button"
			class="flex w-full flex-col items-center justify-center gap-2 rounded-[var(--ag-radius-card)] border border-dashed border-[var(--ag-border)] py-6 text-center text-[var(--ag-text-muted)] transition-[color,background-color,border-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:border-[var(--ag-accent)] hover:bg-[var(--ag-accent-bg)]/50 hover:text-[var(--ag-accent-text)]"
			aria-label={t('widgets.snippet.add_aria')}
			onclick={startAdd}
		>
			<Plus class="h-6 w-6" />
			<span class="text-xs font-medium">{t('widgets.snippet.add_aria')}</span>
			<span class="px-3 text-xs leading-relaxed text-[var(--ag-text-faint)]">
				{t('widgets.snippet.empty_desc')}
			</span>
		</button>
	{:else}
		<!-- toolbar: 「+」 button (常時) + snippet count -->
		<div class="mb-2 flex shrink-0 items-center justify-between pb-1.5">
			<span class="text-xs text-[var(--ag-text-muted)]">{t('widgets.snippet.count', { count: snippets.length })}</span>
			<button
				type="button"
				class="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]"
				aria-label={t('widgets.snippet.add_aria')}
				title={t('widgets.snippet.add_aria')}
				onclick={startAdd}
			>
				<Plus class="h-3 w-3" />
				{t('common.add')}
			</button>
		</div>
		<ul class="space-y-1">
			{#each snippets as snip (snip.id)}
				<li class="group flex min-w-0 items-center gap-1">
					<button
						type="button"
						class="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-md px-2 py-1 text-left text-xs transition-[background-color,transform] duration-[var(--ag-duration-fast)] motion-reduce:transition-none active:scale-[0.97] hover:bg-[var(--ag-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
						aria-label={t('widgets.snippet.copy_aria', { label: snip.label })}
						title={snip.body}
						onclick={() => void copySnippet(snip)}
					>
						<span class="block w-full truncate font-medium text-[var(--ag-text-primary)]">{snip.label}</span>
						<span class="block w-full truncate text-xs text-[var(--ag-text-muted)]">{snip.body}</span>
					</button>
					<button
						type="button"
						class="shrink-0 rounded p-0.5 text-[var(--ag-text-muted)] opacity-0 transition-opacity duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:opacity-100 group-hover:opacity-100 hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]"
						aria-label={t('widgets.snippet.edit_aria', { label: snip.label })}
						title={t('common.edit')}
						onclick={() => startEdit(snip)}
					>
						<Pencil class="h-3 w-3" />
					</button>
					<button
						type="button"
						class="shrink-0 rounded p-0.5 text-[var(--ag-text-muted)] opacity-0 transition-opacity duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:opacity-100 group-hover:opacity-100 hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)]"
						aria-label={t('widgets.snippet.delete_aria', { label: snip.label })}
						title={t('common.delete')}
						onclick={() => deleteSnippet(snip.id)}
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
