<script lang="ts">
/**
 * #5: クリーン状態リセット (factory reset) ダイアログ。
 *
 * 設定 / ライブラリ / ワークスペースを段階選択 (checkbox) で初期化する。
 * 誤操作防止に「RESET」のタイプ確認を必須とする (二段確認)。対象はランタイム
 * 永続化データ (config / DB) に限定。リセット後は各 store を再読込する。
 */
import BaseDialog from '$lib/components/common/BaseDialog.svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { factoryReset } from '$lib/ipc/config';
import { configStore } from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { getErrorMessage } from '$lib/utils/format-error';

interface Props {
	open: boolean;
	onClose: () => void;
}

let { open, onClose }: Props = $props();

const CONFIRM_WORD = 'RESET';

let resetSettings = $state(false);
let resetLibrary = $state(false);
let resetWorkspace = $state(false);
let confirmText = $state('');
let running = $state(false);

let anySelected = $derived(resetSettings || resetLibrary || resetWorkspace);
let canConfirm = $derived(anySelected && confirmText.trim() === CONFIRM_WORD && !running);

function reset(): void {
	resetSettings = false;
	resetLibrary = false;
	resetWorkspace = false;
	confirmText = '';
}

// dialog を開く度に選択をクリア (前回の状態が残らない)。
$effect(() => {
	if (open) reset();
});

async function handleConfirm(): Promise<void> {
	if (!canConfirm) return;
	running = true;
	try {
		if (resetSettings) {
			await configStore.resetAllSettings();
		}
		if (resetLibrary || resetWorkspace) {
			await factoryReset(resetLibrary, resetWorkspace);
		}
		if (resetLibrary) {
			await Promise.all([
				itemStore.loadItems(),
				itemStore.loadTags(),
				itemStore.loadLibraryStats(),
				itemStore.loadTagWithCounts(),
			]);
		}
		if (resetWorkspace) {
			await workspaceStore.loadWorkspaces();
		}
		toastStore.add(t('settings.clean_reset.done'), 'success');
		onClose();
	} catch (e) {
		toastStore.add(t('settings.clean_reset.failed', { error: getErrorMessage(e) }), 'error');
	} finally {
		running = false;
	}
}
</script>

{#snippet ScopeRow(label: string, desc: string, checked: boolean, onToggle: (v: boolean) => void, testid: string)}
	<label class="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3">
		<input
			type="checkbox"
			class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--ag-accent)]"
			{checked}
			data-testid={testid}
			onchange={(e) => onToggle((e.currentTarget as HTMLInputElement).checked)}
		/>
		<span class="min-w-0">
			<span class="block text-sm font-medium text-[var(--ag-text-primary)]">{label}</span>
			<span class="block text-xs text-[var(--ag-text-muted)]">{desc}</span>
		</span>
	</label>
{/snippet}

<BaseDialog {open} {onClose} ariaLabelledby="clean-reset-title" size="md">
	<h3 id="clean-reset-title" class="mb-1 text-lg font-semibold text-[var(--ag-text-primary)]">
		{t('settings.clean_reset.title')}
	</h3>
	<p class="mb-4 text-sm text-[var(--ag-text-secondary)]">{t('settings.clean_reset.desc')}</p>

	<div class="space-y-2">
		{@render ScopeRow(
			t('settings.clean_reset.scope_settings'),
			t('settings.clean_reset.scope_settings_desc'),
			resetSettings,
			(v) => (resetSettings = v),
			'clean-reset-scope-settings',
		)}
		{@render ScopeRow(
			t('settings.clean_reset.scope_library'),
			t('settings.clean_reset.scope_library_desc'),
			resetLibrary,
			(v) => (resetLibrary = v),
			'clean-reset-scope-library',
		)}
		{@render ScopeRow(
			t('settings.clean_reset.scope_workspace'),
			t('settings.clean_reset.scope_workspace_desc'),
			resetWorkspace,
			(v) => (resetWorkspace = v),
			'clean-reset-scope-workspace',
		)}
	</div>

	<div class="mt-4 space-y-1">
		<label class="text-xs font-medium text-[var(--ag-text-secondary)]" for="clean-reset-confirm">
			{t('settings.clean_reset.confirm_hint')}
		</label>
		<input
			id="clean-reset-confirm"
			type="text"
			autocomplete="off"
			placeholder={CONFIRM_WORD}
			bind:value={confirmText}
			data-testid="clean-reset-confirm-input"
			class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]"
		/>
	</div>

	<div class="mt-5 flex items-center justify-end gap-2">
		<Button type="button" variant="outline" size="sm" onclick={onClose}>
			{t('common.cancel')}
		</Button>
		<Button
			type="button"
			variant="destructive"
			size="sm"
			disabled={!canConfirm}
			data-testid="clean-reset-confirm"
			onclick={() => void handleConfirm()}
		>
			{running ? t('settings.clean_reset.running') : t('settings.clean_reset.confirm_button')}
		</Button>
	</div>
</BaseDialog>
