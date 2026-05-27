import { describe, expect, it } from 'vitest';
import type { Aesthetic } from './color';
import {
	BUILTIN_PALETTE_SPECS,
	complementary,
	derivePalette,
	formatOklch,
	type Oklch,
} from './derive-palette';

/**
 * derivePalette 純関数の test。 副作用なし / Math.random / DOM 不使用なので確定的に検証可能。
 *
 * 検証観点:
 * 1. canonical hue 固定: warn=75 / error=25 / success=150 / info=230 が aesthetic × base に
 *    関わらず保持される (= 文化的信号性の不変)。
 * 2. aesthetic 別 chroma 帯: brutalist > glass > neumorph (= 鮮烈さの aesthetic identity)。
 * 3. base 別 lightness: dark base は light base より lightness 高め (= 視認性確保)。
 * 4. secondary 自動派生: 未指定なら primary 補色 (h+180)、 明示指定なら echo。
 * 5. 6 builtin の primary は決まっており (glass=H215, brutalist=H28, neumorph=H280)、
 *    derivePalette が migration 044 seed と完全一致する。
 */

const AESTHETICS: Aesthetic[] = ['glass', 'neumorph', 'brutalist'];
const BASE_THEMES: Array<'dark' | 'light'> = ['dark', 'light'];

