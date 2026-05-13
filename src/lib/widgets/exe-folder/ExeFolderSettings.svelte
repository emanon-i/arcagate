<script lang="ts">
/**
 * ExeFolderSettings (監視フォルダ widget の設定 dialog)。
 *
 * C-15 #19: default_opener_id field 追加 (cascade で widget レベルの起動アプリ default)。
 */
import { onMount } from 'svelte';
import type { Opener } from '$lib/ipc/opener';
import { openersStore } from '$lib/state/openers.svelte';
import FolderPickerField from '../_shared/FolderPickerField.svelte';

const DESCRIPTION_MAX = 120;

interface Props {
	config: {
		watch_path?: string;
		scan_depth?: number;
		title?: string;
		description?: string;
		item_overrides?: Record<string, string>;
		default_opener_id?: string | null;
	};
}

let { config = $bindable() }: Props = $props();

let watchPath = $derived(config.watch_path ?? '');
let scanDepth = $derived(config.scan_depth ?? 2);
let exeFolderTitle = $derived(config.title ?? '');
let exeDescription = $derived(config.description ?? '');

// C-15 #19: Opener 一覧 (widget default opener select 用)。
// audit 2026-05-13 G4: shared openersStore 経由 fetch。
// Codex Round 3 fix: error 時は best-effort (空 list)。
let openers = $state<Opener[]>([]);
onMount(() => {
	openersStore
		.load()
		.then((list) => {
			openers = list;
		})
		.catch(() => {
			// best-effort: OpenerSettings 経路で error UI を出す。
		});
});
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

<!-- C-15 #19: widget レベルの起動アプリ default。 -->
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-exe-default-opener">
		デフォルト起動アプリ
	</label>
	<select
		id="ws-exe-default-opener"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={config.default_opener_id ?? ''}
		onchange={(e) => {
			const v = (e.currentTarget as HTMLSelectElement).value;
			config = { ...config, default_opener_id: v || null };
		}}
	>
		<option value="">既定 (system) / item.default_app に従う</option>
		{#each openers as op (op.id)}
			<option value={op.id}>{op.name}{op.is_builtin ? ' (組み込み)' : ''}</option>
		{/each}
	</select>
	<p class="text-xs text-[var(--ag-text-muted)]">
		この widget からの起動でこの Opener を使う。Library カード個別設定が指定されてればそちらが優先。
	</p>
</div>
