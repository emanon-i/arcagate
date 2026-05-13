/**
 * audit 2026-05-13 G4: opener list の shared store (旧 5 file での `listOpeners()` 直 invoke を集約)。
 *
 * 旧 problem: ItemSettings / ExeFolderSettings / ItemFormCardOverride / ItemContextMenu /
 * OpenerSettings の 5 件で個別に `listOpeners()` を呼び出していた (Rule of Three 超 = duplicate)。
 *
 * 設計:
 * - cache: `Opener[]` 単一 instance、 初回 `load()` で fetch
 * - invalidation: `invalidate()` で次回 `load()` 時に refetch
 * - CRUD 経路 (OpenerSettings の save / delete) で必ず `invalidate()` を呼ぶ contract
 *
 * Codex pitfall P3 (invalidation 必須): OpenerSettings の save/delete 経路で `openersStore.invalidate()` を
 * 呼んでいる (本 file 内 use では caller 責任、 cache 経由でアクセスする consumer は invalidate 後の
 * 次 load で fresh data 取得)。
 */
import { listOpeners, type Opener } from '$lib/ipc/opener';

let cache = $state<Opener[] | null>(null);
let loading = $state(false);
let error = $state<string | null>(null);

async function load(force = false): Promise<Opener[]> {
	if (!force && cache !== null) return cache;
	if (loading) {
		// 同時 load 重複防止: 既存 load を待つ
		while (loading) await new Promise((r) => setTimeout(r, 10));
		return cache ?? [];
	}
	loading = true;
	error = null;
	try {
		const list = await listOpeners();
		cache = list;
		return list;
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		return cache ?? [];
	} finally {
		loading = false;
	}
}

function invalidate(): void {
	cache = null;
}

export const openersStore = {
	get list(): Opener[] {
		return cache ?? [];
	},
	get isLoading(): boolean {
		return loading;
	},
	get loadError(): string | null {
		return error;
	},
	load,
	invalidate,
};
