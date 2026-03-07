import { describe, expect, it } from 'vitest';
import { detectType } from './detect-type';

describe('detectType', () => {
	it('detects URL with http', () => {
		expect(detectType('http://example.com')).toBe('url');
	});

	it('detects URL with https', () => {
		expect(detectType('https://example.com/page')).toBe('url');
	});

	it('detects .exe', () => {
		expect(detectType('C:\\Program Files\\app.exe')).toBe('exe');
	});

	it('detects .msi', () => {
		expect(detectType('C:\\Downloads\\setup.msi')).toBe('exe');
	});

	it('detects .com executable', () => {
		expect(detectType('C:\\Windows\\cmd.com')).toBe('exe');
	});

	it('detects .ps1 script', () => {
		expect(detectType('C:\\Scripts\\deploy.ps1')).toBe('script');
	});

	it('detects .bat script', () => {
		expect(detectType('C:\\run.bat')).toBe('script');
	});

	it('detects .cmd script', () => {
		expect(detectType('build.cmd')).toBe('script');
	});

	it('detects .sh script', () => {
		expect(detectType('/usr/local/bin/start.sh')).toBe('script');
	});

	it('detects .py script', () => {
		expect(detectType('script.py')).toBe('script');
	});

	it('detects .js script', () => {
		expect(detectType('index.js')).toBe('script');
	});

	it('detects folder hint with trailing backslash', () => {
		expect(detectType('C:\\Users\\user\\Documents\\')).toBe('folder');
	});

	it('detects folder hint with trailing slash', () => {
		expect(detectType('/home/user/projects/')).toBe('folder');
	});

	it('defaults to exe for unknown extension', () => {
		expect(detectType('C:\\app\\tool')).toBe('exe');
	});

	it('trims whitespace', () => {
		expect(detectType('  https://example.com  ')).toBe('url');
	});
});
