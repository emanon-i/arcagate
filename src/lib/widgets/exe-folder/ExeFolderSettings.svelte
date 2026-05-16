<script lang="ts">
/**
 * ExeFolderSettings (監視フォルダ widget の設定 dialog)。
 *
 * C-15 #19: default_opener_id field 追加 (cascade で widget レベルの起動アプリ default)。
 */
import { onMount } from 'svelte';
import { t } from '$lib/i18n.svelte';
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
	id="ws-watch-path"
	allowManualInput={true}
/>

<!-- 2. スキャン挙動 -->
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-scan-depth">{t('widgets.exe_folder.scan_depth_label')}</label>
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
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-exe-title">{t('widgets.common.title_label')}</label>
	<input
		id="ws-exe-title"
		type="text"
		autocomplete="off"
		placeholder={t('widgets.widget_label.exe_folder')}
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={exeFolderTitle}
		oninput={(e) => {
			config = { ...config, title: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>

<div class="space-y-1">
	<div class="flex items-center justify-between">
		<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-exe-description">{t('widgets.common.description_optional_label')}</label>
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
		placeholder={t('widgets.common.description_placeholder')}
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
		{t('widgets.common.default_opener_label')}
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
		<option value="">{t('widgets.common.default_opener_system')}</option>
		{#each openers as op (op.id)}
			<option value={op.id}>{op.name}{op.is_builtin ? t('widgets.common.builtin_suffix') : ''}</option>
		{/each}
	</select>
	<p class="text-xs text-[var(--ag-text-muted)]">
		{t('widgets.common.default_opener_desc')}
	</p>
</div>
