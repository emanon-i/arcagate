import { getItemsMetadataBatch } from '$lib/ipc/items';
import type { ItemMetadata } from '$lib/types/item-metadata';

/**
 * LibraryCard が一覧表示時に呼ぶ metadata 取得 store。
 *
 * 旧実装 (per-card $effect から個別に cmd_get_item_metadata 呼び出し) では
 * Library に 69+ item ある場合に 69+ 並列 IPC + Mutex<Connection> contention で
 * UI が固まる (I3 root cause)。
 *
 * 設計:
 * - cache: Map<id, { meta, expiresAt }> (TTL 60s)
 * - in-flight dedup: 同じ id を batch 内に重複配置しても 1 回しか fetch しない
 * - LibraryMainArea / LibraryItemPicker など visible items を持つ親が
 *   `loadMetadataForItems(ids)` を呼んで cache を warm up する
 * - LibraryCard は `metadataStore.getMetadata(id)` で synchronous に読むだけ
 *
 * cache invalidation:
 * - TTL 60s で自然失効 (Library item の target / mtime 変化を 60s 以内なら反映遅延)
 * - 明示無効化: `invalidate(id?)` を item update / delete 時に呼ぶ
 */

interface CacheEntry {
	meta: ItemMetadata;
	expiresAt: number;
}

const TTL_MS = 60_000;

let cache = $state(new Map<string, CacheEntry>());
const inflight = new Set<string>();

function isFresh(entry: CacheEntry | undefined): entry is CacheEntry {
	return entry !== undefined && entry.expiresAt > Date.now();
}

function getMetadata(id: string): ItemMetadata | null {
	const entry = cache.get(id);
	return isFresh(entry) ? entry.meta : null;
}

async function loadMetadataForItems(ids: string[]): Promise<void> {
	if (ids.length === 0) return;
	const now = Date.now();
	const missing: string[] = [];
	const seen = new Set<string>();
	for (const id of ids) {
		if (seen.has(id) || inflight.has(id)) continue;
		seen.add(id);
		const entry = cache.get(id);
		if (!entry || entry.expiresAt <= now) {
			missing.push(id);
		}
	}
	if (missing.length === 0) return;
	for (const id of missing) inflight.add(id);
	try {
		const result = await getItemsMetadataBatch(missing);
		const next = new Map(cache);
		const expiresAt = Date.now() + TTL_MS;
		for (const [id, meta] of result) {
			next.set(id, { meta, expiresAt });
		}
		cache = next;
	} catch {
		// best-effort: cache に書かない (次回 retry される)
	} finally {
		for (const id of missing) inflight.delete(id);
	}
}

function invalidate(id?: string): void {
	if (id === undefined) {
		cache = new Map();
		return;
	}
	if (!cache.has(id)) return;
	const next = new Map(cache);
	next.delete(id);
	cache = next;
}

export const metadataStore = {
	getMetadata,
	loadMetadataForItems,
	invalidate,
};
