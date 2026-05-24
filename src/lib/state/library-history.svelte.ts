import { createItem } from '$lib/ipc/items';
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
	seq: number;
}

const UNDO_TTL_MS = 5_000;

let pending = $state<PendingDelete | null>(null);
let dismissTimer: ReturnType<typeof setTimeout> | null = null;
// Codex L2-B #2: 並行 delete で older completion が newer pending を上書きする race を防ぐ
// monotonic シーケンス。recordDelete 呼び出し順 (= caller の delete 完了順) で増える。
let nextSeq = 0;

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
 *
 * 並行 delete: caller A → IPC (slow) → IPC return → recordDelete、caller B → IPC (fast) →
 * IPC return → recordDelete の順序で完了が逆転すると、A の record が B の record を上書きして
 * しまう。最新ユーザ意図 (= 最後に caller が呼んだ recordDelete) を守るため、seq で常に最新優先。
 */
function recordDelete(item: Item, tagIds: string[]): void {
	const seq = ++nextSeq;
	pending = {
		type: 'delete',
		itemSnapshot: item,
		tagIds: [...tagIds],
		expiresAt: Date.now() + UNDO_TTL_MS,
		seq,
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
		// アイテムライフサイクル契約 (Bug 9 / U-6): back-link (source_widget_id /
		// source_entry_key) も snapshot から復元する。 backend で source widget の
		// 存在チェックを行い、 widget が消えていれば両列とも NULL にフォールバック。
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
			source_widget_id: snap.source_widget_id,
			source_entry_key: snap.source_entry_key,
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

export const libraryHistory = {
	get pendingUndo() {
		return pending;
	},
	recordDelete,
	undo,
	dismiss,
};
