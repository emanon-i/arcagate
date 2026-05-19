import * as itemsIpc from '$lib/ipc/items';
import type { CreateItemInput, Item, LibraryStats, UpdateItemInput } from '$lib/types/item';
import type { CreateTagInput, Tag, TagWithCount } from '$lib/types/tag';
import { getErrorMessage } from '$lib/utils/format-error';
import { metadataStore } from './metadata.svelte';

let items = $state<Item[]>([]);
let tags = $state<Tag[]>([]);
let libraryStats = $state<LibraryStats | null>(null);
let tagWithCounts = $state<TagWithCount[]>([]);
let tagItems = $state<Item[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);

async function loadItems(): Promise<void> {
	loading = true;
	error = null;
	try {
		items = await itemsIpc.listItems();
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

// C6: 単発 mutation 後の sidebar 件数 (libraryStats / tagWithCounts) を一括 refresh する内部 helper。
// 各呼出側で refresh を漏らすと「削除しても件数が減らない」「タグ count がずれる」原因になる。
// best-effort: refresh 失敗は silent (前回値を維持)。
async function refreshSidebarStats(): Promise<void> {
	await Promise.all([
		itemsIpc.getLibraryStats().then((s) => {
			libraryStats = s;
		}),
		itemsIpc.getTagWithCounts().then((c) => {
			tagWithCounts = c;
		}),
	]).catch(() => {
		// 既存値を維持
	});
}

async function createItem(input: CreateItemInput): Promise<void> {
	loading = true;
	error = null;
	try {
		const created = await itemsIpc.createItem(input);
		items = [...items, created];
		await refreshSidebarStats();
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function updateItem(id: string, input: UpdateItemInput): Promise<void> {
	loading = true;
	error = null;
	try {
		const updated = await itemsIpc.updateItem(id, input);
		items = items.map((item) => (item.id === id ? updated : item));
		// target / item_type 変更で metadata が古くなる可能性 → cache 無効化
		metadataStore.invalidate(id);
		// tag_ids 変更で tagWithCounts が変動する
		await refreshSidebarStats();
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

/**
 * In-memory のみの patch。 IPC は走らず DB は更新しない。
 *
 * 用途: slider drag 中の live preview。 oninput で連続呼出して LibraryCard / 各 preview
 * を同 store 経由で即時更新し、 release (onchange) 時のみ updateItem で persist する。
 * 旧実装は drag 中 IPC 殺到 → race condition で「drag した位置と違う値が確定する」 不具合の
 * 回避のため draft state を別管理していたが、 LibraryCard 本体が item.card_override_json
 * を直接購読する経路と分断していたため live 反映されなかった (2026-05-20 user 指摘)。
 *
 * 失敗 path 無し (in-memory only)。 onchange の updateItem が server resp で上書きするので
 * drift しても自動収束する。
 */
function applyOptimisticUpdate(id: string, patch: Partial<Item>): void {
	items = items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

async function toggleStar(id: string, starred: boolean): Promise<void> {
	try {
		const updated = await itemsIpc.toggleStar(id, starred);
		items = items.map((item) => (item.id === id ? updated : item));
		// sys-starred の count が変動するので tagWithCounts を refresh
		await refreshSidebarStats();
	} catch (e) {
		error = getErrorMessage(e);
	}
}

async function deleteItem(id: string): Promise<void> {
	loading = true;
	error = null;
	try {
		await itemsIpc.deleteItem(id);
		items = items.filter((item) => item.id !== id);
		metadataStore.invalidate(id);
		await refreshSidebarStats();
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function loadItemsByTag(tagId: string, query: string): Promise<void> {
	loading = true;
	error = null;
	try {
		tagItems = await itemsIpc.searchItemsInTag(tagId, query);
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function loadTags(): Promise<void> {
	loading = true;
	error = null;
	try {
		tags = await itemsIpc.getTags();
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function loadLibraryStats(): Promise<void> {
	loading = true;
	error = null;
	try {
		libraryStats = await itemsIpc.getLibraryStats();
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function loadTagWithCounts(): Promise<void> {
	loading = true;
	error = null;
	try {
		tagWithCounts = await itemsIpc.getTagWithCounts();
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function createTag(input: CreateTagInput): Promise<void> {
	loading = true;
	error = null;
	try {
		const created = await itemsIpc.createTag(input);
		tags = [...tags, created];
		await refreshSidebarStats();
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

export const itemStore = {
	get items() {
		return items;
	},
	get tagItems() {
		return tagItems;
	},
	get tags() {
		return tags;
	},
	get libraryStats() {
		return libraryStats;
	},
	get tagWithCounts() {
		return tagWithCounts;
	},
	get loading() {
		return loading;
	},
	get error() {
		return error;
	},
	loadItems,
	loadItemsByTag,
	createItem,
	updateItem,
	applyOptimisticUpdate,
	toggleStar,
	deleteItem,
	loadTags,
	createTag,
	loadLibraryStats,
	loadTagWithCounts,
};
