import { invoke } from '@tauri-apps/api/core';
import { scriptConfirm } from '$lib/state/script-confirm.svelte';
import type { Item, ItemStats } from '$lib/types/item';
import { wrapIpc } from '$lib/utils/perf';
import { isConfirmationRequired } from './launch-errors';

export { isConfirmationRequired } from './launch-errors';

export async function searchItems(query: string): Promise<Item[]> {
	return wrapIpc('search_items', () => invoke<Item[]>('cmd_search_items', { query }));
}

/** アイテムを起動確認済みとして記録する (audit F15)。 */
export async function confirmItem(itemId: string): Promise<void> {
	return invoke<void>('cmd_confirm_item', { itemId });
}

/**
 * アイテムを起動する。 全 launch 経路 (palette / Library / widget / cascade) の共通経路。
 *
 * audit F15 (2026-05-18): Command / Script アイテムが未確認の場合、 backend は
 * `launch.confirmation_required` を返す。 ここで確認ダイアログを表示し、 ユーザーが
 * 承認したら confirm を記録して再起動する。 cancel 時は no-op (例外を投げない)。
 */
export async function launchItem(itemId: string): Promise<void> {
	try {
		await invoke<void>('cmd_launch_item', { itemId });
	} catch (e) {
		if (!isConfirmationRequired(e)) throw e;
		const confirmed = await scriptConfirm.request(e.message ?? '');
		if (!confirmed) return;
		await confirmItem(itemId);
		await invoke<void>('cmd_launch_item', { itemId });
	}
}

export async function getItemStats(itemId: string): Promise<ItemStats | null> {
	return invoke<ItemStats | null>('cmd_get_item_stats', { itemId });
}

/** I-2 (2026-05-10): widget context menu「Explorer で開く」 用。Windows 限定 (`/select,<path>`)。 */
export async function revealInExplorer(path: string): Promise<void> {
	return invoke<void>('cmd_reveal_in_explorer', { path });
}
