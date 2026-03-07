<script lang="ts">
import { Play, Settings2, Trash2, X } from '@lucide/svelte';
import { ask } from '@tauri-apps/plugin-dialog';
import ActionButton from '$lib/components/arcagate/common/ActionButton.svelte';
import DetailRow from '$lib/components/arcagate/common/DetailRow.svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import MoreMenu from '$lib/components/arcagate/common/MoreMenu.svelte';
import { artMap, typeLabel } from '$lib/constants/item-type';
import { launchItem } from '$lib/ipc/launch';
import { itemStore } from '$lib/state/items.svelte';
import SensitiveControl from './SensitiveControl.svelte';

interface Props {
	selectedItemId: string | null;
	onEditItem?: (id: string) => void;
	onClose?: () => void;
}

let { selectedItemId, onEditItem, onClose }: Props = $props();

let selectedItem = $derived(itemStore.items.find((i) => i.id === selectedItemId) ?? null);

function handleLaunch() {
	if (selectedItem) {
		void launchItem(selectedItem.id);
	}
}

async function handleDelete() {
	if (!selectedItem) return;
	const confirmed = await ask(`「${selectedItem.label}」を削除しますか？`, {
		title: '削除の確認',
		kind: 'warning',
	});
	if (confirmed) {
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

<aside class="h-full border-l border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-5" data-testid="library-detail-panel">
	{#if selectedItem}
		<!-- Header -->
		<div class="mb-4 flex items-center justify-between">
			<div class="min-w-0 flex-1">
				<div class="mt-1 truncate text-lg font-semibold text-[var(--ag-text-primary)]">
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
				<button
					type="button"
					class="rounded-lg p-1 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)]"
					aria-label="パネルを閉じる"
					onclick={() => onClose?.()}
				>
					<X class="h-4 w-4" />
				</button>
			</div>
		</div>

		<!-- Gradient preview -->
		<div class="flex h-40 items-center justify-center rounded-[var(--ag-radius-widget)] bg-gradient-to-br {artMap[selectedItem.item_type]}">
			<ItemIcon iconPath={selectedItem.icon_path} alt="{selectedItem.label} icon" class="h-20 w-20 object-contain drop-shadow-lg" />
		</div>

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
		<div class="mt-4 grid grid-cols-3 gap-2">
			<ActionButton icon={Play} label="起動" onclick={handleLaunch} />
			<ActionButton icon={Settings2} label="編集" onclick={() => onEditItem?.(selectedItem!.id)} />
			<ActionButton icon={Trash2} label="削除" onclick={handleDelete} data-testid="delete-item-button" />
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
