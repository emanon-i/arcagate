import { describe, expect, it } from 'vitest';
import { hasActiveOverride } from './per-card-override';

describe('hasActiveOverride', () => {
	it('null / undefined / empty string → false', () => {
		expect(hasActiveOverride(null)).toBe(false);
		expect(hasActiveOverride(undefined)).toBe(false);
		expect(hasActiveOverride('')).toBe(false);
	});

	it('valid non-empty JSON object → true', () => {
		expect(hasActiveOverride('{"background":"none"}')).toBe(true);
	});

	it('empty object → false', () => {
		expect(hasActiveOverride('{}')).toBe(false);
	});

	it('malformed JSON → false', () => {
		expect(hasActiveOverride('{not json}')).toBe(false);
		expect(hasActiveOverride('null')).toBe(false);
		expect(hasActiveOverride('[]')).toBe(false);
	});
});
