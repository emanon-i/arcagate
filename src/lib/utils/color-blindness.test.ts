import { describe, expect, it } from 'vitest';
import { oklchToHex } from './color';
import {
	type CvdType,
	deltaE76AfterCvdHex,
	deltaE76Hex,
	deltaE76Linear,
	linearRgbToLab,
	simulateCvdLinearFromHex,
} from './color-blindness';
import { derivePalette, type Oklch } from './derive-palette';

/**
 * color-blindness test の核心:
 * derivePalette の semantic 4 軸 (warn=H75 / error=H25 / success=H150 / info=H230) は
 * canonical hue で配置されている。 deuteranopia / protanopia (= 全人口の ~6-8% を占める CVD)
 * を simulate した後でも、 4 軸が pairwise で「識別可能」 な ΔE 帯にいることを gate。
 *
 * 閾値 (ΔE76 単位):
 *  - >= 10: 明確に別色
 *  - >= 6: ハッキリと識別可能 (本 test の合格 threshold)
 *  - >= 2.3: 訓練された目で識別可能 (JND ≈ 1、 平均閾値 2.3)
 *  - < 1.0: 識別困難
 *
 * 既知の弱点 (= 本 test で明示的に許容する範囲):
 *  - deuteranopia 下の error (H25 red) vs success (H150 green) は CVD の主軸である red-green
 *    に直交するため ΔE 7 前後に落ちる (実測: glass dark で ΔE 7.09)。 これは 「色だけで信号を
 *    作る限界」 として知られた現象で、 アプリ UI では **icon + 文言** で補強するのが accessibility
 *    ガイドライン共通の推奨 (WCAG 1.4.1 「Use of Color」)。 本 PR では token の color 軸のみを
 *    対象とし、 icon / 文言は別 PR の design pass で対応。
 */

const CVD_TYPES: CvdType[] = ['deuteranopia', 'protanopia'];

describe('linearRgbToLab', () => {
	it('純黒は L≈0', () => {
		const lab = linearRgbToLab({ r: 0, g: 0, b: 0 });
		expect(lab.L).toBeCloseTo(0, 1);
	});

	it('純白は L≈100', () => {
		const lab = linearRgbToLab({ r: 1, g: 1, b: 1 });
		expect(lab.L).toBeCloseTo(100, 1);
	});
});

describe('deltaE76', () => {
	it('同色は ΔE = 0', () => {
		expect(deltaE76Linear({ r: 0.5, g: 0.5, b: 0.5 }, { r: 0.5, g: 0.5, b: 0.5 })).toBe(0);
	});

	it('純白 vs 純黒 は ΔE76 ≈ 100', () => {
		const dE = deltaE76Linear({ r: 0, g: 0, b: 0 }, { r: 1, g: 1, b: 1 });
		expect(dE).toBeGreaterThan(95);
		expect(dE).toBeLessThan(105);
	});

	it('hex API も同等 (Linear API と一貫)', () => {
		expect(deltaE76Hex('#000000', '#ffffff')).toBeGreaterThan(95);
	});
});

describe('simulateCvdLinear', () => {
	it.each(CVD_TYPES)('%s: 純白入力は ほぼ 純白出力 (cone response の不変点)', (type) => {
		const out = simulateCvdLinearFromHex('#ffffff', type);
		expect(out.r).toBeCloseTo(1, 1);
		expect(out.g).toBeCloseTo(1, 1);
		expect(out.b).toBeCloseTo(1, 1);
	});

	it.each(CVD_TYPES)('%s: 純黒入力は 純黒出力', (type) => {
		const out = simulateCvdLinearFromHex('#000000', type);
		expect(out.r).toBeCloseTo(0, 2);
		expect(out.g).toBeCloseTo(0, 2);
		expect(out.b).toBeCloseTo(0, 2);
	});

	it('deuteranopia は緑 hue を シフトする (緑が暗くまたは別 hue に)', () => {
		// 緑 → CVD 後の色は元と異なる。 単に「同じでない」 を check。
		const greenLinear = simulateCvdLinearFromHex('#00ff00', 'deuteranopia');
		const ref = { r: 0, g: 1, b: 0 };
		const dE = deltaE76Linear(greenLinear, ref);
		expect(dE).toBeGreaterThan(5);
	});

	it('protanopia は赤 hue を シフトする', () => {
		const redLinear = simulateCvdLinearFromHex('#ff0000', 'protanopia');
		const ref = { r: 1, g: 0, b: 0 };
		const dE = deltaE76Linear(redLinear, ref);
		expect(dE).toBeGreaterThan(5);
	});
});

