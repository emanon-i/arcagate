<script lang="ts">
/**
 * PH-issue-024 / 検収項目 #28: Settings > Openers section.
 *
 * builtin opener (5 件、Explorer/VSCode/WT/PowerShell/Cmd) を read-only 表示 +
 * user 追加 custom opener の CRUD を提供。
 *
 * 引用元 guideline:
 * - docs/desktop_ui_ux_agent_rules.md P3 主要 vs 補助 / P4 一貫性
 * - docs/l1_requirements/ux_standards.md §6-1 Settings header / list-row
 */
import { Pencil, Plus, Trash2 } from '@lucide/svelte';
import EmptyState from '$lib/components/common/EmptyState.svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { deleteOpener, type Opener, type SaveOpenerInput, saveOpener } from '$lib/ipc/opener';
import { openersStore } from '$lib/state/openers.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { formatIpcError } from '$lib/utils/ipc-error';

let all = $state<Opener[]>([]);
let loading = $state(false);
let editing = $state<Opener | null>(null);
let isCreating = $state(false);
let formName = $state('');
let formCommand = $state('');

let builtins = $derived(all.filter((o) => o.is_builtin));
let customs = $derived(all.filter((o) => !o.is_builtin));

// audit 2026-05-13 G4: shared openersStore 経由 (CRUD 後は invalidate() で次回 fresh 取得)。
async function refresh() {
	loading = true;
	try {
		all = await openersStore.load(true);
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: 'Opener 一覧の取得' }, e), 'error');
	} finally {
		loading = false;
	}
}

$effect(() => {
	void refresh();
});

function startCreate() {
	editing = null;
	isCreating = true;
	formName = '';
	formCommand = '';
}

function startEdit(o: Opener) {
	editing = o;
	isCreating = false;
	formName = o.name;
	formCommand = o.command_template;
}

function cancelForm() {
	editing = null;
	isCreating = false;
	formName = '';
	formCommand = '';
}

async function handleSubmit(e: Event) {
	e.preventDefault();
	const trimmedName = formName.trim();
	if (!trimmedName) {
		toastStore.add(t('toast.name_required'), 'error');
		return;
	}
	if (!formCommand.includes('<path>')) {
		toastStore.add(t('settings.opener.cmd_placeholder_required'), 'error');
		return;
	}
	const input: SaveOpenerInput = {
		id: editing?.id ?? null,
		name: trimmedName,
		command_template: formCommand,
		icon_path: null,
		sort_order: editing?.sort_order ?? null,
	};
	try {
		await saveOpener(input);
		// audit G4: CRUD 後 invalidate (Codex pitfall P3 必須)、 store consumer も次回 fresh 取得。
		openersStore.invalidate();
		toastStore.add(t('toast.opener_saved', { name: trimmedName }), 'success');
		cancelForm();
		await refresh();
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: 'Opener の保存' }, e), 'error');
	}
}

async function handleDelete(o: Opener) {
	if (!confirm(t('settings.opener.delete_confirm', { name: o.name }))) return;
	try {
		await deleteOpener(o.id);
		// audit G4: CRUD 後 invalidate (Codex pitfall P3 必須)。
		openersStore.invalidate();
		toastStore.add(t('toast.opener_deleted', { name: o.name }), 'info');
		if (editing?.id === o.id) cancelForm();
		await refresh();
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: 'Opener の削除' }, e), 'error');
	}
}
</script>

