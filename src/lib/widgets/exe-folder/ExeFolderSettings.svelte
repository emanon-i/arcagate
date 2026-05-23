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
import WidgetExcludedItemsSection from '../_shared/WidgetExcludedItemsSection.svelte';
import { DEFAULT_EXE_FOLDER_EXTENSIONS, MAX_EXE_FOLDER_SCAN_DEPTH } from './index';

const DESCRIPTION_MAX = 120;

interface Props {
	config: {
		watch_path?: string;
		scan_depth?: number;
		/** PH-CF-400: 監視拡張子 (default = ["exe","bat","cmd","ps1","sh"])。 */
		extensions?: string[];
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

// PH-CF-400: extensions の編集は text input (カンマ区切り) で行う。 normalize は
// blur / change のタイミングで実施し、 入力中の text を保持する。
let extensionsInput = $state((config.extensions ?? [...DEFAULT_EXE_FOLDER_EXTENSIONS]).join(', '));
$effect(() => {
	// config.extensions が外から変わったら input も同期 (settings 再 open 時等)。
	const current = config.extensions ?? [...DEFAULT_EXE_FOLDER_EXTENSIONS];
	const joined = current.join(', ');
	if (
		joined !==
		extensionsInput
			.replace(/\s+/g, ' ')
			.trim()
			.replace(/\s*,\s*/g, ', ')
	) {
		extensionsInput = joined;
	}
});

function normalizeExtensions(raw: string): string[] {
	return raw
		.split(',')
		.map((s) => s.trim().replace(/^\./, '').toLowerCase())
		.filter((s) => s.length > 0 && /^[a-z0-9_-]+$/.test(s));
}

function commitExtensions() {
	const next = normalizeExtensions(extensionsInput);
	const fallback = next.length > 0 ? next : [...DEFAULT_EXE_FOLDER_EXTENSIONS];
	config = { ...config, extensions: fallback };
	extensionsInput = fallback.join(', ');
}

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
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-scan-depth">{t('widgets.exe_folder.scan_depth_label', { max: String(MAX_EXE_FOLDER_SCAN_DEPTH) })}</label>
	<input
		id="ws-scan-depth"
		type="number"
		min="1"
		max={MAX_EXE_FOLDER_SCAN_DEPTH}
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={scanDepth}
		onchange={(e) => {
			const raw = Number((e.currentTarget as HTMLInputElement).value) || 2;
			config = {
				...config,
				scan_depth: Math.max(1, Math.min(MAX_EXE_FOLDER_SCAN_DEPTH, raw)),
			};
		}}
	/>
	<p class="text-xs text-[var(--ag-text-muted)]">{t('widgets.exe_folder.scan_depth_help', { max: String(MAX_EXE_FOLDER_SCAN_DEPTH) })}</p>
</div>

<!-- 2b. 監視拡張子 (PH-CF-400) -->
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-extensions">{t('widgets.exe_folder.extensions_label')}</label>
	<input
		id="ws-extensions"
		type="text"
		autocomplete="off"
		spellcheck="false"
		placeholder={t('widgets.exe_folder.extensions_placeholder')}
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		bind:value={extensionsInput}
		onblur={commitExtensions}
		onchange={commitExtensions}
	/>
	<p class="text-xs text-[var(--ag-text-muted)]">{t('widgets.exe_folder.extensions_help')}</p>
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

<!-- PH-CF-500: 除外したアイテム (widget_item_hides の当該 widget 分を一覧 + 復元)。
     widgetId は WidgetSettingsDialog が setContext した値を内部で getContext する。 -->
<WidgetExcludedItemsSection />
