import { describe, expect, it } from 'vitest';
import { formatTarget } from './format-target';

/**
 * T4-2 (PR-Z3): formatTarget pure function test。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T4 phase、core utility)
 *
 * scope: target を表示用 short 文字列に変換 (URL → hostname / path → 末尾セグメント / 空 → そのまま)。
 */
describe('formatTarget', () => {
	it('URL は hostname を返す', () => {
		expect(formatTarget('https://github.com/foo/bar')).toBe('github.com');
		expect(formatTarget('http://example.com:8080/path')).toBe('example.com');
	});

	it('Windows path は ファイル名を返す', () => {
		expect(formatTarget('C:\\Program Files\\App\\app.exe')).toBe('app.exe');
		expect(formatTarget('D:\\Tools\\bin\\tool.bat')).toBe('tool.bat');
	});

	it('Unix path は ファイル名を返す', () => {
		expect(formatTarget('/usr/local/bin/code')).toBe('code');
		expect(formatTarget('/home/user/script.sh')).toBe('script.sh');
	});

	it('単一ファイル名はそのまま', () => {
		expect(formatTarget('app.exe')).toBe('app.exe');
	});

	it('空文字は空文字', () => {
		expect(formatTarget('')).toBe('');
	});

	it('末尾 separator は無視 (folder path)', () => {
		expect(formatTarget('C:\\Tools\\App\\')).toBe('App');
		expect(formatTarget('/home/user/folder/')).toBe('folder');
	});
});
