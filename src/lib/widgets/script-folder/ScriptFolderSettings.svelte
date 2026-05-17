<script lang="ts">
/**
 * #11: スクリプト監視 widget の設定 dialog。
 * 監視フォルダ / スキャン深さ / タイトル / 説明 / 実行前確認トグル。
 */
import { t } from '$lib/i18n.svelte';
import FolderPickerField from '../_shared/FolderPickerField.svelte';

const DESCRIPTION_MAX = 120;

interface Props {
	config: {
		watch_path?: string;
		scan_depth?: number;
		title?: string;
		description?: string;
		/** 実行前に確認ダイアログを出すか。default true (security gate)。 */
		confirm_before_run?: boolean;
	};
}

let { config = $bindable() }: Props = $props();

let watchPath = $derived(config.watch_path ?? '');
let scanDepth = $derived(config.scan_depth ?? 2);
let scriptTitle = $derived(config.title ?? '');
let scriptDescription = $derived(config.description ?? '');
let confirmBeforeRun = $derived(config.confirm_before_run ?? true);
</script>

<!-- 1. 監視フォルダ -->
<FolderPickerField
	value={watchPath}
	onChange={(v) => {
		config = { ...config, watch_path: v };
	}}
	id="ws-script-watch-path"
	allowManualInput={true}
/>

<!-- 2. スキャン深さ -->
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-script-scan-depth">{t('widgets.exe_folder.scan_depth_label')}</label>
	<input
		id="ws-script-scan-depth"
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

<!-- 3. タイトル -->
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-script-title">{t('widgets.common.title_label')}</label>
	<input
		id="ws-script-title"
		type="text"
		autocomplete="off"
		placeholder={t('widgets.widget_label.script_folder')}
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={scriptTitle}
		oninput={(e) => {
			config = { ...config, title: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>

<!-- 4. 説明 -->
<div class="space-y-1">
	<div class="flex items-center justify-between">
		<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-script-description">{t('widgets.common.description_optional_label')}</label>
		<span
			class="text-xs tabular-nums {scriptDescription.length >= DESCRIPTION_MAX
				? 'text-[var(--ag-error-text)]'
				: 'text-[var(--ag-text-muted)]'}"
		>{scriptDescription.length}/{DESCRIPTION_MAX}</span>
	</div>
	<input
		id="ws-script-description"
		type="text"
		autocomplete="off"
		placeholder={t('widgets.common.description_placeholder')}
		maxlength={DESCRIPTION_MAX}
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={scriptDescription}
		oninput={(e) => {
			config = { ...config, description: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>

<!-- 5. 実行前確認トグル (security gate、default ON) -->
<div class="space-y-1">
	<label class="flex cursor-pointer items-center justify-between gap-3 text-sm">
		<span class="font-medium text-[var(--ag-text-primary)]">{t('widgets.script_folder.confirm_label')}</span>
		<input
			type="checkbox"
			class="h-4 w-4 cursor-pointer accent-[var(--ag-accent)]"
			checked={confirmBeforeRun}
			onchange={(e) => {
				config = { ...config, confirm_before_run: (e.currentTarget as HTMLInputElement).checked };
			}}
		/>
	</label>
	<p class="text-xs text-[var(--ag-text-muted)]">{t('widgets.script_folder.confirm_desc')}</p>
</div>
