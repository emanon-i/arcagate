/**
 * H-2 Tier B (2026-05-09 user 検収): Workspace の widget 複数選択 state。
 *
 * 仕様:
 * - 単 click → 1 個選択 (set size 1)
 * - shift+click → 追加/解除 (toggle add/remove)
 * - canvas (空領域) click → 全解除
 * - Esc → 全解除
 * - Delete → 全選択 widget をまとめて削除 (workspace-widgets.removeMany 経由、history 1 batch)
 * - widget の drag handle で pointer down 時、その id が `ids` に含まれていれば
 *   全選択 widget に同 delta を適用 (moveMany)。含まれてなければ単独 drag (単選択化)。
 *
 * 設計判断:
 * - `Set<string>` を $state で持つ。Svelte 5 reactivity は Set 自体の参照変更でトリガーする
 *   ため、mutation 時は新 Set を代入する (in-place .add は reactive 更新が遅延する場合あり)。
 * - 既存 `selectedWidgetId: string | null` API との互換のため `singleId` getter を提供:
 *   size === 1 のときのみその id、それ以外は null。HintBar の「1 個選択時 hint」 用。
 */

let ids = $state<Set<string>>(new Set());

function setSingle(id: string): void {
	ids = new Set([id]);
}

function toggle(id: string): void {
	const next = new Set(ids);
	if (next.has(id)) {
		next.delete(id);
	} else {
		next.add(id);
	}
	ids = next;
}

function add(id: string): void {
	if (ids.has(id)) return;
	const next = new Set(ids);
	next.add(id);
	ids = next;
}

function clear(): void {
	if (ids.size === 0) return;
	ids = new Set();
}

export const workspaceSelection = {
	get ids() {
		return ids;
	},
	get size() {
		return ids.size;
	},
	get singleId() {
		return ids.size === 1 ? [...ids][0] : null;
	},
	has(id: string): boolean {
		return ids.has(id);
	},
	asArray(): string[] {
		return [...ids];
	},
	setSingle,
	toggle,
	add,
	clear,
};
