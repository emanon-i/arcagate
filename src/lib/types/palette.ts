import type { Item } from './item';

export type PaletteEntry =
	| { kind: 'item'; item: Item }
	| { kind: 'calc'; expression: string; result: string }
	| { kind: 'clipboard'; text: string; index: number };

export function entryKey(entry: PaletteEntry): string {
	switch (entry.kind) {
		case 'item':
			return `item:${entry.item.id}`;
		case 'calc':
			return `calc:${entry.expression}`;
		case 'clipboard':
			return `cb:${entry.index}`;
	}
}

export function entryLabel(entry: PaletteEntry): string {
	switch (entry.kind) {
		case 'item':
			return entry.item.label;
		case 'calc':
			return entry.result;
		case 'clipboard':
			return entry.text;
	}
}
