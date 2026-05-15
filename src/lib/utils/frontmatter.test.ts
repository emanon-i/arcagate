import { describe, expect, it } from 'vitest';
import { parseFrontmatterPairs } from './frontmatter';

describe('parseFrontmatterPairs (K-9)', () => {
	it('単純な key-value のみの YAML を pair 配列に変換', () => {
		const raw = 'title: My Note\nauthor: Alice\ntags: book';
		expect(parseFrontmatterPairs(raw)).toEqual([
			{ key: 'title', value: 'My Note' },
			{ key: 'author', value: 'Alice' },
			{ key: 'tags', value: 'book' },
		]);
	});

	it('空 value をサポート', () => {
		const raw = 'draft:\nstatus: idea';
		expect(parseFrontmatterPairs(raw)).toEqual([
			{ key: 'draft', value: '' },
			{ key: 'status', value: 'idea' },
		]);
	});

	it('行頭 # コメントと空行を無視', () => {
		const raw = '# header comment\n\ntitle: Foo\n# inline-ish comment\n';
		expect(parseFrontmatterPairs(raw)).toEqual([{ key: 'title', value: 'Foo' }]);
	});

	it('YAML array / nested など非対応行は空配列で bail out (raw fallback)', () => {
		const raw = 'tags:\n  - one\n  - two\n';
		expect(parseFrontmatterPairs(raw)).toEqual([]);
	});

	it('空文字 / whitespace のみ → 空配列', () => {
		expect(parseFrontmatterPairs('')).toEqual([]);
		expect(parseFrontmatterPairs('   \n\t\n')).toEqual([]);
	});

	it('quote はそのまま残す (Obsidian Properties も quote 表示する)', () => {
		const raw = 'name: "Alice Bob"';
		expect(parseFrontmatterPairs(raw)).toEqual([{ key: 'name', value: '"Alice Bob"' }]);
	});
});
