<script lang="ts">
import { FolderOpen, Play, Settings2, Star, Trash2, X as XIcon } from '@lucide/svelte';
import { ask, open } from '@tauri-apps/plugin-dialog';
import ActionButton from '$lib/components/arcagate/common/ActionButton.svelte';
import DetailRow from '$lib/components/arcagate/common/DetailRow.svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import MoreMenu from '$lib/components/arcagate/common/MoreMenu.svelte';
import { artMap, typeLabel } from '$lib/constants/item-type';
import { getItemTags } from '$lib/ipc/items';
import { launchItem } from '$lib/ipc/launch';
import { itemStore } from '$lib/state/items.svelte';
import type { Tag } from '$lib/types/tag';

interface Props {
	selectedItemId: string | null;
	onEditItem?: (id: string) => void;
	onClose?: () => void;
}

let { selectedItemId, onEditItem, onClose }: Props = $props();

let selectedItem = $derived(itemStore.items.find((i) => i.id === selectedItemId) ?? null);

// タグ状態管理
let itemTags = $state<Tag[]>([]);

$effect(() => {
	const id = selectedItemId;
	if (id) {
		getItemTags(id).then((tags) => {
			itemTags = tags;
		});
	} else {
		itemTags = [];
	}
});

const SYS_STARRED_ID = 'sys-starred';

// スター状態
let isStarred = $derived(itemTags.some((t) => t.id === SYS_STARRED_ID));

// 非システムタグの一覧（追加候補）
let availableTags = $derived.by(() => {
	const assignedIds = new Set(itemTags.map((t) => t.id));
	return itemStore.tagWithCounts.filter((t) => !t.is_system && !assignedIds.has(t.id));
});

async function handleAddTag(tagId: string) {
	if (!selectedItem) return;
	const currentIds = itemTags.map((t) => t.id);
	await itemStore.updateItem(selectedItem.id, { tag_ids: [...currentIds, tagId] });
	itemTags = await getItemTags(selectedItem.id);
}

async function handleRemoveTag(tagId: string) {
	if (!selectedItem) return;
	const currentIds = itemTags.filter((t) => t.id !== tagId).map((t) => t.id);
	await itemStore.updateItem(selectedItem.id, { tag_ids: currentIds });
	itemTags = await getItemTags(selectedItem.id);
}

async function handleToggleStar() {
	if (isStarred) {
		await handleRemoveTag(SYS_STARRED_ID);
	} else {
		await handleAddTag(SYS_STARRED_ID);
	}
}

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
		tag_ids: [],
		is_tracked: selectedItem.is_tracked,
	});
}

function handleExportItem() {
	if (!selectedItem) return;
	const json = JSON.stringify(selectedItem, null, 2);
	void navigator.clipboard.writeText(json);
}

async function handlePickDefaultApp() {
	if (!selectedItem) return;
	const selected = await open({
		multiple: false,
		filters: [{ name: 'Executable', extensions: ['exe'] }],
	});
	if (selected) {
		void itemStore.updateItem(selectedItem.id, { default_app: selected as string });
	}
}

let moreMenuItems = $derived.by(() => {
	if (!selectedItem) return [];
	return [
		{ label: '複製', onclick: handleDuplicate },
		{ label: 'JSONコピー', onclick: handleExportItem },
	];
});

// タグ追加ドロップダウンの表示制御
let showTagSelect = $state(false);
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') onClose?.(); }} />

