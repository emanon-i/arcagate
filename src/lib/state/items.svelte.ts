import * as itemsIpc from '$lib/ipc/items';
import type { Category, CreateCategoryInput } from '$lib/types/category';
import type { CreateItemInput, Item, UpdateItemInput } from '$lib/types/item';
import type { CreateTagInput, Tag } from '$lib/types/tag';

let items = $state<Item[]>([]);
let categories = $state<Category[]>([]);
let tags = $state<Tag[]>([]);
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
	get categories() {
		return categories;
	},
	get tags() {
		return tags;
	},
	get loading() {
		return loading;
	},
	get error() {
		return error;
	},
	loadItems,
	createItem,
	updateItem,
	deleteItem,
	loadCategories,
	createCategory,
	updateCategory,
	deleteCategory,
	loadTags,
	createTag,
};
