import { describe, expect, it } from 'vitest';
import {
	clampGitPollIntervalSec,
	DEFAULT_GIT_POLL_INTERVAL_SEC,
	MAX_GIT_POLL_INTERVAL_SEC,
	MIN_GIT_POLL_INTERVAL_SEC,
} from './git-poll';

/**
 * W-10 (2026-05-19): git poll 間隔 clamp の pure function test。
 * 引用元: docs/l2_foundation/features/widgets/projects.md「poll 間隔を短くしすぎない (最小 10 秒)」
 */
describe('clampGitPollIntervalSec', () => {
	it('clamps a below-minimum value (1) up to MIN', () => {
		expect(clampGitPollIntervalSec(1)).toBe(MIN_GIT_POLL_INTERVAL_SEC);
	});

	it('clamps 0 and negative values up to MIN', () => {
		expect(clampGitPollIntervalSec(0)).toBe(MIN_GIT_POLL_INTERVAL_SEC);
		expect(clampGitPollIntervalSec(-5)).toBe(MIN_GIT_POLL_INTERVAL_SEC);
	});

	it('clamps an above-maximum value down to MAX', () => {
		expect(clampGitPollIntervalSec(9999)).toBe(MAX_GIT_POLL_INTERVAL_SEC);
	});

	it('passes through an in-range value unchanged', () => {
		expect(clampGitPollIntervalSec(60)).toBe(60);
		expect(clampGitPollIntervalSec(MIN_GIT_POLL_INTERVAL_SEC)).toBe(MIN_GIT_POLL_INTERVAL_SEC);
		expect(clampGitPollIntervalSec(MAX_GIT_POLL_INTERVAL_SEC)).toBe(MAX_GIT_POLL_INTERVAL_SEC);
	});

	it('falls back to default for non-finite / non-numeric input', () => {
		expect(clampGitPollIntervalSec(Number.NaN)).toBe(DEFAULT_GIT_POLL_INTERVAL_SEC);
		expect(clampGitPollIntervalSec(undefined)).toBe(DEFAULT_GIT_POLL_INTERVAL_SEC);
		expect(clampGitPollIntervalSec('abc')).toBe(DEFAULT_GIT_POLL_INTERVAL_SEC);
	});

	it('the resulting setInterval delay never drops below the 10s contract', () => {
		for (const v of [1, 0, -100, 0.5, 9]) {
			expect(clampGitPollIntervalSec(v) * 1000).toBeGreaterThanOrEqual(
				MIN_GIT_POLL_INTERVAL_SEC * 1000,
			);
		}
	});
});
