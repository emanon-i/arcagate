<script lang="ts">
import { Clipboard, Plus, X } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
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

async function persist(next: SnippetConfig) {
	if (!widget) return;
	await workspaceStore.updateWidgetConfig(widget.id, JSON.stringify(next));
}

async function copySnippet(snip: Snippet) {
	try {
		await navigator.clipboard.writeText(snip.body);
		toastStore.add(`「${snip.label}」をコピーしました`, 'success');
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: 'クリップボードへのコピー' }, e), 'error');
	}
}

function deleteSnippet(id: string) {
	const next = snippets.filter((s) => s.id !== id);
	void persist({ ...config, snippets: next });
}

let menuItems = $derived(widgetMenuItems(widget, () => (settingsOpen = true)));
</script>

<WidgetShell title={config.title || 'スニペット'} icon={Clipboard} {menuItems}>
	{#if snippets.length === 0}
		<!-- 5/03 user 検収 (D): 「snippet widget が何ができるかわからない」 fb 対応。
		     EmptyState で widget の目的と主要操作を明示、設定 dialog 直接起動 button 追加。 -->
		<button
			type="button"
			class="flex w-full flex-col items-center justify-center gap-2 rounded-[var(--ag-radius-card)] border border-dashed border-[var(--ag-border)] py-6 text-center text-[var(--ag-text-muted)] transition-[color,background-color,border-color] duration-[var(--ag-duration-fast)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:border-[var(--ag-accent)] hover:bg-[var(--ag-accent-bg)]/50 hover:text-[var(--ag-accent-text)]"
			aria-label="スニペットを追加"
			onclick={() => (settingsOpen = true)}
		>
			<Plus class="h-6 w-6" />
			<span class="text-xs font-medium">スニペットを追加</span>
			<span class="px-3 text-xs leading-relaxed text-[var(--ag-text-faint)]">
				よく使う文字列をクリックでコピー。<br />
				メールテンプレ / コマンド / コードスニペット等。
			</span>
		</button>
	{:else}
		<!-- PH-widget-polish: list-row に min-w-0 (PH-issue-016 規格)、
		     button に title 属性で長 label / body の tooltip。
		     active:scale-[0.97] で「コピーした」フィードバックを触覚的に。 -->
		<ul class="space-y-1">
			{#each snippets as snip (snip.id)}
				<li class="group flex min-w-0 items-center gap-1">
					<button
						type="button"
						class="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-md px-2 py-1 text-left text-xs transition-[background-color,transform] duration-[var(--ag-duration-fast)] motion-reduce:transition-none active:scale-[0.97] hover:bg-[var(--ag-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
						aria-label="{snip.label} をクリップボードにコピー"
						title={snip.body}
						onclick={() => void copySnippet(snip)}
					>
						<span class="block w-full truncate font-medium text-[var(--ag-text-primary)]">{snip.label}</span>
						<span class="block w-full truncate text-xs text-[var(--ag-text-muted)]">{snip.body}</span>
					</button>
					<button
						type="button"
						class="shrink-0 rounded p-0.5 text-[var(--ag-text-muted)] opacity-0 transition-opacity duration-[var(--ag-duration-fast)] motion-reduce:transition-none hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:opacity-100 group-hover:opacity-100"
						aria-label="スニペットを削除"
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
