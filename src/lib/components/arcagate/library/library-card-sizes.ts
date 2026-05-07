/**
 * Phase L-3 (2026-05-07 user 検収 Library 真因 #3):
 * itemSize-only な LibraryCard class derive を共有 module で hoist。
 *
 * LibraryCard 内で 5 個の $derived (iconClassFilled / iconClassNone / labelPadClass /
 * labelFontClass / targetFontClass) が itemSize にだけ依存していたが、
 * 690 cards × 5 = 3450 reactive deps が configStore.itemSize 変更で全 trigger され、
 * JS longtask 1.2 秒の主因だった。
 *
 * sizeClasses は親 (LibraryView / LibraryItemPicker) で 1 回だけ derive して props 配布。
 * reactive deps を 690 → 1 に削減 (3450× 効率化)。
 */
export interface SizeClasses {
	iconClassFilled: string;
	iconClassNone: string;
	labelPadClass: string;
	labelFontClass: string;
	targetFontClass: string;
}

export const SIZE_CLASSES_TABLE: Record<'S' | 'M' | 'L', SizeClasses> = {
	S: {
		iconClassFilled: 'h-10 w-10 object-contain drop-shadow-lg',
		iconClassNone: 'h-12 w-12 object-contain drop-shadow-sm',
		labelPadClass: 'px-2 pb-1.5 pt-3',
		labelFontClass: 'text-xs',
		targetFontClass: 'text-xs',
	},
	M: {
		iconClassFilled: 'h-14 w-14 object-contain drop-shadow-lg',
		iconClassNone: 'h-16 w-16 object-contain drop-shadow-sm',
		labelPadClass: 'px-3 pb-2 pt-6',
		labelFontClass: 'text-sm',
		targetFontClass: 'text-xs',
	},
	L: {
		iconClassFilled: 'h-20 w-20 object-contain drop-shadow-lg',
		iconClassNone: 'h-24 w-24 object-contain drop-shadow-sm',
		labelPadClass: 'px-3 pb-2 pt-6',
		labelFontClass: 'text-base',
		targetFontClass: 'text-xs',
	},
};

export function getSizeClasses(itemSize: string): SizeClasses {
	return SIZE_CLASSES_TABLE[itemSize as 'S' | 'M' | 'L'] ?? SIZE_CLASSES_TABLE.M;
}
