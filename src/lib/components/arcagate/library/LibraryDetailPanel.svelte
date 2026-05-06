<script lang="ts">
import { ask, open } from '@tauri-apps/plugin-dialog';
import LibraryItemTagSection from '$lib/components/arcagate/library/LibraryItemTagSection.svelte';
import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
import { countItemReferences, getItemTags } from '$lib/ipc/items';
import { launchItem } from '$lib/ipc/launch';
import { configStore } from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { libraryHistory } from '$lib/state/library-history.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { Tag } from '$lib/types/tag';
import { formatLaunchError } from '$lib/utils/launch-error';
import LibraryDetailActions from './LibraryDetailActions.svelte';
import LibraryDetailHeader from './LibraryDetailHeader.svelte';
import LibraryDetailMetadata from './LibraryDetailMetadata.svelte';

/**
 * Library detail panel facade。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、371 LOC を facade + 3 sub に分割)
 *
 * 子 component:
 * - LibraryDetailHeader (title + type badge + MoreMenu + close)
 * - LibraryDetailMetadata (gradient + DetailRows + visibility + card override)
 * - LibraryDetailActions (4 buttons + default app picker)
 * - LibraryItemTagSection (既存、tag 操作)
 *
 * agent judgment: a3-frontend-shape.md §3.1 は LibraryDetailTags も提案するが、
 * 既存 LibraryItemTagSection と責務重複するため新設せず既存を直接利用 (scope 簡素化)。
 *
 * 本 facade は state orchestration:
 * - selectedItem $derived
 * - itemTags + isStarred + availableTags
 * - Tag handlers / Action handlers / card override / ConfirmDialog
 * - svelte:window keyboard (Enter で launch)
 */
interface Props {
	selectedItemId: string | null;
	onEditItem?: (id: string) => void;
	onClose?: () => void;
}

let { selectedItemId, onEditItem, onClose }: Props = $props();

let selectedItem = $derived(itemStore.items.find((i) => i.id === selectedItemId) ?? null);

// タグ状態管理
let itemTags = $state<Tag[]>([]);
let resetConfirmOpen = $state(false);

// request token: selectedItemId 切替時に古いレスポンスで上書きしないため
let tagRequestId = 0;

$effect(() => {
	const id = selectedItemId;
	if (!id) {
		itemTags = [];
		return;
	}
	const myId = ++tagRequestId;
	getItemTags(id)
		.then((tags) => {
			if (myId === tagRequestId) itemTags = tags;
		})
		.catch(() => {
			if (myId === tagRequestId) itemTags = [];
		});
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
	if (!selectedItem) return;
	await itemStore.toggleStar(selectedItem.id, !isStarred);
	itemTags = await getItemTags(selectedItem.id);
}

function handleLaunch() {
	if (!selectedItem) return;
	const label = selectedItem.label;
	void launchItem(selectedItem.id)
		.then(() => toastStore.add(`${label} を起動しました`, 'success'))
		.catch((e: unknown) => toastStore.add(formatLaunchError(label, e), 'error'));
}

async function handleDelete() {
	if (!selectedItem) return;
	// PH-issue-006: widget 参照数を確認 dialog に表示 (P2 失敗前提)。
	let refCount = 0;
	try {
		refCount = await countItemReferences(selectedItem.id);
	} catch {
		// 参照数取得失敗時は確認 dialog のみ表示 (削除自体は cascade で安全)
	}
	const message =
		refCount > 0
			? `「${selectedItem.label}」を削除しますか？\n\nこのアイテムは ${refCount} 個のウィジェットで参照されています。削除するとウィジェットからも自動的に取り除かれます。`
			: `「${selectedItem.label}」を削除しますか？`;
	const confirmed = await ask(message, {
		title: '削除の確認',
		kind: 'warning',
	});
	if (confirmed) {
		// L2-B B4: snapshot を取って libraryHistory に積む → 5 秒以内なら undo 可能
		const snapshot = selectedItem;
		const tagIds = itemTags.map((t) => t.id);
		await itemStore.deleteItem(snapshot.id);
		libraryHistory.recordDelete(snapshot, tagIds);
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

function handleCardOverrideEnable() {
	if (!selectedItem) return;
	// 現在の global 設定を override にコピー（編集の起点）
	const current = JSON.stringify({
		background: configStore.libraryCard.background,
		style: configStore.libraryCard.style,
	});
	void itemStore.updateItem(selectedItem.id, {
		card_override_json: current,
	});
	toastStore.add('このカードだけ個別調整を開始しました', 'success');
}

let moreMenuItems = $derived.by(() => {
	if (!selectedItem) return [];
	return [
		{ label: '複製', onclick: handleDuplicate },
		{ label: 'JSONコピー', onclick: handleExportItem },
	];
});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Enter' && selectedItem) {
			const target = e.target as HTMLElement;
			if (
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.isContentEditable
			)
				return;
			handleLaunch();
		}
	}}
/>

<aside
	class="h-full border-l border-[var(--ag-border)] bg-[var(--ag-surface-2)] p-5"
	data-testid="library-detail-panel"
>
	{#if selectedItem}
		<LibraryDetailHeader item={selectedItem} {moreMenuItems} {onClose} />
		<LibraryDetailMetadata
			item={selectedItem}
			onCardOverrideEnable={handleCardOverrideEnable}
			onCardOverrideResetRequest={() => (resetConfirmOpen = true)}
		/>

		<!-- Tags section (S-3-5, S-3-6) -->
		<LibraryItemTagSection
			{itemTags}
			{availableTags}
			onAddTag={(id) => void handleAddTag(id)}
			onRemoveTag={(id) => void handleRemoveTag(id)}
			onEscapeWhenClosed={() => onClose?.()}
		/>

		<LibraryDetailActions
			item={selectedItem}
			{isStarred}
			onLaunch={handleLaunch}
			onEdit={() => onEditItem?.(selectedItem.id)}
			onToggleStar={handleToggleStar}
			onDelete={() => void handleDelete()}
			onPickDefaultApp={() => void handlePickDefaultApp()}
		/>
	{:else}
		<!-- Placeholder -->
		<div class="flex h-full items-center justify-center">
			<p class="text-sm text-[var(--ag-text-muted)]">アイテムを選択してください</p>
		</div>
	{/if}
</aside>

{#if selectedItem}
	<ConfirmDialog
		open={resetConfirmOpen}
		title="個別調整を解除しますか？"
		description="このカードの個別表示設定が失われ、Settings > Library のグローバル設定が適用されます。"
		confirmLabel="解除する"
		confirmVariant="destructive"
		onConfirm={() => {
			const id = selectedItem.id;
			resetConfirmOpen = false;
			void itemStore.updateItem(id, { card_override_json: null });
			toastStore.add('個別調整を解除しました', 'success');
		}}
		onCancel={() => (resetConfirmOpen = false)}
	/>
{/if}
