<script lang="ts">
/**
 * PH-issue-026 (Issue 23): ProjectsSettings polish — 共通 Switch / clamp / placeholder 統一。
 * PH-issue-039 / 検収項目 #12, #13: 名称「フォルダ監視」+ Clear button 追加。
 * 4/30 user 検収: ExeFolderSettings と **項目順を統一**。フォルダ監視 / EXE フォルダ監視
 * 似た機能は似た UI に。順序: 監視対象 → スキャン挙動 → 表示パラメータ → タイトル → 説明。
 */
import Switch from '$lib/components/common/Switch.svelte';
import FolderPickerField from '../_shared/FolderPickerField.svelte';

const DESCRIPTION_MAX = 120;

interface Props {
	config: {
		max_items?: number;
		git_poll_interval_sec?: number;
		title?: string;
		description?: string;
		watched_folder?: string;
		auto_add?: boolean;
	};
}

let { config = $bindable() }: Props = $props();

let maxItems = $derived(config.max_items ?? 10);
let gitPollInterval = $derived(config.git_poll_interval_sec ?? 60);
let wsTitle = $derived(config.title ?? '');
let wsDescription = $derived(config.description ?? '');
let watchedFolder = $derived(config.watched_folder ?? '');
let autoAdd = $derived(config.auto_add ?? false);
</script>

<!-- 1. 監視対象フォルダ (主要設定、最初に置く、ExeFolderSettings と同位置) -->
<FolderPickerField
	value={watchedFolder}
	onChange={(v) => {
		config = { ...config, watched_folder: v };
	}}
	label="監視フォルダ"
	pickerTitle="監視対象フォルダを選択"
	id="ws-watched-folder"
/>

<!-- 2. スキャン挙動: 配下自動追加 (ExeFolder の scan_depth 相当の挙動 toggle) -->
<div class="flex items-center justify-between gap-3 text-sm">
	<span class="text-[var(--ag-text-primary)]">配下フォルダの自動追加</span>
	<Switch
		checked={autoAdd}
		onChange={(v) => {
			config = { ...config, auto_add: v };
		}}
		aria-label="配下フォルダを自動的に追加する"
	/>
</div>

<!-- 3. 表示パラメータ -->
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-max-items">表示件数 (1〜100)</label>
	<input
		id="ws-max-items"
		type="number"
		min="1"
		max="100"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={maxItems}
		onchange={(e) => {
			config = {
				...config,
				max_items: Math.max(1, Math.min(100, Number((e.currentTarget as HTMLInputElement).value) || 10)),
			};
		}}
	/>
</div>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-git-poll">Git ポーリング間隔（秒、10〜600）</label>
	<input
		id="ws-git-poll"
		type="number"
		min="10"
		max="600"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={gitPollInterval}
		onchange={(e) => {
			config = {
				...config,
				git_poll_interval_sec: Math.max(10, Math.min(600, Number((e.currentTarget as HTMLInputElement).value) || 60)),
			};
		}}
	/>
</div>

<!-- 4. タイトル + 説明 (ExeFolderSettings と同順) -->
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-title">タイトル</label>
	<input
		id="ws-title"
		type="text"
		autocomplete="off"
		placeholder="フォルダ監視"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={wsTitle}
		oninput={(e) => {
			config = { ...config, title: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>

<div class="space-y-1">
	<div class="flex items-center justify-between">
		<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-description">説明 (任意)</label>
		<span
			class="text-xs tabular-nums {wsDescription.length >= DESCRIPTION_MAX
				? 'text-[var(--ag-error-text)]'
				: wsDescription.length >= DESCRIPTION_MAX - 20
					? 'text-[var(--ag-warm-text)]'
					: 'text-[var(--ag-text-muted)]'}"
		>{wsDescription.length}/{DESCRIPTION_MAX}</span>
	</div>
	<input
		id="ws-description"
		type="text"
		autocomplete="off"
		placeholder="このウィジェットの目的"
		maxlength={DESCRIPTION_MAX}
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={wsDescription}
		oninput={(e) => {
			config = { ...config, description: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>
