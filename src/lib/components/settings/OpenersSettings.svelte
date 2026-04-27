<script lang="ts">
import { Plus, Save, X } from '@lucide/svelte';
import * as openerIpc from '$lib/ipc/opener';
import { toastStore } from '$lib/state/toast.svelte';
import type { Opener } from '$lib/types/opener';
import { formatIpcError } from '$lib/utils/ipc-error';

let openers = $state<Opener[]>([]);
let loading = $state(false);
let editingId = $state<string | null>(null);
let editLabel = $state('');
let editCommand = $state('');
let editArgsTemplate = $state('');

let showAddForm = $state(false);
let newLabel = $state('');
let newCommand = $state('');
let newArgsTemplate = $state('{path}');

async function load() {
	loading = true;
	try {
		openers = await openerIpc.listOpeners();
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: 'opener 一覧取得' }, e), 'error');
	} finally {
		loading = false;
	}
}

void load();

function startEdit(o: Opener) {
	editingId = o.id;
	editLabel = o.label;
	editCommand = o.command;
	editArgsTemplate = o.args_template;
}

function cancelEdit() {
	editingId = null;
}

async function saveEdit() {
	if (!editingId) return;
	try {
		await openerIpc.updateOpener(editingId, {
			label: editLabel.trim(),
			command: editCommand.trim(),
			args_template: editArgsTemplate.trim(),
		});
		toastStore.add('opener を更新しました', 'success');
		editingId = null;
		await load();
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: 'opener 更新' }, e), 'error');
	}
}

async function addNew() {
	if (!newLabel.trim() || !newCommand.trim()) {
		toastStore.add('label と command は必須です', 'error');
		return;
	}
	try {
		await openerIpc.createOpener({
			label: newLabel.trim(),
			command: newCommand.trim(),
			args_template: newArgsTemplate.trim() || '{path}',
		});
		toastStore.add('opener を追加しました', 'success');
		showAddForm = false;
		newLabel = '';
		newCommand = '';
		newArgsTemplate = '{path}';
		await load();
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: 'opener 追加' }, e), 'error');
	}
}

async function deleteOpener(o: Opener) {
	if (o.builtin) return;
	if (!confirm(`「${o.label}」を削除しますか？`)) return;
	try {
		await openerIpc.deleteOpener(o.id);
		toastStore.add('opener を削除しました', 'success');
		await load();
	} catch (e: unknown) {
		toastStore.add(formatIpcError({ operation: 'opener 削除' }, e), 'error');
	}
}
</script>

<section class="space-y-3" data-testid="openers-settings">
	<div class="flex items-center justify-between">
		<div class="min-w-0">
			<h4 class="text-sm font-medium text-[var(--ag-text-primary)]">Openers (起動方法)</h4>
			<p class="mt-0.5 text-xs text-[var(--ag-text-muted)]">
				各アイテムを「Open with」で起動する候補。builtin は削除不可、custom は自由に追加。
			</p>
		</div>
		<button
			type="button"
			class="inline-flex items-center gap-1 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-1.5 text-xs text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			data-testid="opener-add-toggle"
			onclick={() => {
				showAddForm = !showAddForm;
			}}
		>
			<Plus class="h-3 w-3" />
			追加
		</button>
	</div>

	{#if showAddForm}
		<div class="space-y-2 rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-3">
			<div class="grid grid-cols-2 gap-2">
				<label class="flex flex-col gap-1 text-xs">
					<span class="text-[var(--ag-text-secondary)]">Label</span>
					<input
						type="text"
						placeholder="例: My Editor"
						class="min-w-0 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-1)] px-2 py-1 text-xs text-[var(--ag-text-primary)]"
						bind:value={newLabel}
					/>
				</label>
				<label class="flex flex-col gap-1 text-xs">
					<span class="text-[var(--ag-text-secondary)]">Command</span>
					<input
						type="text"
						placeholder="例: code.cmd"
						class="min-w-0 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-1)] px-2 py-1 text-xs text-[var(--ag-text-primary)]"
						bind:value={newCommand}
					/>
				</label>
			</div>
			<label class="flex flex-col gap-1 text-xs">
				<span class="text-[var(--ag-text-secondary)]">Args template ({'{path}'} を埋めます)</span>
				<input
					type="text"
					placeholder={'例: "{path}"'}
					class="min-w-0 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-1)] px-2 py-1 text-xs text-[var(--ag-text-primary)]"
					bind:value={newArgsTemplate}
				/>
			</label>
			<div class="flex gap-2">
				<button
					type="button"
					class="rounded-[var(--ag-radius-input)] bg-[var(--ag-accent-bg)] px-3 py-1 text-xs text-[var(--ag-accent-text)] hover:bg-[var(--ag-accent-active-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
					data-testid="opener-add-save"
					onclick={() => void addNew()}
				>
					保存
				</button>
				<button
					type="button"
					class="rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] px-3 py-1 text-xs text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
					onclick={() => {
						showAddForm = false;
					}}
				>
					キャンセル
				</button>
			</div>
		</div>
	{/if}

	{#if loading}
		<p class="text-xs text-[var(--ag-text-muted)]">読み込み中...</p>
	{:else if openers.length === 0}
		<p class="text-xs text-[var(--ag-text-muted)]">opener がありません</p>
	{:else}
		<ul class="space-y-1">
			{#each openers as o (o.id)}
				<li class="rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-2">
					{#if editingId === o.id}
						<div class="grid grid-cols-2 gap-2">
							<input
								type="text"
								bind:value={editLabel}
								class="min-w-0 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-1)] px-2 py-1 text-xs text-[var(--ag-text-primary)]"
							/>
							<input
								type="text"
								bind:value={editCommand}
								class="min-w-0 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-1)] px-2 py-1 text-xs text-[var(--ag-text-primary)]"
							/>
						</div>
						<input
							type="text"
							bind:value={editArgsTemplate}
							class="mt-2 w-full min-w-0 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-1)] px-2 py-1 text-xs text-[var(--ag-text-primary)]"
						/>
						<div class="mt-2 flex gap-2">
							<button
								type="button"
								class="inline-flex items-center gap-1 rounded-[var(--ag-radius-input)] bg-[var(--ag-accent-bg)] px-3 py-1 text-xs text-[var(--ag-accent-text)] hover:bg-[var(--ag-accent-active-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
								onclick={() => void saveEdit()}
							>
								<Save class="h-3 w-3" />
								保存
							</button>
							<button
								type="button"
								class="rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] px-3 py-1 text-xs text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
								onclick={cancelEdit}
							>
								キャンセル
							</button>
						</div>
					{:else}
						<div class="flex items-center gap-2">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="text-sm font-medium text-[var(--ag-text-primary)]">{o.label}</span>
									{#if o.builtin}
										<span class="rounded bg-[var(--ag-surface-3)] px-1.5 py-0.5 text-[10px] text-[var(--ag-text-muted)]">
											builtin
										</span>
									{/if}
								</div>
								<div class="mt-0.5 truncate text-[10px] text-[var(--ag-text-muted)]" title="{o.command} {o.args_template}">
									{o.command} {o.args_template}
								</div>
							</div>
							<button
								type="button"
								class="rounded px-2 py-1 text-xs text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
								data-testid="opener-edit"
								onclick={() => startEdit(o)}
							>
								編集
							</button>
							{#if !o.builtin}
								<button
									type="button"
									class="rounded p-1 text-[var(--ag-text-muted)] hover:bg-destructive hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
									aria-label="{o.label} を削除"
									data-testid="opener-delete"
									onclick={() => void deleteOpener(o)}
								>
									<X class="h-3 w-3" />
								</button>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
