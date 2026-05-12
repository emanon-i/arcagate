import {
	addWidgetItemHide,
	listWidgetItemHides,
	removeWidgetItemHide,
} from '$lib/ipc/widget_item_hides';

/**
 * Phase 2 (2026-05-12): per-widget hide の global state cache。
 *
 * widget_id ごとに hide 済 item_target Set を保持。 各 widget が
 * mount 時に loadFor(widget_id) を呼び、 render で has(widget_id, target) で filter。
 *
 * mutation (add / remove) は backend に書き、 同 widget_id の cache を invalidate して再 load。
 * 「外す」 menu item から呼ばれる経路 (WidgetItemContextMenu / addHide 関数) を統一。
 */

let cache = $state<Map<string, Set<string>>>(new Map());
const loading = new Set<string>(); // in-flight loads (重複 IPC 防止)

async function loadFor(widgetId: string): Promise<void> {
	if (loading.has(widgetId)) return;
	loading.add(widgetId);
	try {
		const list = await listWidgetItemHides(widgetId);
		const next = new Map(cache);
		next.set(widgetId, new Set(list));
		cache = next;
	} catch {
		// best-effort、 失敗時は空 Set で fallback (= filter 効かず全件表示)
		if (!cache.has(widgetId)) {
			const next = new Map(cache);
			next.set(widgetId, new Set());
			cache = next;
		}
	} finally {
		loading.delete(widgetId);
	}
}

function has(widgetId: string | null | undefined, itemTarget: string): boolean {
	if (!widgetId) return false;
	return cache.get(widgetId)?.has(itemTarget) ?? false;
}

function getHides(widgetId: string | null | undefined): Set<string> {
	if (!widgetId) return new Set();
	return cache.get(widgetId) ?? new Set();
}

async function add(widgetId: string, itemTarget: string): Promise<void> {
	await addWidgetItemHide(widgetId, itemTarget);
	await loadFor(widgetId);
}

async function remove(widgetId: string, itemTarget: string): Promise<void> {
	await removeWidgetItemHide(widgetId, itemTarget);
	await loadFor(widgetId);
}

export const widgetItemHidesStore = {
	get cache() {
		return cache;
	},
	loadFor,
	has,
	getHides,
	add,
	remove,
};
