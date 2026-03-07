import * as itemsIpc from '$lib/ipc/items';
import type { CreateItemInput, Item, LibraryStats, UpdateItemInput } from '$lib/types/item';
import type { CreateTagInput, Tag, TagWithCount } from '$lib/types/tag';

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
		error = String(e);
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
	} catch (e) {
		error = String(e);
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
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function deleteItem(id: string): Promise<void> {
	loading = true;
	error = null;
	try {
		await itemsIpc.deleteItem(id);
		items = items.filter((item) => item.id !== id);
	} catch (e) {
		error = String(e);
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
		error = String(e);
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
		error = String(e);
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
		error = String(e);
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
		error = String(e);
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
		error = String(e);
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
	deleteItem,
	loadTags,
	createTag,
	loadLibraryStats,
	loadTagWithCounts,
};
