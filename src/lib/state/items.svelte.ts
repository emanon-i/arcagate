import * as itemsIpc from '$lib/ipc/items';
import type { Category, CategoryWithCount, CreateCategoryInput } from '$lib/types/category';
import type { CreateItemInput, Item, LibraryStats, UpdateItemInput } from '$lib/types/item';
import type { CreateTagInput, Tag } from '$lib/types/tag';

let items = $state<Item[]>([]);
let categories = $state<Category[]>([]);
let tags = $state<Tag[]>([]);
let libraryStats = $state<LibraryStats | null>(null);
let categoryWithCounts = $state<CategoryWithCount[]>([]);
let categoryItems = $state<Item[]>([]);
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

async function loadItemsByCategory(categoryId: string, query: string): Promise<void> {
	loading = true;
	error = null;
	try {
		categoryItems = await itemsIpc.searchItemsInCategory(categoryId, query);
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function loadCategories(): Promise<void> {
	loading = true;
	error = null;
	try {
		categories = await itemsIpc.getCategories();
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function createCategory(input: CreateCategoryInput): Promise<void> {
	loading = true;
	error = null;
	try {
		const created = await itemsIpc.createCategory(input);
		categories = [...categories, created];
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function updateCategory(id: string, name: string, prefix: string | null): Promise<void> {
	loading = true;
	error = null;
	try {
		await itemsIpc.updateCategory(id, name, prefix);
		categories = categories.map((c) => (c.id === id ? { ...c, name, prefix } : c));
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function deleteCategory(id: string): Promise<void> {
	loading = true;
	error = null;
	try {
		await itemsIpc.deleteCategory(id);
		categories = categories.filter((c) => c.id !== id);
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
	try {
		libraryStats = await itemsIpc.getLibraryStats();
	} catch (e) {
		error = String(e);
	}
}

async function loadCategoryWithCounts(): Promise<void> {
	try {
		categoryWithCounts = await itemsIpc.getCategoryWithCounts();
	} catch (e) {
		error = String(e);
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
	get categoryItems() {
		return categoryItems;
	},
	get categories() {
		return categories;
	},
	get tags() {
		return tags;
	},
	get libraryStats() {
		return libraryStats;
	},
	get categoryWithCounts() {
		return categoryWithCounts;
	},
	get loading() {
		return loading;
	},
	get error() {
		return error;
	},
	loadItems,
	loadItemsByCategory,
	createItem,
	updateItem,
	deleteItem,
	loadCategories,
	createCategory,
	updateCategory,
	deleteCategory,
	loadTags,
	createTag,
	loadLibraryStats,
	loadCategoryWithCounts,
};
