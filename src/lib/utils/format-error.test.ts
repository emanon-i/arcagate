import { describe, expect, it } from 'vitest';
import { getErrorCode, getErrorMessage } from './format-error';

describe('getErrorMessage', () => {
	it('returns string error as-is', () => {
		expect(getErrorMessage('plain message')).toBe('plain message');
	});

	it('extracts message field from AppError-like object', () => {
		const err = { code: 'launch.failed', message: 'launch failed: target' };
		expect(getErrorMessage(err)).toBe('launch failed: target');
	});

	it('uses non-default toString when no message field', () => {
		const err = { toString: () => 'custom toString' };
		expect(getErrorMessage(err)).toBe('custom toString');
	});

	it('falls back to JSON.stringify for opaque objects', () => {
		const err = { foo: 'bar' };
		expect(getErrorMessage(err)).toBe(JSON.stringify(err));
	});

	it('handles null / undefined / number', () => {
		expect(getErrorMessage(null)).toBe('null');
		expect(getErrorMessage(undefined)).toBe('undefined');
		expect(getErrorMessage(42)).toBe('42');
	});
});

describe('getErrorCode', () => {
	it('returns code field for AppError object', () => {
		expect(getErrorCode({ code: 'db.lock', message: 'x' })).toBe('db.lock');
	});

	it('returns null for non-object', () => {
		expect(getErrorCode('string')).toBeNull();
		expect(getErrorCode(null)).toBeNull();
	});

	it('returns null for object without code', () => {
		expect(getErrorCode({ message: 'x' })).toBeNull();
	});
});