function parseOklch(s: string): Oklch {
	// "oklch(L C H)" or "oklch(L C H / A)" を parse (test 用 simple parser)。
	const m = /oklch\(([\d.]+) ([\d.]+) ([\d.]+)/.exec(s);
	if (!m) throw new Error(`could not parse oklch: ${s}`);
	return { l: Number(m[1]), c: Number(m[2]), h: Number(m[3]) };
}

describe('formatOklch', () => {
	it('l / c は 3 桁、 h は 1 桁で整形する', () => {
		expect(formatOklch({ l: 0.5, c: 0.14, h: 215 })).toBe('oklch(0.5 0.14 215)');
		// IEEE 754 banker's rounding: 28.45.toFixed(1) → "28.4" (Number.toFixed の仕様)。
		// CSS としては valid なので test 期待値は実際の round 結果に合わせる。
		expect(formatOklch({ l: 0.123456, c: 0.0789, h: 28.45 })).toBe('oklch(0.123 0.079 28.4)');
	});

	it('trailing zero は除去する (CSS としては valid)', () => {
		expect(formatOklch({ l: 0.5, c: 0.1, h: 100 })).toBe('oklch(0.5 0.1 100)');
	});
});

describe('complementary', () => {
	it('色相 +180° で補色を返す (l / c は維持)', () => {
		const p = { l: 0.5, c: 0.14, h: 215 };
		const sec = complementary(p);
		expect(sec.l).toBe(0.5);
		expect(sec.c).toBe(0.14);
		expect(sec.h).toBe(35);
	});

	it('h+180 が 360 を超えても 0-360 範囲に巻く', () => {
		expect(complementary({ l: 0.5, c: 0.1, h: 280 }).h).toBe(100);
		expect(complementary({ l: 0.5, c: 0.1, h: 350 }).h).toBe(170);
	});
});

describe('derivePalette: canonical hue 固定', () => {
	it.each(AESTHETICS)('aesthetic=%s で warn=75 / error=25 / success=150 / info=230', (a) => {
		for (const base of BASE_THEMES) {
			const p = derivePalette({
				primary: { l: 0.5, c: 0.14, h: 215 },
				aesthetic: a,
				baseTheme: base,
			});
			expect(parseOklch(p['--c-warn']).h).toBe(75);
			expect(parseOklch(p['--c-error']).h).toBe(25);
			expect(parseOklch(p['--c-success']).h).toBe(150);
			expect(parseOklch(p['--c-info']).h).toBe(230);
		}
	});
});

describe('derivePalette: aesthetic 別 chroma 帯', () => {
	it('brutalist > glass > neumorph の chroma 帯 (semantic 全軸で順序が成立)', () => {
		const semanticKeys = ['--c-warn', '--c-error', '--c-success', '--c-info'] as const;
		for (const base of BASE_THEMES) {
			const palettes = {
				neumorph: derivePalette({
					primary: { l: 0.5, c: 0.1, h: 280 },
					aesthetic: 'neumorph',
					baseTheme: base,
				}),
				glass: derivePalette({
					primary: { l: 0.5, c: 0.14, h: 215 },
					aesthetic: 'glass',
					baseTheme: base,
				}),
				brutalist: derivePalette({
					primary: { l: 0.5, c: 0.22, h: 28 },
					aesthetic: 'brutalist',
					baseTheme: base,
				}),
			};
			for (const k of semanticKeys) {
				const cNeu = parseOklch(palettes.neumorph[k]).c;
				const cGla = parseOklch(palettes.glass[k]).c;
				const cBru = parseOklch(palettes.brutalist[k]).c;
				expect(cNeu, `${base} ${k}: neumorph < glass`).toBeLessThan(cGla);
				expect(cGla, `${base} ${k}: glass < brutalist`).toBeLessThanOrEqual(cBru);
			}
		}
	});
});

describe('derivePalette: base 別 lightness', () => {
	it('dark base は light base より semantic l 値が高い (視認性確保)', () => {
		const semanticKeys = ['--c-warn', '--c-error', '--c-success', '--c-info'] as const;
		for (const a of AESTHETICS) {
			const dark = derivePalette({
				primary: { l: 0.5, c: 0.14, h: 215 },
				aesthetic: a,
				baseTheme: 'dark',
			});
			const light = derivePalette({
				primary: { l: 0.5, c: 0.14, h: 215 },
				aesthetic: a,
				baseTheme: 'light',
			});
			for (const k of semanticKeys) {
				const lDark = parseOklch(dark[k]).l;
				const lLight = parseOklch(light[k]).l;
				expect(lDark, `${a} ${k}: dark.l > light.l`).toBeGreaterThan(lLight);
			}
		}
	});
});

describe('derivePalette: seed echo / secondary 自動派生', () => {
	it('primary は入力そのまま echo', () => {
		const p = derivePalette({
			primary: { l: 0.42, c: 0.18, h: 123 },
			aesthetic: 'glass',
			baseTheme: 'dark',
		});
		expect(parseOklch(p['--c-primary'])).toEqual({ l: 0.42, c: 0.18, h: 123 });
	});

	it('secondary 未指定なら primary 補色 (h+180) を返す', () => {
		const p = derivePalette({
			primary: { l: 0.5, c: 0.14, h: 215 },
			aesthetic: 'glass',
			baseTheme: 'dark',
		});
		expect(parseOklch(p['--c-secondary'])).toEqual({ l: 0.5, c: 0.14, h: 35 });
	});

	it('secondary 明示指定なら echo (補色派生しない)', () => {
		const p = derivePalette({
			primary: { l: 0.5, c: 0.14, h: 215 },
			secondary: { l: 0.6, c: 0.2, h: 100 },
			aesthetic: 'glass',
			baseTheme: 'dark',
		});
		expect(parseOklch(p['--c-secondary'])).toEqual({ l: 0.6, c: 0.2, h: 100 });
	});

	it('secondary = null は未指定と同義 (自動補色)', () => {
		const p = derivePalette({
			primary: { l: 0.5, c: 0.14, h: 215 },
			secondary: null,
			aesthetic: 'glass',
			baseTheme: 'dark',
		});
		expect(parseOklch(p['--c-secondary'])).toEqual({ l: 0.5, c: 0.14, h: 35 });
	});
});

describe('BUILTIN_PALETTE_SPECS: 6 builtin 仕様', () => {
	it('id / base / aesthetic が migration 043 の seed と整合', () => {
		const ids = BUILTIN_PALETTE_SPECS.map((s) => s.id).sort();
		expect(ids).toEqual([
			'brutalist',
			'brutalist-dark',
			'dark',
			'light',
			'neumorph',
			'neumorph-dark',
		]);
		// builtin の primary hue: glass=H215, brutalist=H28, neumorph=H280 (audit doc §1.2)
		for (const s of BUILTIN_PALETTE_SPECS) {
			if (s.aesthetic === 'glass') expect(s.primary.h).toBe(215);
			if (s.aesthetic === 'brutalist') expect(s.primary.h).toBe(28);
			if (s.aesthetic === 'neumorph') expect(s.primary.h).toBe(280);
		}
	});

	it('builtin の derivePalette() 出力が canonical hue 4 軸 + primary echo を含む', () => {
		for (const spec of BUILTIN_PALETTE_SPECS) {
			const palette = derivePalette({
				primary: spec.primary,
				secondary: spec.secondary,
				aesthetic: spec.aesthetic,
				baseTheme: spec.baseTheme,
			});
			expect(palette['--c-primary']).toBe(formatOklch(spec.primary));
			expect(parseOklch(palette['--c-warn']).h).toBe(75);
			expect(parseOklch(palette['--c-error']).h).toBe(25);
			expect(parseOklch(palette['--c-success']).h).toBe(150);
			expect(parseOklch(palette['--c-info']).h).toBe(230);
		}
	});
});

describe('migration 044 一致 (derivePalette 出力と SQL seed の同期 gate)', () => {
	// scripts/gen-mig-044.mts の出力を migration 044 に貼り付ける運用 (= 手動 codegen) のため、
	// derive 関数が変わったときに SQL を更新し忘れる回帰を防ぐ。 「SQL 内の semantic 4 軸 + primary +
	// (brutalist のみ secondary) の literal が derivePalette 出力と完全一致」 を gate する。
	// 値の同期は migration 044 が source、 derive 関数の出力で expect する形式。
	const MIG_044_LITERALS: Record<string, Record<string, string>> = {
		dark: {
			'--c-primary': 'oklch(0.5 0.14 215)',
			'--c-warn': 'oklch(0.82 0.15 75)',
			'--c-error': 'oklch(0.68 0.17 25)',
			'--c-success': 'oklch(0.78 0.14 150)',
			'--c-info': 'oklch(0.75 0.14 230)',
		},
		light: {
			'--c-primary': 'oklch(0.5 0.14 215)',
			'--c-warn': 'oklch(0.74 0.16 75)',
			'--c-error': 'oklch(0.58 0.2 25)',
			'--c-success': 'oklch(0.66 0.15 150)',
			'--c-info': 'oklch(0.58 0.16 230)',
		},
		brutalist: {
			'--c-primary': 'oklch(0.5 0.22 28)',
			'--c-secondary': 'oklch(0.5 0.22 28)',
			'--c-warn': 'oklch(0.62 0.18 75)',
			'--c-error': 'oklch(0.52 0.22 25)',
			'--c-success': 'oklch(0.55 0.16 150)',
			'--c-info': 'oklch(0.5 0.2 230)',
		},
		'brutalist-dark': {
			'--c-primary': 'oklch(0.5 0.2 28)',
			'--c-secondary': 'oklch(0.5 0.2 28)',
			'--c-warn': 'oklch(0.7 0.16 75)',
			'--c-error': 'oklch(0.58 0.2 25)',
			'--c-success': 'oklch(0.62 0.15 150)',
			'--c-info': 'oklch(0.6 0.18 230)',
		},
		neumorph: {
			'--c-primary': 'oklch(0.5 0.1 280)',
			'--c-warn': 'oklch(0.72 0.11 75)',
			'--c-error': 'oklch(0.6 0.14 25)',
			'--c-success': 'oklch(0.66 0.1 150)',
			'--c-info': 'oklch(0.62 0.1 230)',
		},
		'neumorph-dark': {
			'--c-primary': 'oklch(0.5 0.1 280)',
			'--c-warn': 'oklch(0.8 0.13 75)',
			'--c-error': 'oklch(0.68 0.16 25)',
			'--c-success': 'oklch(0.74 0.13 150)',
			'--c-info': 'oklch(0.7 0.12 230)',
		},
	};

	it.each(
		BUILTIN_PALETTE_SPECS,
	)('$id の derivePalette() 出力が migration 044 の seed と byte-for-byte 一致', (spec) => {
		const palette = derivePalette({
			primary: spec.primary,
			secondary: spec.secondary,
			aesthetic: spec.aesthetic,
			baseTheme: spec.baseTheme,
		});
		const expected = MIG_044_LITERALS[spec.id];
		expect(expected, `MIG_044_LITERALS missing ${spec.id}`).toBeDefined();
		for (const [key, value] of Object.entries(expected)) {
			expect(palette[key as keyof typeof palette], `${spec.id} ${key}`).toBe(value);
		}
	});
});
