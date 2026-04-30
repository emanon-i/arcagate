<script lang="ts">
/**
 * PH-issue-026 (Issue 23): ExeFolderSettings polish — folder picker を shadcn Button に統一。
 * PH-issue-039 / 検収項目 #13 + #15: Clear button + description (120 文字制限) を Projects と統一。
 * 4/30 user 検収: ProjectsSettings と **項目順を統一** + FolderPickerField 共通化。
 * 順序: 監視フォルダ → スキャン挙動 → タイトル → 説明 (Projects と同形)。
 */
import FolderPickerField from '../_shared/FolderPickerField.svelte';

const DESCRIPTION_MAX = 120;

interface Props {
	config: {
		watch_path?: string;
		scan_depth?: number;
		title?: string;
		description?: string;
		item_overrides?: Record<string, string>;
	};
}

let { config = $bindable() }: Props = $props();

let watchPath = $derived(config.watch_path ?? '');
let scanDepth = $derived(config.scan_depth ?? 2);
let exeFolderTitle = $derived(config.title ?? '');
let exeDescription = $derived(config.description ?? '');
</script>

<!-- 1. 監視フォルダ (Projects と同位置 / 同 component) -->
<FolderPickerField
	value={watchPath}
	onChange={(v) => {
		config = { ...config, watch_path: v };
	}}
	label="監視フォルダ"
	pickerTitle="監視するフォルダを選択"
	id="ws-watch-path"
	allowManualInput={true}
/>

<!-- 2. スキャン挙動 -->
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-scan-depth">スキャン階層 (1〜3)</label>
	<input
		id="ws-scan-depth"
		type="number"
		min="1"
		max="3"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={scanDepth}
		onchange={(e) => {
			config = {
				...config,
				scan_depth: Math.max(1, Math.min(3, Number((e.currentTarget as HTMLInputElement).value) || 2)),
			};
		}}
	/>
</div>

<!-- 3. タイトル + 説明 (Projects と同順) -->
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-exe-title">タイトル</label>
	<input
		id="ws-exe-title"
		type="text"
		autocomplete="off"
		placeholder="Exe フォルダ監視"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={exeFolderTitle}
		oninput={(e) => {
			config = { ...config, title: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>

<div class="space-y-1">
	<div class="flex items-center justify-between">
		<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-exe-description">説明 (任意)</label>
		<span
			class="text-xs tabular-nums {exeDescription.length >= DESCRIPTION_MAX
				? 'text-[var(--ag-error-text)]'
				: exeDescription.length >= DESCRIPTION_MAX - 20
					? 'text-[var(--ag-warm-text)]'
					: 'text-[var(--ag-text-muted)]'}"
		>{exeDescription.length}/{DESCRIPTION_MAX}</span>
	</div>
	<input
		id="ws-exe-description"
		type="text"
		autocomplete="off"
		placeholder="このウィジェットの目的"
		maxlength={DESCRIPTION_MAX}
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={exeDescription}
		oninput={(e) => {
			config = { ...config, description: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>
