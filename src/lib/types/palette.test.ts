import { describe, expect, it } from 'vitest';
import type { Item } from '$lib/types/item';
import { entryKey } from '$lib/types/palette';

const mockItem: Item = {
	id: 'item-abc',
	item_type: 'url',
	label: 'Test',
	target: 'https://example.com',
	args: null,
	working_dir: null,
	icon_path: null,
	icon_type: null,
	aliases: [],
	sort_order: 0,
	is_enabled: true,
	is_tracked: false,
	default_app: null,
	created_at: '',
	updated_at: '',
};

describe('entryKey', () => {
	it('item エントリは "item:{id}" を返す', () => {
		expect(entryKey({ kind: 'item', item: mockItem })).toBe('item:item-abc');
	});

	it('calc エントリは "calc:{expression}" を返す', () => {
		expect(entryKey({ kind: 'calc', expression: '1+2*3', result: '7' })).toBe('calc:1+2*3');
	});

	it('clipboard エントリは "cb:{index}" を返す', () => {
		expect(entryKey({ kind: 'clipboard', text: 'hello world', index: 3 })).toBe('cb:3');
	});
});
