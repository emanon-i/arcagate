import { createItem, deleteItem } from '$lib/ipc/items';
import type { Item } from '$lib/types/item';
import { itemStore } from './items.svelte';

/**
 * Library 操作の履歴 + undo スタック (L2-B B4)。
 *
 * 現状は **delete のみ** を対象。recordDelete を呼んで pendingUndo を立て、
 * undo() で 5 秒以内なら createItem で復元 (新 UUID で recreate、tag_ids も復元)。
 *
 * 将来 (L3) で rename / move / bulk-delete に拡張可能。
 */

interface PendingDelete {
	type: 'delete';
	itemSnapshot: Item;
	tagIds: string[];
	expiresAt: number;
}

const UNDO_TTL_MS = 5_000;

let pending = $state<PendingDelete | null>(null);
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

function clearPending() {
	pending = null;
	if (dismissTimer) {
		clearTimeout(dismissTimer);
		dismissTimer = null;
	}
}

function scheduleAutoDismiss() {
	if (dismissTimer) clearTimeout(dismissTimer);
	dismissTimer = setTimeout(() => {
		pending = null;
		dismissTimer = null;
	}, UNDO_TTL_MS);
}

/**
 * delete を履歴に積む。caller は実際の delete IPC を独自に発火する責務がある
 * (本 store は snapshot 保持と undo の責任のみ)。
 */
function recordDelete(item: Item, tagIds: string[]): void {
	pending = {
		type: 'delete',
		itemSnapshot: item,
		tagIds: [...tagIds],
		expiresAt: Date.now() + UNDO_TTL_MS,
	};
	scheduleAutoDismiss();
}

/**
 * 直前 delete の取り消し。期限切れなら false。成功時 true。
 *
 * 復元は createItem IPC を直叩き (itemStore.createItem は内部 catch で error を吸収するため
 * 失敗有無が caller に伝わらない)。成功後 itemStore.loadItems を呼んで items 配列に反映。
 * sidebar stats は loadItems 後の itemStore 経由で refresh される。
 */
async function undo(): Promise<boolean> {
	const entry = pending;
	if (!entry) return false;
	if (entry.expiresAt < Date.now()) {
		clearPending();
		return false;
	}
	const snap = entry.itemSnapshot;
	try {
		await createItem({
			item_type: snap.item_type,
			label: snap.label,
			target: snap.target,
			args: snap.args,
			working_dir: snap.working_dir,
			icon_path: snap.icon_path,
			aliases: snap.aliases,
			tag_ids: entry.tagIds,
			is_tracked: snap.is_tracked,
		});
		await itemStore.loadItems();
		clearPending();
		return true;
	} catch {
		// 復元失敗 (DB error 等) は pending 維持で再試行可能
		return false;
	}
}

function dismiss(): void {
	clearPending();
}

/**
 * delete + record の helper。caller (LibraryDetailPanel.handleDelete 等) は
 * snapshot 取得 → IPC delete → recordDelete を 1 連で書きやすくする。
 */
async function deleteAndRecord(item: Item, tagIds: string[]): Promise<void> {
	await deleteItem(item.id);
	// itemStore.deleteItem を経由しない直 IPC のため、items 配列と sidebar stats を手動 refresh
	await itemStore.loadItems();
	recordDelete(item, tagIds);
}

// Tauri command 直叩きを type で残す (テストで mock 可能、createItem の方は itemStore 経由)。
export const __testHooks = { createItem, deleteItem };

export const libraryHistory = {
	get pendingUndo() {
		return pending;
	},
	recordDelete,
	deleteAndRecord,
	undo,
	dismiss,
};
