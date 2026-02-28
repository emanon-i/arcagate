import { launchItem, searchItems } from '$lib/ipc/launch';
import type { Item } from '$lib/types/item';

let query = $state('');
let results = $state<Item[]>([]);
let selectedIndex = $state(0);
let isOpen = $state(false);
let loading = $state(false);
let lastError = $state<string | null>(null);

async function search(q: string): Promise<void> {
	query = q;
	selectedIndex = 0;
	loading = true;
	lastError = null;
	try {
		results = await searchItems(q);
	} catch (e) {
		lastError = String(e);
		results = [];
	} finally {
		loading = false;
	}
}

async function launch(item: Item): Promise<void> {
	lastError = null;
	try {
		await launchItem(item.id);
		close();
	} catch (e) {
		lastError = String(e);
	}
}

function open(): void {
	isOpen = true;
}

function close(): void {
	isOpen = false;
	query = '';
	results = [];
	selectedIndex = 0;
	lastError = null;
}

function selectNext(): void {
	if (results.length === 0) return;
	selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
}

function selectPrev(): void {
	selectedIndex = Math.max(selectedIndex - 1, 0);
}

export const paletteStore = {
	get query() {
		return query;
	},
	get results() {
		return results;
	},
	get selectedIndex() {
		return selectedIndex;
	},
	get isOpen() {
		return isOpen;
	},
	get loading() {
		return loading;
	},
	get lastError() {
		return lastError;
	},
	search,
	launch,
	open,
	close,
	selectNext,
	selectPrev,
};
