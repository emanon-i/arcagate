<script lang="ts">
import { Pin, Play, Settings2, Trash2 } from '@lucide/svelte';
import ActionButton from '$lib/components/arcagate/common/ActionButton.svelte';
import DetailRow from '$lib/components/arcagate/common/DetailRow.svelte';
import MoreMenu from '$lib/components/arcagate/common/MoreMenu.svelte';
import Tip from '$lib/components/arcagate/common/Tip.svelte';
import { launchItem } from '$lib/ipc/launch';
import { itemStore } from '$lib/state/items.svelte';
import type { ItemType } from '$lib/types/item';
import SensitiveControl from './SensitiveControl.svelte';

interface Props {
	selectedItemId: string | null;
	onEditItem?: (id: string) => void;
}

let { selectedItemId, onEditItem }: Props = $props();

let selectedItem = $derived(itemStore.items.find((i) => i.id === selectedItemId) ?? null);

const artMap: Record<ItemType, string> = {
	exe: 'from-violet-600 via-fuchsia-600 to-indigo-700',
	url: 'from-emerald-500 via-teal-500 to-cyan-700',
	script: 'from-cyan-500 via-sky-500 to-blue-700',
	folder: 'from-amber-500 via-orange-500 to-yellow-700',
	command: 'from-pink-500 via-rose-500 to-fuchsia-700',
};

const typeLabel: Record<ItemType, string> = {
	exe: 'Executable',
	url: 'URL',
	script: 'Script',
	folder: 'Folder',
	command: 'Command',
};

function handleLaunch() {
	if (selectedItem) {
		void launchItem(selectedItem.id);
	}
}

function handleDelete() {
	if (selectedItem) {
		void itemStore.deleteItem(selectedItem.id);
	}
}

function handleDuplicate() {
	if (!selectedItem) return;
	void itemStore.createItem({
		item_type: selectedItem.item_type,
		label: `${selectedItem.label} (コピー)`,
		target: selectedItem.target,
		args: selectedItem.args,
		working_dir: selectedItem.working_dir,
		icon_path: selectedItem.icon_path,
		aliases: [],
		category_ids: [],
		tag_ids: [],
	});
}

function handleToggleEnabled() {
	if (!selectedItem) return;
	void itemStore.updateItem(selectedItem.id, { is_enabled: !selectedItem.is_enabled });
}

function handleExportItem() {
	if (!selectedItem) return;
	const json = JSON.stringify(selectedItem, null, 2);
	void navigator.clipboard.writeText(json);
}

let moreMenuItems = $derived.by(() => {
	if (!selectedItem) return [];
	return [
		{ label: '複製', onclick: handleDuplicate },
		{ label: 'JSONコピー', onclick: handleExportItem },
		{
			label: selectedItem.is_enabled ? '無効化' : '有効化',
			onclick: handleToggleEnabled,
		},
	];
});
</script>

<aside class="border-l border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-5">
	{#if selectedItem}
		<!-- Header -->
		<div class="mb-4 flex items-center justify-between">
			<div>
				<div class="text-xs uppercase tracking-[0.18em] text-[var(--ag-text-faint)]">
					Selected item
				</div>
				<div class="mt-1 text-lg font-semibold text-[var(--ag-text-primary)]">
					{selectedItem.label}
				</div>
			</div>
			<div class="flex items-center gap-2">
				<span
					class="rounded-full border border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] px-2.5 py-1 text-[11px] text-[var(--ag-accent-text)]"
				>
					{typeLabel[selectedItem.item_type]}
				</span>
				<MoreMenu items={moreMenuItems} ariaLabel="アイテム操作メニュー" />
			</div>
		</div>

		<!-- Gradient preview -->
		<div class="h-40 rounded-[var(--ag-radius-widget)] bg-gradient-to-br {artMap[selectedItem.item_type]}"></div>

		<!-- Detail rows -->
		<div class="mt-4 space-y-2 text-sm">
			<DetailRow label="種別" value={typeLabel[selectedItem.item_type]} />
			<DetailRow label="ターゲット" value={selectedItem.target} />
			{#if selectedItem.aliases.length > 0}
				<DetailRow label="別名" value={selectedItem.aliases.join(', ')} />
			{/if}
			{#if selectedItem.args}
				<DetailRow label="引数" value={selectedItem.args} />
			{/if}
			<div class="flex items-center justify-between rounded-2xl bg-[var(--ag-surface-3)] px-3 py-2.5">
				<span class="text-[var(--ag-text-muted)]">状態</span>
				<button
					type="button"
					class="rounded-full border px-2 py-1 text-[11px] transition-colors {selectedItem.is_enabled
						? 'border-[var(--ag-success-border)] bg-[var(--ag-success-bg)] text-[var(--ag-success-text)]'
						: 'border-[var(--ag-warm-border)] bg-[var(--ag-warm-bg)] text-[var(--ag-warm-text)]'}"
					onclick={handleToggleEnabled}
				>
					{selectedItem.is_enabled ? '有効' : '無効'}
				</button>
			</div>
		</div>

		<!-- Action buttons -->
		<div class="mt-4 grid grid-cols-2 gap-2">
			<ActionButton icon={Play} label="起動" onclick={handleLaunch} />
			<ActionButton icon={Pin} label="Workspaceに追加" />
			<ActionButton icon={Settings2} label="編集" onclick={() => onEditItem?.(selectedItem!.id)} />
			<ActionButton icon={Trash2} label="削除" onclick={handleDelete} data-testid="delete-item-button" />
		</div>

		<!-- Tip -->
		<div class="mt-4">
			<Tip tipId="library-detail-workspace-tip">
				Workspace に追加しても複製は作られません。編集は Library 側で行います。
			</Tip>
		</div>

		<!-- Sensitive control -->
		<div class="mt-4">
			<SensitiveControl />
		</div>
	{:else}
		<!-- Placeholder -->
		<div class="flex h-full items-center justify-center">
			<p class="text-sm text-[var(--ag-text-muted)]">アイテムを選択してください</p>
		</div>
	{/if}
</aside>
