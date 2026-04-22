import { describe, expect, it } from 'vitest';
import { formatTarget } from './format-target';

describe('formatTarget', () => {
	it('URL の場合はホスト名を返す', () => {
		expect(formatTarget('https://example.com/path/to/page')).toBe('example.com');
	});

	it('ファイルパス（Windows）の場合はファイル名を返す', () => {
		expect(formatTarget('C:\\Users\\gonda\\AppData\\Roaming\\app.exe')).toBe('app.exe');
	});

	it('ファイルパス（Unix）の場合はファイル名を返す', () => {
		expect(formatTarget('/usr/local/bin/node')).toBe('node');
	});

	it('空文字はそのまま返す', () => {
		expect(formatTarget('')).toBe('');
	});

	it('ファイル名のみの場合はそのまま返す', () => {
		expect(formatTarget('app.exe')).toBe('app.exe');
	});
});
