import { describe, expect, it } from 'vitest';
import { CONFIRMATION_REQUIRED_CODE, isConfirmationRequired } from './launch-errors';

describe('isConfirmationRequired', () => {
	it('matches an AppError with the confirmation-required code', () => {
		expect(
			isConfirmationRequired({ code: CONFIRMATION_REQUIRED_CODE, message: 'echo hello' }),
		).toBe(true);
	});

	it('rejects other AppError codes', () => {
		expect(isConfirmationRequired({ code: 'launch.failed', message: 'x' })).toBe(false);
		expect(isConfirmationRequired({ code: 'not_found', message: 'x' })).toBe(false);
	});

	it('rejects non-object / nullish values', () => {
		expect(isConfirmationRequired(null)).toBe(false);
		expect(isConfirmationRequired(undefined)).toBe(false);
		expect(isConfirmationRequired('launch.confirmation_required')).toBe(false);
		expect(isConfirmationRequired(42)).toBe(false);
	});

	it('rejects an object without a code field', () => {
		expect(isConfirmationRequired({ message: 'x' })).toBe(false);
		expect(isConfirmationRequired({})).toBe(false);
	});
});
