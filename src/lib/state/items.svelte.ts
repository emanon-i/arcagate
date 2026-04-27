import * as itemsIpc from '$lib/ipc/items';
import type { CreateItemInput, Item, LibraryStats, UpdateItemInput } from '$lib/types/item';
import type { CreateTagInput, Tag, TagWithCount } from '$lib/types/tag';
import { getErrorMessage } from '$lib/utils/format-error';

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

async function createItem(input: CreateItemInput): Promise<void> {
	loading = true;
	error = null;
	try {
		const created = await itemsIpc.createItem(input);
		items = [...items, created];
		// PH-479: tag counts / library stats も同時に reload (sidebar reactive 反映)
		void loadTagWithCounts();
		void loadLibraryStats();
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
		// PH-479: 全 item object を spread copy で新 reference 化 (keyed each + 子 $derived 確実起動)
		items = items.map((item) => (item.id === id ? { ...updated } : { ...item }));
		// PH-479: tag 変更があれば counts も reload (icon path 変更 / aliases 変更等は影響なしだが安全側で)
		void loadTagWithCounts();
	} catch (e) {
		error = getErrorMessage(e);
	} finally {
		loading = false;
	}
}

async function toggleStar(id: string, starred: boolean): Promise<void> {
	try {
		const updated = await itemsIpc.toggleStar(id, starred);
		// PH-479: お気に入り toggle → 左 sidebar Favorites の reactive 反映を確実に
		items = items.map((item) => (item.id === id ? { ...updated } : { ...item }));
		// PH-479: tagWithCounts (sidebar Favorites count) も同時に reload
		// → 旧実装では toggle 後に sidebar count が画面切替まで stale になる事例
		void loadTagWithCounts();
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
		// PH-479: 削除後 reactive 反映 (sidebar count / stats / widget cascade)
		// PH-474 で Rust 側 cascade 済 (workspace_widgets の config 内 item_id null 化)
		// → frontend の workspaceStore.widgets を reload して dead reference を排除
		void loadTagWithCounts();
		void loadLibraryStats();
		// dynamic import で循環依存回避
		import('./workspace.svelte').then(({ workspaceStore }) => {
			if (workspaceStore.activeWorkspaceId) {
				void workspaceStore.loadWidgets(workspaceStore.activeWorkspaceId);
			}
		});
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
	toggleStar,
	deleteItem,
	loadTags,
	createTag,
	loadLibraryStats,
	loadTagWithCounts,
};
