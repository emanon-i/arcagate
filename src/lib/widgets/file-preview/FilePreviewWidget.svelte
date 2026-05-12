<script lang="ts">
import { FileText, RefreshCw, Settings } from '@lucide/svelte';
import { invoke } from '@tauri-apps/api/core';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { parseWidgetConfig } from '$lib/utils/widget-config';
import { widgetMenuItems } from '../_shared/menu-items';

/**
 * U-6: テキストファイル preview widget。
 *
 * config.path から `cmd_read_file_preview` で metadata + content + frontmatter 取得して表示。
 */
interface Props {
	widget?: WorkspaceWidget;
}

let { widget }: Props = $props();
let settingsOpen = $state(false);

const DEFAULTS = { path: '' };
let config = $derived(parseWidgetConfig(widget?.config, DEFAULTS));

interface FilePreview {
	name: string;
	ext: string;
	sizeBytes: number;
	charCount: number | null;
	modifiedAtUnix: number | null;
	createdAtUnix: number | null;
	content: string;
	truncated: boolean;
	isBinary: boolean;
	frontmatter: string;
}

let preview = $state<FilePreview | null>(null);
let loading = $state(false);
let error = $state<string | null>(null);

async function load(): Promise<void> {
	if (!config.path) {
		preview = null;
		error = null;
		return;
	}
	loading = true;
	error = null;
	try {
		preview = await invoke<FilePreview>('cmd_read_file_preview', { path: config.path });
	} catch (e) {
		error = String(e);
		preview = null;
	} finally {
		loading = false;
	}
}

$effect(() => {
	const _dep = config.path;
	void _dep;
	void load();
});

function formatBytes(n: number): string {
	if (n < 1000) return `${n} B`;
	const units = ['KB', 'MB', 'GB'];
	let v = n / 1000;
	let i = 0;
	while (v >= 1000 && i < units.length - 1) {
		v /= 1000;
		i += 1;
	}
	return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

function formatDate(secs: number | null): string {
	if (!secs) return '-';
	return new Date(secs * 1000).toLocaleString('ja');
}

// audit batch (2026-05-13) #2.6: ダブルクリックで OS default text editor で開く。
async function handleDblClick(): Promise<void> {
	if (!config.path) return;
	try {
		await invoke('cmd_open_path', { path: config.path });
	} catch (e) {
		toastStore.add(`ファイルを開けませんでした: ${String(e)}`, 'error');
	}
}

let menuItems = $derived([
	{
		label: '再読み込み',
		icon: RefreshCw,
		onclick: (): void => {
			void load();
		},
	},
	...widgetMenuItems(widget, () => (settingsOpen = true)),
]);

let displayTitle = $derived(preview?.name ?? config.path.split(/[\\/]/).pop() ?? 'ファイル');
</script>

<!-- Fix A (2026-05-12): config.path を WidgetShell に渡し、 body 右クリック menu で
     「パスをコピー / Explorer で開く」 を有効化。 -->
<WidgetShell title={displayTitle} icon={FileText} {menuItems} path={config.path}>
	{#if !config.path}
		<EmptyState
			icon={FileText}
			title="ファイルを設定してください"
			description="設定モーダルでファイルを選ぶか、 テキストファイルを Workspace にドラッグ&ドロップしてください。"
			action={{
				label: '設定を開く',
				icon: Settings,
				onClick: () => (settingsOpen = true),
			}}
			testId="file-preview-empty-state"
		/>
	{:else if loading}
		<p class="text-sm text-[var(--ag-text-muted)]">読み込み中...</p>
	{:else if error}
		<p class="text-sm text-[var(--ag-text-error)]">エラー: {error}</p>
	{:else if preview}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="space-y-2 text-xs"
			ondblclick={() => void handleDblClick()}
			title="ダブルクリックで OS の既定アプリで開く"
		>
			<!-- メタデータ row。
			     audit batch (2026-05-13) #2.9: 「更新」 「作成」 timestamp を 1 行にまとめて固定セット化、
			     widget が狭くても folded されにくく、 視認性安定。 -->
			<div class="flex flex-wrap gap-x-3 gap-y-1 text-[var(--ag-text-muted)]">
				<span><strong class="text-[var(--ag-text-secondary)]">サイズ</strong> {formatBytes(preview.sizeBytes)}</span>
				{#if preview.charCount !== null}
					<span><strong class="text-[var(--ag-text-secondary)]">文字数</strong> {preview.charCount.toLocaleString()}</span>
				{/if}
			</div>
			<div class="flex flex-wrap gap-x-3 gap-y-1 text-[var(--ag-text-muted)]">
				<span><strong class="text-[var(--ag-text-secondary)]">更新</strong> {formatDate(preview.modifiedAtUnix)}</span>
				{#if preview.createdAtUnix}
					<span><strong class="text-[var(--ag-text-secondary)]">作成</strong> {formatDate(preview.createdAtUnix)}</span>
				{/if}
			</div>

			<!-- Markdown frontmatter (任意)。
			     audit batch (2026-05-13) #2.2 / #2.3: frontmatter は backend で content から
			     strip 済 (二重表示防止)。 ここでは raw YAML のみ表示、 select-text 許可。 -->
			{#if preview.frontmatter}
				<div>
					<div class="mb-1 text-xs font-medium text-[var(--ag-text-secondary)]">フロントマター</div>
					<pre class="select-text whitespace-pre-wrap break-all rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-1 text-xs text-[var(--ag-text-primary)]">{preview.frontmatter}</pre>
				</div>
			{/if}

			<!-- 内容プレビュー。
			     audit batch (2026-05-13) #2.7: read-only affordance を明示するため
			     「読み取り専用」 badge を header に追加 (編集できそうな見た目を回避)。
			     #2.8: select-text class でテキスト選択を明示許可 (一部 OS で pre が user-select:none) -->
			<div>
				<div class="mb-1 flex items-center gap-2 text-xs font-medium text-[var(--ag-text-secondary)]">
					<span>内容</span>
					<span class="rounded-full border border-[var(--ag-border)] px-1.5 py-0.5 text-xs text-[var(--ag-text-muted)]">読み取り専用</span>
					{#if preview.truncated}
						<span class="rounded-full border border-[var(--ag-border)] px-1.5 py-0.5 text-xs text-[var(--ag-text-muted)]">先頭 256KB のみ</span>
					{/if}
					{#if preview.isBinary}
						<span class="rounded-full border border-[var(--ag-border)] px-1.5 py-0.5 text-xs text-[var(--ag-text-muted)]">バイナリ</span>
					{/if}
				</div>
				{#if preview.isBinary}
					<p class="text-xs text-[var(--ag-text-muted)]">バイナリファイルのため表示できません。</p>
				{:else}
					<pre class="select-text whitespace-pre-wrap break-words rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-1.5 text-xs text-[var(--ag-text-primary)]" data-testid="file-preview-content">{preview.content}</pre>
				{/if}
			</div>
		</div>
	{/if}
</WidgetShell>

{#if widget}
	<WidgetSettingsDialog
		{widget}
		open={settingsOpen}
		onClose={() => {
			settingsOpen = false;
		}}
	/>
{/if}
