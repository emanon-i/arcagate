import type { Item } from '$lib/types/item';
import type { ItemMetadata } from '$lib/types/item-metadata';

/**
 * バイト数を人間可読な単位に変換（10^3 系）。
 *
 * - 0 → "0 B"
 * - 999 → "999 B"
 * - 1024 → "1.0 KB"
 * - 1_500_000 → "1.5 MB"
 */
export function formatBytes(n: number): string {
	if (!Number.isFinite(n) || n < 0) return '';
	if (n < 1000) return `${n} B`;
	const units = ['KB', 'MB', 'GB', 'TB'];
	let value = n / 1000;
	let i = 0;
	while (value >= 1000 && i < units.length - 1) {
		value /= 1000;
		i++;
	}
	return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[i]}`;
}

/**
 * ISO 8601 文字列から短い日付表記 "YYYY-MM-DD"。
 * Invalid なら空文字。
 */
export function formatShortDate(iso: string | undefined): string {
	if (!iso) return '';
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
	return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

/**
 * Item と ItemMetadata から表示用文字列を組み立てる。
 *
 * size は 'S' | 'M' | 'L' で表示量を変える（S は使わない想定、呼び出し側で skip）。
 * 1 行表記 (M) と 2 行表記 (L) で異なる:
 * - line1: 主要な 1 つ（サイズ / ドメイン / 件数 等）
 * - line2: 補助情報（日時 / フォーマット 等）。M では使われない。
 *
 * 取得情報が空なら line1 / line2 とも空文字。
 */
export function formatItemMeta(
	item: Pick<Item, 'item_type'>,
	meta: ItemMetadata,
): { line1: string; line2: string } {
	switch (item.item_type) {
		case 'folder': {
			const childPart =
				meta.childCount !== undefined
					? `${meta.childCount} ${meta.childCount === 1 ? 'item' : 'items'}`
					: '';
			const sizePart =
				meta.folderTotalBytes !== undefined ? formatBytes(meta.folderTotalBytes) : '';
			return {
				line1: [childPart, sizePart].filter(Boolean).join(' · '),
				line2: formatShortDate(meta.modifiedAt),
			};
		}
		case 'exe':
		case 'script': {
			return {
				line1: meta.sizeBytes !== undefined ? formatBytes(meta.sizeBytes) : '',
				line2: formatShortDate(meta.modifiedAt),
			};
		}
		case 'url': {
			return {
				line1: meta.urlDomain ?? '',
				line2: '',
			};
		}
		default:
			return { line1: '', line2: '' };
	}
}
