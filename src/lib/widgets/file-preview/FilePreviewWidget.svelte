<script lang="ts">
import { FileText, RefreshCw, Settings } from '@lucide/svelte';
import { invoke } from '@tauri-apps/api/core';
import Chip from '$lib/components/arcagate/common/Chip.svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import WidgetSettingsDialog from '$lib/components/arcagate/workspace/WidgetSettingsDialog.svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import ErrorState from '$lib/components/common/ErrorState.svelte';
import LoadingState from '$lib/components/common/LoadingState.svelte';
import { t } from '$lib/i18n.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';
import { getErrorMessage } from '$lib/utils/format-error';
import { parseFrontmatterPairs } from '$lib/utils/frontmatter';
import { formatDate as formatLocaleDate, formatNumber } from '$lib/utils/intl-formatter.svelte';
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
	return formatLocaleDate(new Date(secs * 1000));
}

// audit batch (2026-05-13) #2.6: ダブルクリックで OS default text editor で開く。
async function handleDblClick(): Promise<void> {
	if (!config.path) return;
	try {
		await invoke('cmd_open_path', { path: config.path });
	} catch (e) {
		toastStore.add(t('toast.file_open_failed', { error: getErrorMessage(e) }), 'error');
	}
}

// K-12 (2026-05-16 user 検収): 全 widget 共通の「右上 = 歯車 (= settings)」 統一に合わせ
// 再読み込み icon を **歯車 の左** に配置。 WidgetShell が menuItems を inline icon 並び
// で render するので、 配列順 [refresh, settings] でそのまま左→右の見た目になる。
let menuItems = $derived([
	{
		label: t('widgets.file_preview.reload'),
		icon: RefreshCw,
		onclick: (): void => {
			void load();
		},
	},
	...widgetMenuItems(widget, () => (settingsOpen = true)),
]);

// K-9 (2026-05-16 user 検収): frontmatter を Obsidian Properties 風の key-value 表示に
// (Obsidian Properties は key を muted label 左寄せ / value を通常 text、 input field 風
// の border / bg は出さない)。 raw YAML 文字列を行単位 split → "key: value" を分解。
// パース失敗行 (multi-line value / array literal 等) は無視 (best-effort: 単純な
// scalar value のみ表示、 非対応は frontmatter raw として fallback 表示)。
let frontmatterPairs = $derived(preview ? parseFrontmatterPairs(preview.frontmatter) : []);

let displayTitle = $derived(
	preview?.name ?? config.path.split(/[\\/]/).pop() ?? t('widgets.file_preview.default_name'),
);
</script>

<!-- Fix A (2026-05-12): config.path を WidgetShell に渡し、 body 右クリック menu で
     「パスをコピー / Explorer で開く」 を有効化。 -->
