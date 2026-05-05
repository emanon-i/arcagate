import { describe, expect, it } from 'vitest';
import { normalizeWheelStep } from './wheel-normalize';

describe('normalizeWheelStep', () => {
	it('deltaY = 0 / NaN は 0 (no-op)', () => {
		expect(normalizeWheelStep({ deltaY: 0 })).toBe(0);
		expect(normalizeWheelStep({ deltaY: NaN })).toBe(0);
		expect(normalizeWheelStep({ deltaY: Infinity })).toBe(0);
	});

	it('mouse wheel typical (deltaY=120, PIXEL) は ±10 (cap)', () => {
		expect(normalizeWheelStep({ deltaY: -120, deltaMode: 0 })).toBe(10);
		expect(normalizeWheelStep({ deltaY: 120, deltaMode: 0 })).toBe(-10);
	});

	it('trackpad smooth (deltaY=3, PIXEL) は ±2 (min clamp)', () => {
		expect(normalizeWheelStep({ deltaY: 3, deltaMode: 0 })).toBe(-2);
		expect(normalizeWheelStep({ deltaY: -3, deltaMode: 0 })).toBe(2);
	});

	it('LINE mode (deltaY=1, LINE=1) は 16px-equivalent → step 1.33 → clamp 2', () => {
		expect(normalizeWheelStep({ deltaY: 1, deltaMode: 1 })).toBe(-2);
	});

	it('LINE mode (deltaY=8, LINE=1) は 128px → step 10 (cap)', () => {
		expect(normalizeWheelStep({ deltaY: 8, deltaMode: 1 })).toBe(-10);
	});

	it('PAGE mode (deltaY=1, PAGE=2) は 100px → step 8', () => {
		expect(normalizeWheelStep({ deltaY: 1, deltaMode: 2 })).toBe(-8);
	});

	it('deltaMode 未指定 (undefined) は PIXEL 扱い', () => {
		expect(normalizeWheelStep({ deltaY: 60 })).toBe(-5);
	});

	it('小数 pxFactor の計算が安定 (deltaY=15、PIXEL → step 1.25 → clamp 2)', () => {
		expect(normalizeWheelStep({ deltaY: 15, deltaMode: 0 })).toBe(-2);
	});

	it('sign は厳格 (-0.001 で正側 step を返す)', () => {
		// -0.001 * 1 / 12 = -0.000083、Math.round → 0、clamp で 2
		expect(normalizeWheelStep({ deltaY: -0.001, deltaMode: 0 })).toBe(2);
	});
});
