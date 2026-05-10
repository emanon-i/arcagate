import { itemStore } from '$lib/state/items.svelte';

/**
 * Workspace 内 widget の右クリック context menu 状態。
 *
 * I-2 (2026-05-10 user 検収): widget 共通 context menu 拡張。
 *   旧: itemId のみ (Library item の Open with メニュー専用)
 *   新: itemId + path + widgetId + onOpenSettings callback で widget 共通の 4 操作
 *       (パスをコピー / Explorer で開く / アイテム削除 / 設定を開く) を支える
 *
 * 「実装漏れ厳禁」 (user 指示): item-row widget は path + itemId、widget body 右 click は
 * widgetId + onOpenSettings のみで開く graceful degradation 設計。
 */
class WorkspaceContextMenuStore {
	open = $state(false);
	x = $state(0);
	y = $state(0);
	itemId = $state<string | null>(null);
	path = $state<string | null>(null);
	widgetId = $state<string | null>(null);
	onOpenSettings = $state<(() => void) | null>(null);

	item = $derived.by(() =>
		this.itemId ? (itemStore.items.find((i) => i.id === this.itemId) ?? null) : null,
	);

	/**
	 * 旧 API: item id のみ受け取る。互換のため残す。
	 * 新規 caller は `openMenuFor` を使う。
	 */
	openMenu(id: string, ev?: MouseEvent) {
		const item = itemStore.items.find((i) => i.id === id);
		this.itemId = id;
		this.path = item?.target ?? null;
		this.widgetId = null;
		this.onOpenSettings = null;
		this.x = ev?.clientX ?? 0;
		this.y = ev?.clientY ?? 0;
		this.open = true;
	}

	/**
	 * I-2: widget 共通 context menu 用の rich opener。
	 * - itemId: Library item id (削除に使う、null なら delete メニュー非表示)
	 * - path: file/folder path (copy / explorer に使う、null なら 2 項目非表示)
	 * - widgetId: workspace widget id (settings 用、null なら settings 非表示)
	 * - onOpenSettings: 設定 modal を開く callback (widget が自身の settings dialog を保有するため)
	 */
	openMenuFor(opts: {
		itemId?: string | null;
		path?: string | null;
		widgetId?: string | null;
		onOpenSettings?: (() => void) | null;
		ev?: MouseEvent;
	}) {
		this.itemId = opts.itemId ?? null;
		this.path = opts.path ?? null;
		this.widgetId = opts.widgetId ?? null;
		this.onOpenSettings = opts.onOpenSettings ?? null;
		this.x = opts.ev?.clientX ?? 0;
		this.y = opts.ev?.clientY ?? 0;
		this.open = true;
	}

	close() {
		this.open = false;
	}
}

export const workspaceContextMenuStore = new WorkspaceContextMenuStore();
