<script lang="ts">
/**
 * ProjectsSettings (フォルダ監視 widget の設定 dialog)。
 *
 * PH-CF-500:
 *  - D2: auto_add / max_items / git_poll_interval_sec を撤廃 (監視 = 常時自動)
 *  - D3: ExeFolderSettings と項目順 / spacing を統一
 *  - D4: default_opener_id select を追加 (exe_folder と同 cascade)
 *  - 除外アイテム復元 UI を section として追加 (widget_item_hides 連動)
 */
import { onMount } from 'svelte';
import { t } from '$lib/i18n.svelte';
import type { Opener } from '$lib/ipc/opener';
import { openersStore } from '$lib/state/openers.svelte';
import FolderPickerField from '../_shared/FolderPickerField.svelte';
import WidgetExcludedItemsSection from '../_shared/WidgetExcludedItemsSection.svelte';

const DESCRIPTION_MAX = 120;

interface Props {
	config: {
		title?: string;
		description?: string;
		watched_folder?: string;
		default_opener_id?: string | null;
	};
}

let { config = $bindable() }: Props = $props();

let wsTitle = $derived(config.title ?? '');
let wsDescription = $derived(config.description ?? '');
let watchedFolder = $derived(config.watched_folder ?? '');

// D4: Opener 一覧 (widget default opener select 用、 exe_folder と同 pattern)。
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

<!-- 1. 監視対象フォルダ (主要設定、最初に置く、ExeFolderSettings と同位置) -->
<FolderPickerField
	value={watchedFolder}
	onChange={(v) => {
		config = { ...config, watched_folder: v };
	}}
	id="ws-watched-folder"
/>

<!-- 2. タイトル + 説明 (ExeFolderSettings と同順) -->
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-title">{t('widgets.common.title_label')}</label>
	<input
		id="ws-title"
		type="text"
		autocomplete="off"
		placeholder={t('widgets.widget_label.projects')}
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={wsTitle}
		oninput={(e) => {
			config = { ...config, title: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>

<div class="space-y-1">
	<div class="flex items-center justify-between">
		<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-description">{t('widgets.common.description_optional_label')}</label>
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
		placeholder={t('widgets.common.description_placeholder')}
		maxlength={DESCRIPTION_MAX}
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={wsDescription}
		oninput={(e) => {
			config = { ...config, description: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>

<!-- 3. PH-CF-500 D4: widget レベルの起動アプリ default。 -->
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-projects-default-opener">
		{t('widgets.common.default_opener_label')}
	</label>
	<select
		id="ws-projects-default-opener"
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

<!-- 4. PH-CF-500: 除外したアイテム (widget_item_hides の当該 widget 分を一覧 + 復元)。
     widgetId は WidgetSettingsDialog が setContext した値を内部で getContext する。 -->
<WidgetExcludedItemsSection />
