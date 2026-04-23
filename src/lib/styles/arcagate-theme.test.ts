import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'arcagate-theme.css'), 'utf-8');

const REQUIRED_MOTION_TOKENS = [
	'--ag-duration-instant',
	'--ag-duration-fast',
	'--ag-duration-normal',
	'--ag-duration-slow',
	'--ag-ease-in-out',
	'--ag-ease-out',
	'--ag-ease-in',
	'--ag-ease-bounce',
];

const REQUIRED_SHADOW_TOKENS = [
	'--ag-shadow-none',
	'--ag-shadow-sm',
	'--ag-shadow-md',
	'--ag-shadow-dialog',
	'--ag-shadow-palette',
];

describe('arcagate-theme.css — motion tokens', () => {
	it.each(REQUIRED_MOTION_TOKENS)('defines %s', (token) => {
		expect(css).toContain(token);
	});
});

describe('arcagate-theme.css — shadow tokens', () => {
	it.each(REQUIRED_SHADOW_TOKENS)('defines %s', (token) => {
		expect(css).toContain(token);
	});
});

describe('arcagate-theme.css — prefers-reduced-motion', () => {
	it('has @media (prefers-reduced-motion: reduce) block', () => {
		expect(css).toContain('prefers-reduced-motion: reduce');
	});

	it('sets --ag-duration-fast to 0ms in reduced motion block', () => {
		const reduceIdx = css.indexOf('prefers-reduced-motion: reduce');
		const reduceBlock = css.slice(reduceIdx);
		expect(reduceBlock).toContain('--ag-duration-fast: 0ms');
	});

	it('sets --ag-duration-normal to 0ms in reduced motion block', () => {
		const reduceIdx = css.indexOf('prefers-reduced-motion: reduce');
		const reduceBlock = css.slice(reduceIdx);
		expect(reduceBlock).toContain('--ag-duration-normal: 0ms');
	});
});
