import { describe, expect, it } from 'vitest';
import { getErrorCode, getErrorMessage } from './format-error';

/**
 * T4-1 (PR-Z2): format-error pure function test。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T4 phase、AppError 形式互換)
 *
 * scope: getErrorMessage / getErrorCode が Error / AppError 形式 / string / unknown 各形で
 * 安全に message / code を取り出すこと。
 */
describe('getErrorMessage', () => {
	it('Error instance は message を返す', () => {
		expect(getErrorMessage(new Error('boom'))).toBe('boom');
	});

	it('AppError 形式 ({ code, message }) は message を返す', () => {
		expect(getErrorMessage({ code: 'IO_ERROR', message: 'ファイルが見つかりません' })).toBe(
			'ファイルが見つかりません',
		);
	});

	it('string はそのまま返す', () => {
		expect(getErrorMessage('plain text')).toBe('plain text');
	});

	it('unknown (number / null / undefined) は string 化', () => {
		expect(getErrorMessage(null)).toBeTypeOf('string');
		expect(getErrorMessage(undefined)).toBeTypeOf('string');
		expect(getErrorMessage(42)).toBeTypeOf('string');
	});
});

describe('getErrorCode', () => {
	it('AppError 形式から code を取り出す', () => {
		expect(getErrorCode({ code: 'IO_ERROR', message: 'x' })).toBe('IO_ERROR');
	});

	it('AppError でない (Error / string / null) は null', () => {
		expect(getErrorCode(new Error('boom'))).toBeNull();
		expect(getErrorCode('plain')).toBeNull();
		expect(getErrorCode(null)).toBeNull();
	});
});
