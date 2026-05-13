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

// audit 2026-05-13 Codex Round 3 fix: single-flight promise (busy-wait polling 撤去)。
let inflight: Promise<Opener[]> | null = null;

async function load(force = false): Promise<Opener[]> {
	if (!force && cache !== null) return cache;
	if (inflight) return inflight;
	loading = true;
	error = null;
	inflight = (async () => {
		try {
			const list = await listOpeners();
			cache = list;
			return list;
		} catch (e) {
			// audit 2026-05-13 Codex Round 3 required fix: silent failure 廃止。
			// 旧: cache ?? [] 返却 → caller の catch が発火しない silent UX bug。
			// 新: error 状態を記録した上で throw、 caller (OpenerSettings 等) の catch で
			//     getErrorMessage(e) 経由で toast 表示される設計に揃える。
			error = e instanceof Error ? e.message : String(e);
			throw e;
		} finally {
			loading = false;
			inflight = null;
		}
	})();
	return inflight;
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