<div class="space-y-4" data-testid="opener-settings">
	<div class="flex items-start justify-between gap-3">
		<div>
			<p class="text-sm font-medium text-[var(--ag-text-primary)]">
				{t('settings.opener.heading')}
			</p>
			<p class="text-xs text-[var(--ag-text-muted)]">
				{t('settings.opener.desc')}
			</p>
		</div>
		<Button
			type="button"
			variant="default"
			size="sm"
			onclick={startCreate}
			disabled={isCreating}
			data-testid="opener-add"
		>
			<Plus class="h-3.5 w-3.5" />
			{t('common.add')}
		</Button>
	</div>

	{#if loading}
		<p class="text-xs text-[var(--ag-text-muted)]">{t('common.loading')}</p>
	{:else}
		<!-- builtin (read-only) -->
		<section class="space-y-2">
			<p class="text-xs font-medium text-[var(--ag-text-secondary)]">
				{t('settings.opener.builtin_heading', { count: builtins.length })}
			</p>
			<ul class="space-y-1">
				{#each builtins as o (o.id)}
					<li
						class="flex items-center gap-3 rounded border border-[var(--ag-border)] bg-[var(--ag-surface-2)]/50 px-3 py-2"
						data-testid="opener-item-{o.id}"
					>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm text-[var(--ag-text-primary)]">{o.name}</p>
							<p class="truncate font-mono text-xs text-[var(--ag-text-muted)]">{o.command_template}</p>
						</div>
						<span class="shrink-0 rounded bg-[var(--ag-surface-3)] px-1.5 py-0.5 text-xs text-[var(--ag-text-muted)]">
							{t('settings.opener.builtin_badge')}
						</span>
					</li>
				{/each}
			</ul>
		</section>

		<!-- custom -->
		<section class="space-y-2">
			<p class="text-xs font-medium text-[var(--ag-text-secondary)]">
				{t('settings.opener.custom_heading', { count: customs.length })}
			</p>
			{#if customs.length === 0 && !isCreating}
				<EmptyState
					icon={Plus}
					title={t('settings.opener.custom_empty_title')}
					description={t('settings.opener.custom_empty_desc')}
					testId="opener-custom-empty"
				/>
			{:else}
				<ul class="space-y-1">
					{#each customs as o (o.id)}
						<li
							class="flex items-center gap-2 rounded border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2"
							data-testid="opener-item-{o.id}"
						>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm text-[var(--ag-text-primary)]">{o.name}</p>
								<p class="truncate font-mono text-xs text-[var(--ag-text-muted)]">{o.command_template}</p>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label={t('settings.opener.edit_aria', { name: o.name })}
								onclick={() => startEdit(o)}
							>
								<Pencil class="h-4 w-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								class="text-[var(--ag-text-muted)] hover:bg-destructive/10 hover:text-destructive"
								aria-label={t('settings.opener.delete_aria', { name: o.name })}
								onclick={() => void handleDelete(o)}
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}

	<!-- form (新規 or 編集) -->
	{#if isCreating || editing}
		<form
			class="space-y-2 rounded border border-[var(--ag-accent)] bg-[var(--ag-surface-2)] p-3"
			onsubmit={handleSubmit}
			data-testid="opener-form"
		>
			<p class="text-xs font-medium text-[var(--ag-text-secondary)]">
				{editing ? t('settings.opener.form_edit_heading', { name: editing.name }) : t('settings.opener.form_new_heading')}
			</p>
			<div>
				<label
					for="opener-name"
					class="mb-1 block text-xs text-[var(--ag-text-muted)]"
				>{t('settings.opener.name_label')}</label>
				<input
					id="opener-name"
					type="text"
					autocomplete="off"
					class="w-full rounded border border-[var(--ag-border)] bg-[var(--ag-surface-1)] px-2 py-1 text-sm focus-visible:border-[var(--ag-accent)] focus-visible:outline-none"
					placeholder="Cursor"
					bind:value={formName}
					required
				/>
			</div>
			<div>
				<label
					for="opener-cmd"
					class="mb-1 block text-xs text-[var(--ag-text-muted)]"
				>
					{t('settings.opener.cmd_label')} (<code class="rounded bg-[var(--ag-surface-3)] px-1">&lt;path&gt;</code> {t('settings.opener.cmd_label_suffix')})
				</label>
				<input
					id="opener-cmd"
					type="text"
					autocomplete="off"
					class="w-full rounded border border-[var(--ag-border)] bg-[var(--ag-surface-1)] px-2 py-1 font-mono text-sm focus-visible:border-[var(--ag-accent)] focus-visible:outline-none"
					placeholder={'cursor "<path>"'}
					bind:value={formCommand}
					required
				/>
			</div>
			<div class="flex items-center justify-end gap-2 pt-1">
				<Button type="button" variant="ghost" size="sm" onclick={cancelForm}>{t('common.cancel')}</Button>
				<Button type="submit" variant="default" size="sm">{t('common.save')}</Button>
			</div>
		</form>
	{/if}
</div>
