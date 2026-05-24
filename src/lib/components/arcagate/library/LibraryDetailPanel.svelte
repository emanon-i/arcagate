<script lang="ts">
import { Settings } from '@lucide/svelte';
import { ask, open } from '@tauri-apps/plugin-dialog';
import LibraryItemTagSection from '$lib/components/arcagate/library/LibraryItemTagSection.svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { countItemReferences, createTag, getItemTags } from '$lib/ipc/items';
import { launchItem } from '$lib/ipc/launch';
import { CARD_OVERRIDE_INITIAL_BACKGROUND, configStore } from '$lib/state/config.svelte';
import { itemStore } from '$lib/state/items.svelte';
import { libraryHistory } from '$lib/state/library-history.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import type { Tag } from '$lib/types/tag';
import {
	type CardOverrideJson,
	isCardOverrideActive,
	parseCardOverride,
} from '$lib/utils/card-override';
import { formatLaunchError } from '$lib/utils/launch-error';
import CardOverrideDialog from './CardOverrideDialog.svelte';
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

// F-9 (2026-05-08 user 検収): tag inline create + 即 attach。既存 tag が 0 件でも初回作成可能に。
async function handleCreateAndAttachTag(name: string) {
	if (!selectedItem) return;
	const trimmed = name.trim();
	if (!trimmed) return;
	try {
		const created = await createTag({ name: trimmed, is_hidden: false });
		const currentIds = itemTags.map((t) => t.id);
		await itemStore.updateItem(selectedItem.id, { tag_ids: [...currentIds, created.id] });
		itemTags = await getItemTags(selectedItem.id);
		await itemStore.loadTagWithCounts();
		toastStore.add(t('toast.tag_created', { tag: trimmed }), 'success');
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		toastStore.add(t('toast.tag_create_failed', { error: msg }), 'error');
	}
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
		.then(() => toastStore.add(t('toast.launched_label', { label }), 'success'))
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
	// Phase 3 (2026-05-12 user 検収): delete dialog 文言を強化。
	// 「user タグ / 起動履歴も消える」 を明示、 widget 参照件数 + 関連 tag 数を表示。
	const userTagCount = itemTags.filter((t) => !t.is_system).length;
	const widgetLine =
		refCount > 0 ? `\n• ${t('library.detail.delete_widget_line', { count: refCount })}` : '';
	const userTagLine =
		userTagCount > 0 ? `\n• ${t('library.detail.delete_tag_line', { count: userTagCount })}` : '';
	const message = t('library.detail.delete_confirm_body', {
		label: selectedItem.label,
		widgetLine,
		userTagLine,
	});
	const confirmed = await ask(message, {
		title: t('library.detail.delete_confirm_title'),
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
		label: `${selectedItem.label}${t('library.detail.duplicate_suffix')}`,
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
		{ label: t('library.detail.menu_duplicate'), onclick: handleDuplicate },
		{ label: t('library.detail.menu_json_copy'), onclick: handleExportItem },
	];
});

// F-5 (2026-05-08 user 検収): カード見た目設定 toggle + 別 modal 編集に変更。
// E-3 で ItemForm 内に直接埋め込んだ ItemFormCardOverride を撤去、detail panel に
// checkbox + 「見た目設定モーダルを開く」 button を配置、CardOverrideDialog を別 modal で開く。
let cardOverrideDialogOpen = $state(false);

let selectedCardOverride = $derived(
	selectedItem ? parseCardOverride(selectedItem.card_override_json) : null,
);
let cardOverrideActive = $derived(isCardOverrideActive(selectedCardOverride));

