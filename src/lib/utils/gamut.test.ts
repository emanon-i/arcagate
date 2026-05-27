import { describe, expect, it } from 'vitest';
import { type Oklch, oklchToLinearRgb } from './color';
import { clampLinearRgb, clampToGamut, inSrgbGamut } from './gamut';

describe('inSrgbGamut', () => {
	it('低 chroma color (L=0.5, c=0.05) は gamut 内 (典型的 sRGB 表現可能色)', () => {
		expect(inSrgbGamut({ l: 0.5, c: 0.05, h: 215 })).toBe(true);
		expect(inSrgbGamut({ l: 0.5, c: 0.05, h: 0 })).toBe(true);
	});

	it('既存 builtin glass primary (L=0.5, c=0.14, h=215) は gamut 外 (中 chroma blue が gamut 限界超過)', () => {
		// 興味深い発見: 長年 builtin として使われてきた oklch(0.5 0.14 215) は実は sRGB gamut 外。
		// browser は hard-clamp で in-gamut に丸めてレンダリングしている (= 視覚的には問題なかったが、
		// derivePalette が正確な in-gamut 値を返すように clampToGamut で対応)。
		expect(inSrgbGamut({ l: 0.5, c: 0.14, h: 215 })).toBe(false);
	});

	it('brutalist warn (L=0.68, c=0.21, h=75) は gamut 外 (yellow 高 chroma 限界超過)', () => {
		expect(inSrgbGamut({ l: 0.68, c: 0.21, h: 75 })).toBe(false);
	});

	it('完全無彩色 (c=0) は L が [0,1] にあれば常に gamut 内', () => {
		expect(inSrgbGamut({ l: 0.0, c: 0, h: 0 })).toBe(true);
		expect(inSrgbGamut({ l: 0.5, c: 0, h: 0 })).toBe(true);
		expect(inSrgbGamut({ l: 1.0, c: 0, h: 0 })).toBe(true);
	});

	it('極端な L (>1) は gamut 外 (linear sRGB が 1 超過)', () => {
		expect(inSrgbGamut({ l: 1.2, c: 0.01, h: 0 })).toBe(false);
	});
});

describe('clampToGamut', () => {
	it('既に gamut 内なら no-op で original object を返す', () => {
		const o: Oklch = { l: 0.5, c: 0.05, h: 215 };
		const clamped = clampToGamut(o);
		expect(clamped).toEqual(o);
	});

	it('gamut 外なら hue / L を保ったまま chroma が下がる', () => {
		const before: Oklch = { l: 0.68, c: 0.21, h: 75 }; // brutalist warn light
		const after = clampToGamut(before);
		expect(after.l, 'L 保持').toBe(before.l);
		expect(after.h, 'hue 保持').toBe(before.h);
		expect(after.c, 'chroma 削減').toBeLessThan(before.c);
		// clamp 後は gamut 内 (許容誤差 1e-6)
		expect(inSrgbGamut(after)).toBe(true);
	});

	it('clamp 後 chroma は 0 以上 (極端な L でも c=0 で必ず gamut 内)', () => {
		const before: Oklch = { l: 1.5, c: 0.5, h: 100 };
		const after = clampToGamut(before);
		expect(after.c).toBeGreaterThanOrEqual(0);
	});

	it('chroma の削減 step は 0.005 (decimal precision の上限)', () => {
		// step=0.005 で linear scan → 結果 chroma は 0.005 の倍数 ± 浮動小数誤差
		const after = clampToGamut({ l: 0.8, c: 0.21, h: 75 });
		const ratio = after.c / 0.005;
		expect(Math.abs(ratio - Math.round(ratio))).toBeLessThan(1e-6);
	});
});

describe('clampLinearRgb', () => {
	it('範囲内なら no-op', () => {
		expect(clampLinearRgb({ r: 0.5, g: 0.3, b: 0.1 })).toEqual({ r: 0.5, g: 0.3, b: 0.1 });
	});

	it('負値 / 1 超過は [0, 1] に hard-clamp', () => {
		expect(clampLinearRgb({ r: -0.2, g: 1.5, b: 0.3 })).toEqual({ r: 0, g: 1, b: 0.3 });
	});
});

describe('integration: oklchToLinearRgb + inSrgbGamut', () => {
	it('linear RGB が [0,1] 範囲内なら inSrgbGamut が true', () => {
		const o: Oklch = { l: 0.6, c: 0.1, h: 100 };
		const lin = oklchToLinearRgb(o);
		const inRange =
			lin.r >= 0 && lin.r <= 1 && lin.g >= 0 && lin.g <= 1 && lin.b >= 0 && lin.b <= 1;
		expect(inSrgbGamut(o)).toBe(inRange);
	});
});
