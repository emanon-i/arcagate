import type { Item } from '$lib/types/item';

/**
 * Library item の sort 純関数 (L2-C C1)。
 *
 * 現状 sort 軸 (3 系統):
 * - name: label を ja locale で比較
 * - created: created_at (ISO 8601 文字列、辞書順 = 時系列順)
 * - updated: updated_at (同上)
 *
 * 各軸で asc / desc を選択。caller は configStore に永続化。
 * launch_count / size は item-stats / metadata の追加データ要、L3 で対応検討。
 */

export type SortField = 'name' | 'created' | 'updated';
export type SortOrder = 'asc' | 'desc';

export interface SortSpec {
	field: SortField;
	order: SortOrder;
}

const collator = new Intl.Collator('ja', { numeric: true, sensitivity: 'base' });

/**
 * timestamp 文字列を epoch ms に変換 (Codex L2-C #3)。
 * 不正値は 0 として fallback (= 最古に積む、UI で気付ける)。
 */
function toEpoch(s: string): number {
	const t = Date.parse(s);
	return Number.isFinite(t) ? t : 0;
}

export function sortItems(items: Item[], spec: SortSpec): Item[] {
	const sign = spec.order === 'asc' ? 1 : -1;
	const sorted = [...items];
	switch (spec.field) {
		case 'name':
			sorted.sort((a, b) => sign * collator.compare(a.label, b.label));
			break;
		case 'created':
			sorted.sort((a, b) => sign * (toEpoch(a.created_at) - toEpoch(b.created_at)));
			break;
		case 'updated':
			sorted.sort((a, b) => sign * (toEpoch(a.updated_at) - toEpoch(b.updated_at)));
			break;
	}
	return sorted;
}

export const SORT_FIELD_LABELS: Record<SortField, string> = {
	name: '名前',
	created: '追加日',
	updated: '最終更新',
};

export function isValidSortField(v: string): v is SortField {
	return v === 'name' || v === 'created' || v === 'updated';
}

export function isValidSortOrder(v: string): v is SortOrder {
	return v === 'asc' || v === 'desc';
}