<aside class="h-full border-l border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-5" data-testid="library-detail-panel">
	{#if selectedItem}
		<!-- Header -->
		<div class="mb-4 flex items-center justify-between gap-2">
			<div class="min-w-0 flex-1">
				<div class="truncate text-lg font-semibold text-[var(--ag-text-primary)]" title={selectedItem.label}>
					{selectedItem.label}
				</div>
			</div>
			<div class="flex shrink-0 items-center gap-2">
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
					<XIcon class="h-4 w-4" />
				</button>
			</div>
		</div>

		<!-- Gradient preview -->
		<div class="flex h-40 items-center justify-center rounded-[var(--ag-radius-widget)] bg-gradient-to-br {artMap[selectedItem.item_type]}">
			<ItemIcon iconPath={selectedItem.icon_path} alt="{selectedItem.label} icon" class="h-20 w-20 object-cover drop-shadow-lg" />
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
		</div>

		<!-- Tags section (S-3-5, S-3-6) -->
		<div class="mt-4 space-y-2">
			<div class="text-xs font-medium text-[var(--ag-text-muted)]">タグ</div>
			<div class="flex flex-wrap gap-1.5">
				{#each itemTags.filter((t) => !t.is_system) as tag (tag.id)}
					<span class="inline-flex items-center gap-1 rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2.5 py-1 text-xs text-[var(--ag-text-secondary)]">
						{tag.name}
						<button
							type="button"
							class="ml-0.5 rounded-full p-0.5 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-4)] hover:text-[var(--ag-text-primary)]"
							aria-label="タグ {tag.name} を解除"
							onclick={() => void handleRemoveTag(tag.id)}
						>
							<XIcon class="h-3 w-3" />
						</button>
					</span>
				{/each}
				{#if itemTags.filter((t) => !t.is_system).length === 0}
					<span class="text-xs text-[var(--ag-text-muted)]">タグなし</span>
				{/if}
			</div>
			{#if availableTags.length > 0}
				<div class="relative">
					<button
						type="button"
						class="rounded-full border border-dashed border-[var(--ag-border)] px-2.5 py-1 text-xs text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-3)]"
						onclick={() => (showTagSelect = !showTagSelect)}
					>
						+ タグを追加
					</button>
					{#if showTagSelect}
						<div class="absolute left-0 top-full z-10 mt-1 max-h-32 overflow-y-auto rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] p-1 shadow-lg">
							{#each availableTags as tag (tag.id)}
								<button
									type="button"
									class="block w-full rounded-md px-3 py-1.5 text-left text-xs text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)]"
									onclick={() => { void handleAddTag(tag.id); showTagSelect = false; }}
								>
									{tag.name}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Default app for folders (S-3-7) -->
		{#if selectedItem.item_type === 'folder'}
			<div class="mt-4 space-y-2 text-sm">
				<DetailRow label="デフォルトアプリ" value={selectedItem.default_app || 'Explorer（既定）'} />
				<button
					type="button"
					class="flex items-center gap-2 rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-2 text-xs text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]"
					onclick={() => void handlePickDefaultApp()}
				>
					<FolderOpen class="h-3.5 w-3.5" />
					exe を選択
				</button>
			</div>
		{/if}

		<!-- Action buttons -->
		<div class="mt-4 grid grid-cols-4 gap-2">
			<ActionButton icon={Play} label="起動" onclick={handleLaunch} />
			<ActionButton icon={Settings2} label="編集" onclick={() => onEditItem?.(selectedItem!.id)} />
			<button
				type="button"
				aria-label={isStarred ? 'スターを外す' : 'スターを付ける'}
				class="flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm transition-colors
					{isStarred
					? 'border-[var(--ag-accent)]/60 bg-[var(--ag-accent)]/15 text-[var(--ag-accent)] hover:bg-[var(--ag-accent)]/25'
					: 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
				onclick={handleToggleStar}
			>
				<Star class="h-4 w-4 {isStarred ? 'fill-current' : ''}" />
				{isStarred ? '★' : '☆'}
			</button>
			<button
				type="button"
				class="flex items-center justify-center gap-2 rounded-2xl border border-destructive/50 bg-destructive/10 px-3 py-3 text-sm text-destructive hover:bg-destructive/20"
				onclick={handleDelete}
				data-testid="delete-item-button"
			>
				<Trash2 class="h-4 w-4" />
				削除
			</button>
		</div>

	{:else}
		<!-- Placeholder -->
		<div class="flex h-full items-center justify-center">
			<p class="text-sm text-[var(--ag-text-muted)]">アイテムを選択してください</p>
		</div>
	{/if}
</aside>