<WidgetShell title={displayTitle} icon={FileText} {menuItems} path={config.path}>
	{#if !config.path}
		<EmptyState
			icon={FileText}
			title={t('widgets.file_preview.empty_title')}
			description={t('widgets.file_preview.empty_desc')}
			action={{
				label: t('widgets.settings.open_button'),
				icon: Settings,
				onClick: () => (settingsOpen = true),
			}}
			testId="file-preview-empty-state"
		/>
	{:else if loading}
		<LoadingState description={t('widgets.file_preview.loading')} testId="file-preview-loading-state" />
	{:else if error}
		<ErrorState
			title={t('widgets.common.load_failed')}
			description={error}
			testId="file-preview-error-state"
		/>
	{:else if preview}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="space-y-2 text-xs"
			ondblclick={() => void handleDblClick()}
			title={t('widgets.dblclick_open_hint')}
		>
			<!-- メタデータ row。
			     audit batch (2026-05-13) #2.9: 「更新」 「作成」 timestamp を 1 行にまとめて固定セット化、
			     widget が狭くても folded されにくく、 視認性安定。 -->
			<div class="flex flex-wrap gap-x-3 gap-y-1 text-[var(--ag-text-muted)]">
				<span><strong class="text-[var(--ag-text-secondary)]">{t('widgets.file_preview.meta_size')}</strong> {formatBytes(preview.sizeBytes)}</span>
				{#if preview.charCount !== null}
					<span><strong class="text-[var(--ag-text-secondary)]">{t('widgets.file_preview.meta_chars')}</strong> {formatNumber(preview.charCount)}</span>
				{/if}
			</div>
			<div class="flex flex-wrap gap-x-3 gap-y-1 text-[var(--ag-text-muted)]">
				<span><strong class="text-[var(--ag-text-secondary)]">{t('widgets.file_preview.meta_modified')}</strong> {formatDate(preview.modifiedAtUnix)}</span>
				{#if preview.createdAtUnix}
					<span><strong class="text-[var(--ag-text-secondary)]">{t('widgets.file_preview.meta_created')}</strong> {formatDate(preview.createdAtUnix)}</span>
				{/if}
			</div>

			<!-- K-9 (2026-05-16 user 検収): frontmatter を Obsidian Properties 風の
			     key-value 表示に。 旧 `<pre class="border bg-surface-2">` は「入力欄っぽい
			     見た目」 で user 違和感、 Obsidian Properties 仕様: key を muted label
			     (左) / value を通常 text (右)、 border / 入力欄 bg 無し、 軽い区切りのみ。
			     非対応な multi-line value / array 等は raw YAML を fallback で表示。 -->
			{#if preview.frontmatter}
				<div class="space-y-0.5">
					{#if frontmatterPairs.length > 0}
						{#each frontmatterPairs as p (p.key)}
							<div class="flex items-baseline gap-3 text-xs">
								<span class="shrink-0 min-w-[5rem] text-[var(--ag-text-muted)]">{p.key}</span>
								<span class="min-w-0 flex-1 text-[var(--ag-text-primary)] break-all">{p.value}</span>
							</div>
						{/each}
					{:else}
						<!-- parser 非対応 (multi-line / nested 等) は raw YAML を最小装飾で表示 -->
						<pre class="select-text whitespace-pre-wrap break-all font-mono text-xs text-[var(--ag-text-primary)]">{preview.frontmatter}</pre>
					{/if}
				</div>
				<!-- 軽い区切り (= 入力欄 border ではなく hairline divider) -->
				<div class="my-2 border-t border-[var(--ag-border)]"></div>
			{/if}

			<!-- 内容プレビュー。
			     K-9 (2026-05-16): user 指摘「読み取り専用 label / 注記は不要、 入力欄っぽく
			     見えないようにするだけ」 を反映。 旧「読み取り専用」 Chip + bg-surface-2 +
			     border の入力欄風表示を撤去、 prose-like な最小装飾で「読み物」 風に。
			     truncated / binary の状態 chip は維持 (= 機能上の警告は必要)。 -->
			<div>
				<div class="mb-1 flex items-center gap-2 text-xs font-medium text-[var(--ag-text-secondary)]">
					{#if preview.truncated}
						<Chip tone="warm">{t('widgets.file_preview.chip_truncated')}</Chip>
					{/if}
					{#if preview.isBinary}
						<Chip tone="default">{t('widgets.file_preview.chip_binary')}</Chip>
					{/if}
				</div>
				{#if preview.isBinary}
					<p class="text-xs text-[var(--ag-text-muted)]">{t('widgets.file_preview.binary_message')}</p>
				{:else}
					<!-- K-9: 旧 border + bg-surface-2 の「入力欄」 style を撤去。 monospace
					     じゃなく font-content (serif 系) で「読み物」 感に統一、 装飾は
					     padding と font 設定のみ。 select-text は維持 (= テキスト選択可能)。 -->
					<pre class="select-text whitespace-pre-wrap break-words py-1 font-content text-xs text-[var(--ag-text-primary)]" data-testid="file-preview-content">{preview.content}</pre>
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
