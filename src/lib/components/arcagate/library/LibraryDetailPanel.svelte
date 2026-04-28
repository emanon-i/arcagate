<script lang="ts">
import { FolderOpen, Play, Settings2, Star, Trash2, X as XIcon } from '@lucide/svelte';
import { ask, open } from '@tauri-apps/plugin-dialog';
import ActionButton from '$lib/components/arcagate/common/ActionButton.svelte';
import DetailRow from '$lib/components/arcagate/common/DetailRow.svelte';
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';
import MoreMenu from '$lib/components/arcagate/common/MoreMenu.svelte';
import LibraryItemTagSection from '$lib/components/arcagate/library/LibraryItemTagSection.svelte';
import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
import { artMap, typeLabel } from '$lib/constants/item-type';
import { getItemTags } from '$lib/ipc/items';
import { launchItem } from '$lib/ipc/launch';
import { configStore } from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { Tag } from '$lib/types/tag';
import { formatLaunchError } from '$lib/utils/launch-error';

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
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Enter' && selectedItem) {
			const target = e.target as HTMLElement;
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
			const label = selectedItem.label;
			void launchItem(selectedItem.id)
				.then(() => toastStore.add(`${label} を起動しました`, 'success'))
				.catch((e: unknown) => toastStore.add(formatLaunchError(label, e), 'error'));
		}
	}}
/>

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
					class="rounded-full border border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] px-2.5 py-1 text-xs text-[var(--ag-accent-text)]"
				>
					{typeLabel[selectedItem.item_type]}
				</span>
				<MoreMenu items={moreMenuItems} ariaLabel="アイテム操作メニュー" />
				<button
					type="button"
					class="rounded-lg p-1 text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-3)]"
					aria-label="パネルを閉じる"
					onclick={() => onClose?.()}
				>
					<XIcon class="h-4 w-4" />
				</button>
			</div>
		</div>

		<!-- Gradient preview -->
		<div class="flex h-40 items-center justify-center rounded-[var(--ag-radius-widget)] bg-gradient-to-br {artMap[selectedItem.item_type]}">
			<ItemIcon iconPath={selectedItem.icon_path} itemType={selectedItem.item_type} alt="{selectedItem.label} icon" class="h-20 w-20 object-cover drop-shadow-lg" />
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
		<LibraryItemTagSection
			{itemTags}
			{availableTags}
			onAddTag={(id) => void handleAddTag(id)}
			onRemoveTag={(id) => void handleRemoveTag(id)}
			onEscapeWhenClosed={() => onClose?.()}
		/>

		<!-- Default app for folders (S-3-7) -->
		{#if selectedItem.item_type === 'folder'}
			<div class="mt-4 space-y-2 text-sm">
				<DetailRow label="デフォルトアプリ" value={selectedItem.default_app || 'Explorer（既定）'} />
				<button
					type="button"
					class="flex items-center gap-2 rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-2 text-xs text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
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
				aria-label={isStarred ? 'お気に入りを解除' : 'お気に入りに追加'}
				data-testid="favorite-button"
				class="flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm transition-[color,background-color,border-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97]
					{isStarred
					? 'border-[var(--ag-accent)]/60 bg-[var(--ag-accent)]/15 text-[var(--ag-accent)] hover:bg-[var(--ag-accent)]/25'
					: 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
				onclick={handleToggleStar}
			>
				<Star class="h-4 w-4" fill={isStarred ? 'currentColor' : 'none'} />
				お気に入り
			</button>
			<button
				type="button"
				class="flex items-center justify-center gap-2 rounded-2xl border border-destructive/50 bg-destructive/10 px-3 py-3 text-sm text-destructive transition-[background-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] hover:bg-destructive/20"
				onclick={handleDelete}
				data-testid="delete-item-button"
			>
				<Trash2 class="h-4 w-4" />
				削除
			</button>
		</div>

		<!-- Visibility toggle (PH-291) -->
		<label class="mt-4 flex items-start gap-2 text-sm text-[var(--ag-text-secondary)]">
			<input
				type="checkbox"
				class="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
				data-testid="visibility-toggle"
				checked={!selectedItem.is_enabled}
				onchange={(e) =>
					void itemStore.updateItem(selectedItem!.id, {
						is_enabled: !(e.currentTarget as HTMLInputElement).checked,
					})}
			/>
			<span class="flex-1">
				<span class="block">ライブラリで非表示</span>
				<span class="mt-0.5 block text-xs text-[var(--ag-text-muted)]">
					非表示にすると <strong>検索（パレット / Library 一覧）</strong> と <strong>ウィジェット</strong> から外れます。データは残るため、再度表示に戻すことも可能です。
				</span>
			</span>
		</label>

		<!-- PH-290 + PH-297 + PH-340: per-card 設定 -->
		<div class="mt-4 space-y-2 border-t border-[var(--ag-border)] pt-4">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<p class="text-sm font-medium text-[var(--ag-text-primary)]">カード表示</p>
						{#if selectedItem.card_override_json}
							<span
								class="rounded-full bg-[var(--ag-accent-bg)] px-2 py-0.5 text-xs font-medium text-[var(--ag-accent-text)]"
								data-testid="card-override-badge"
							>
								個別調整中
							</span>
						{/if}
					</div>
					<p class="mt-0.5 text-xs text-[var(--ag-text-muted)]">
						{selectedItem.card_override_json
							? 'このカードのみグローバル設定とは独立した表示が適用されています。'
							: 'Settings > Library のグローバル設定が適用されています。'}
					</p>
				</div>
				{#if selectedItem.card_override_json}
					<button
						type="button"
						data-testid="card-override-reset"
						class="shrink-0 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-1.5 text-xs text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-4)]"
						aria-label="個別調整を解除してグローバル設定に戻す"
						onclick={() => (resetConfirmOpen = true)}
					>
						グローバル設定に戻す
					</button>
				{:else}
					<button
						type="button"
						data-testid="card-override-enable"
						class="shrink-0 rounded-lg border border-[var(--ag-accent-border)] bg-[var(--ag-accent-bg)] px-3 py-1.5 text-xs text-[var(--ag-accent-text)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-accent-active-bg)]"
						aria-label="このカードだけ個別調整を有効化"
						onclick={() => {
							// 現在の global 設定を override にコピー（編集の起点）
							const current = JSON.stringify({
								background: configStore.libraryCard.background,
								style: configStore.libraryCard.style,
							});
							void itemStore.updateItem(selectedItem!.id, {
								card_override_json: current,
							});
							toastStore.add('このカードだけ個別調整を開始しました', 'success');
						}}
					>
						このカードだけ個別調整
					</button>
				{/if}
			</div>
			{#if selectedItem.card_override_json}
				<p class="text-xs text-[var(--ag-text-muted)]">
					詳細編集 UI は Settings > Library に統合予定。当面はリセット → 再有効化で global の最新値を取り込めます。
				</p>
			{/if}
		</div>

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
			const id = selectedItem!.id;
			resetConfirmOpen = false;
			void itemStore.updateItem(id, { card_override_json: null });
			toastStore.add('個別調整を解除しました', 'success');
		}}
		onCancel={() => (resetConfirmOpen = false)}
	/>
{/if}