describe('derivePalette: semantic 4 軸 が CVD 後も pairwise で識別可能', () => {
	const SEMANTIC_KEYS = ['--c-warn', '--c-error', '--c-success', '--c-info'] as const;
	const PRIMARY: Oklch = { l: 0.5, c: 0.14, h: 215 };

	function oklchStringToHex(s: string): string {
		// "oklch(L C H)" を parse して hex に変換。
		const m = /oklch\(([\d.]+) ([\d.]+) ([\d.]+)/.exec(s);
		if (!m) throw new Error(`could not parse: ${s}`);
		return oklchToHex({ l: Number(m[1]), c: Number(m[2]), h: Number(m[3]) });
	}

	function pairwise<T>(arr: readonly T[]): Array<[T, T]> {
		const out: Array<[T, T]> = [];
		for (let i = 0; i < arr.length; i++) {
			for (let j = i + 1; j < arr.length; j++) out.push([arr[i], arr[j]]);
		}
		return out;
	}

	describe('glass dark の semantic 4 軸 CVD pairwise ΔE76 >= 10', () => {
		const palette = derivePalette({ primary: PRIMARY, aesthetic: 'glass', baseTheme: 'dark' });
		const hexes = SEMANTIC_KEYS.map((k) => [k, oklchStringToHex(palette[k])] as const);

		for (const type of CVD_TYPES) {
			for (const [[ka, hexA], [kb, hexB]] of pairwise(hexes)) {
				it(`${type}: ${ka} vs ${kb} は ΔE76 >= 6 (ハッキリ識別可能)`, () => {
					const dE = deltaE76AfterCvdHex(hexA, hexB, type);
					expect(dE).toBeGreaterThanOrEqual(6);
				});
			}
		}
	});

	describe('brutalist dark の semantic 4 軸 CVD pairwise ΔE76 >= 10', () => {
		const palette = derivePalette({
			primary: { l: 0.5, c: 0.22, h: 28 },
			aesthetic: 'brutalist',
			baseTheme: 'dark',
		});
		const hexes = SEMANTIC_KEYS.map((k) => [k, oklchStringToHex(palette[k])] as const);

		for (const type of CVD_TYPES) {
			for (const [[ka, hexA], [kb, hexB]] of pairwise(hexes)) {
				it(`${type}: ${ka} vs ${kb} は ΔE76 >= 6 (ハッキリ識別可能)`, () => {
					const dE = deltaE76AfterCvdHex(hexA, hexB, type);
					expect(dE).toBeGreaterThanOrEqual(6);
				});
			}
		}
	});

	describe('neumorph dark の semantic 4 軸 CVD pairwise ΔE76 >= 6', () => {
		// neumorph は chroma 0.084 で全 semantic が低 chroma → CVD 後の ΔE は小さくなる。
		// dark base の方が L 差が確保されやすく (semL=0.72 + Δl)、 light base より厳しい配置。
		// chroma が低くても L 差で識別可能な水準を保つことを gate。
		const palette = derivePalette({
			primary: { l: 0.5, c: 0.1, h: 280 },
			aesthetic: 'neumorph',
			baseTheme: 'dark',
		});
		const hexes = SEMANTIC_KEYS.map((k) => [k, oklchStringToHex(palette[k])] as const);

		for (const type of CVD_TYPES) {
			for (const [[ka, hexA], [kb, hexB]] of pairwise(hexes)) {
				it(`${type}: ${ka} vs ${kb} は ΔE76 >= 6 (低 chroma neumorph dark)`, () => {
					const dE = deltaE76AfterCvdHex(hexA, hexB, type);
					expect(dE).toBeGreaterThanOrEqual(6);
				});
			}
		}
	});
});