/**
 * 見た目設定の解除 / 復元。 ⑤⑥ 修正:
 *
 * - 解除 (enable=false): override の本体 (background / style / opener_id) は維持したまま
 *   `disabled=true` を立て、 同時に `item.icon_path` を `icon_backup` へ退避 → null へ落とす。
 *   LibraryCard は disabled override を non-active 扱いして共通 default 表示に戻り、 「画像が
 *   残る」 (⑤) を完全に消す。
 * - 復元 (enable=true): 既存 override がある場合は `disabled` を外し、 `icon_backup` を
 *   `item.icon_path` へ戻して位置調整 (offsetX / offsetY / rotation 等) を含む 一切の設定を
 *   そのまま蘇らせる (⑥)。
 * - 初回 ON: 既存 override 無しの場合は CARD_OVERRIDE_INITIAL_BACKGROUND + 現在の global style
 *   で新規に作成。 icon_path はそのまま維持。
 *
 * 状態遷移を 1 回の `updateItem` IPC に集約し、 icon_path と card_override_json を必ず一括で
 * 切り替える (中間状態を露出しない)。
 */
function handleCardOverrideToggle(enable: boolean): void {
	if (!selectedItem) return;
	const current = selectedCardOverride;
	if (enable) {
		if (current) {
			// 復元: disabled を外し、 icon_backup を icon_path に戻す。 内容は破棄しない。
			const restored: CardOverrideJson = { ...current };
			delete restored.disabled;
			const restoredIconPath = restored.icon_backup ?? selectedItem.icon_path;
			delete restored.icon_backup;
			void itemStore.updateItem(selectedItem.id, {
				card_override_json: JSON.stringify(restored),
				icon_path: restoredIconPath,
			});
			toastStore.add(t('toast.appearance_settings_restored'), 'success');
			return;
		}
		// 初回 ON: initial 値で新規作成、 icon_path は維持。
		const initial: CardOverrideJson = {
			background: CARD_OVERRIDE_INITIAL_BACKGROUND,
			style: configStore.libraryCard.style,
		};
		void itemStore.updateItem(selectedItem.id, {
			card_override_json: JSON.stringify(initial),
		});
		toastStore.add(t('toast.appearance_settings_started'), 'success');
		return;
	}
	// 解除: 内容を維持しつつ disabled=true、 icon_path を icon_backup に退避して null へ。
	const base: CardOverrideJson = current ?? {};
	const disabled: CardOverrideJson = {
		...base,
		disabled: true,
		icon_backup: selectedItem.icon_path ?? null,
	};
	void itemStore.updateItem(selectedItem.id, {
		card_override_json: JSON.stringify(disabled),
		icon_path: null,
	});
	toastStore.add(t('toast.appearance_settings_cleared'), 'info');
}
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
		<LibraryDetailMetadata item={selectedItem} />

		<!-- F-5 (2026-05-08): カード見た目設定 toggle + 別 modal 編集 -->
		<div class="mt-4 flex items-center justify-between gap-2 border-t border-[var(--ag-border)] pt-4">
			<label class="flex items-center gap-2 text-sm text-[var(--ag-text-secondary)]">
				<input
					type="checkbox"
					class="h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
					data-testid="card-override-toggle"
					checked={cardOverrideActive}
					onchange={(e) =>
						handleCardOverrideToggle((e.currentTarget as HTMLInputElement).checked)}
				/>
				<span>{t('library.detail.appearance_settings_label')}</span>
			</label>
			<Button
				type="button"
				variant="outline"
				size="icon-sm"
				disabled={!cardOverrideActive}
				data-testid="card-override-open-dialog"
				aria-label={t('library.detail.appearance_settings_open')}
				title={t('library.detail.appearance_settings_open')}
				onclick={() => (cardOverrideDialogOpen = true)}
			>
				<Settings class="h-4 w-4" />
			</Button>
		</div>

		<!-- Tags section (S-3-5, S-3-6) -->
		<LibraryItemTagSection
			{itemTags}
			{availableTags}
			onAddTag={(id) => void handleAddTag(id)}
			onRemoveTag={(id) => void handleRemoveTag(id)}
			onCreateTag={(name) => void handleCreateAndAttachTag(name)}
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
			<p class="text-sm text-[var(--ag-text-muted)]">{t('library.detail.select_placeholder')}</p>
		</div>
	{/if}
</aside>

{#if selectedItem}
	<CardOverrideDialog
		open={cardOverrideDialogOpen}
		item={selectedItem}
		onClose={() => (cardOverrideDialogOpen = false)}
	/>
{/if}
