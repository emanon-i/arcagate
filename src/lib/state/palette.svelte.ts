import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
import { searchItemsInCategory } from '$lib/ipc/items';
import { launchItem, searchItems } from '$lib/ipc/launch';
import { itemStore } from '$lib/state/items.svelte';
import type { PaletteEntry } from '$lib/types/palette';

let query = $state('');
let results = $state<PaletteEntry[]>([]);
let selectedIndex = $state(0);
let isOpen = $state(false);
let loading = $state(false);
let lastError = $state<string | null>(null);

// クリップボード履歴（パレット open 中のみポーリング）
let clipboardHistory = $state<string[]>([]);
let _lastClipboard = '';
let _pollingTimer: ReturnType<typeof setInterval> | null = null;

const CALC_SAFE_PATTERN = /^[0-9+\-*/(). ]+$/;
const MAX_CLIPBOARD_HISTORY = 50;

function evalCalc(expr: string): string | null {
	const sanitized = expr.trim();
	if (!CALC_SAFE_PATTERN.test(sanitized)) return null;
	try {
		// eslint-disable-next-line no-new-func
		const val = Function(`return (${sanitized})`)() as unknown;
		if (typeof val === 'number' && Number.isFinite(val)) {
			return String(val);
		}
		return null;
	} catch {
		return null;
	}
}

function startClipboardPolling(): void {
	if (_pollingTimer !== null) return;
	_pollingTimer = setInterval(() => {
		void pollClipboard();
	}, 1000);
}

function stopClipboardPolling(): void {
	if (_pollingTimer !== null) {
		clearInterval(_pollingTimer);
		_pollingTimer = null;
	}
}

async function pollClipboard(): Promise<void> {
	try {
		const text = await readText();
		if (text && text !== _lastClipboard) {
			_lastClipboard = text;
			// 重複を除去してから先頭に追加
			clipboardHistory = [text, ...clipboardHistory.filter((t) => t !== text)].slice(
				0,
				MAX_CLIPBOARD_HISTORY,
			);
			// cb: プレフィックス中なら表示を更新
			if (query.startsWith('cb:')) {
				results = buildClipboardResults(query.slice(3));
			}
		}
	} catch {
		// クリップボードアクセス失敗は無視
	}
}

function buildClipboardResults(subQuery: string): PaletteEntry[] {
	const filtered = subQuery
		? clipboardHistory.filter((t) => t.toLowerCase().includes(subQuery.toLowerCase()))
		: clipboardHistory;
	return filtered.map((text, index) => ({ kind: 'clipboard', text, index }));
}

async function search(q: string): Promise<void> {
	query = q;
	selectedIndex = 0;
	lastError = null;

	// 電卓モード: "= <expr>"
	if (q.startsWith('= ')) {
		const expr = q.slice(2);
		const res = evalCalc(expr);
		if (res !== null) {
			results = [{ kind: 'calc', expression: expr, result: res }];
		} else if (expr.trim()) {
			results = [{ kind: 'calc', expression: expr, result: '...' }];
		} else {
			results = [];
		}
		return;
	}

	// クリップボード履歴モード: "cb:<subquery>"
	if (q.startsWith('cb:')) {
		results = buildClipboardResults(q.slice(3));
		return;
	}

	// カテゴリプレフィックスモード: "<prefix>:<subquery>"
	const colonIdx = q.indexOf(':');
	if (colonIdx > 0) {
		const prefix = q.slice(0, colonIdx);
		const subQuery = q.slice(colonIdx + 1);
		const matched = itemStore.categories.find(
			(c) => c.prefix && c.prefix.toLowerCase() === prefix.toLowerCase(),
		);
		if (matched) {
			loading = true;
			try {
				const items = await searchItemsInCategory(matched.id, subQuery);
				results = items.map((item) => ({ kind: 'item', item }));
			} catch (e) {
				lastError = String(e);
				results = [];
			} finally {
				loading = false;
			}
			return;
		}
	}

	// 通常検索
	loading = true;
	try {
		const items = await searchItems(q);
		results = items.map((item) => ({ kind: 'item', item }));
	} catch (e) {
		lastError = String(e);
		results = [];
	} finally {
		loading = false;
	}
}

async function launch(entry: PaletteEntry): Promise<void> {
	lastError = null;
	try {
		switch (entry.kind) {
			case 'item':
				await launchItem(entry.item.id);
				close();
				break;
			case 'calc':
				await writeText(entry.result);
				close();
				break;
			case 'clipboard':
				await writeText(entry.text);
				close();
				break;
		}
	} catch (e) {
		lastError = String(e);
	}
}

function open(): void {
	isOpen = true;
	startClipboardPolling();
}

function close(): void {
	isOpen = false;
	query = '';
	results = [];
	selectedIndex = 0;
	lastError = null;
	stopClipboardPolling();
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
