import { describe, expect, it } from 'vitest';
import type { Aesthetic } from './color';
import {
	BUILTIN_PALETTE_SPECS,
	complementary,
	derivePalette,
	deriveSecondary,
	ensureAaAgainstWhite,
	formatOklch,
	type Oklch,
	PALETTE_METHODOLOGY,
	wcagContrastOklch,
} from './derive-palette';

/**
 * derivePalette 純関数の test (v2 methodology)。 各 transform 軸の **規則性** を assert。
 *
 * 検証観点:
 * 1. canonical hue 固定 (warn=75 / error=25 / success=150 / info=230)
 * 2. aesthetic chroma scale (brutalist:glass:neumorph = 1.5:1.0:0.6)
 * 3. base lightness 差 (dark - light = 0.12 = 1 perceptual step)
 * 4. semantic Δl: error=0, info=+0.04, success=+0.06, warn=+0.08 (monotonic)
 * 5. secondary = split-complementary (h+150°)
 * 6. WCAG: pale primary が auto-adjust される (builtin L=0.5 は no-op)
 * 7. 6 builtin spec の derive 結果が migration 044 SQL と byte-for-byte 一致 (= 同期 gate)
 */

const AESTHETICS: Aesthetic[] = ['glass', 'neumorph', 'brutalist'];
const BASE_THEMES: Array<'dark' | 'light'> = ['dark', 'light'];

function parseOklch(s: string): Oklch {
	const m = /oklch\(([\d.]+) ([\d.]+) ([\d.]+)/.exec(s);
	if (!m) throw new Error(`could not parse oklch: ${s}`);
	return { l: Number(m[1]), c: Number(m[2]), h: Number(m[3]) };
}

describe('formatOklch', () => {
	it('l / c は 3 桁、 h は 1 桁で整形する', () => {
		expect(formatOklch({ l: 0.5, c: 0.14, h: 215 })).toBe('oklch(0.5 0.14 215)');
		// IEEE 754 banker's rounding: 28.45.toFixed(1) → "28.4" (Number.toFixed の仕様)。
		expect(formatOklch({ l: 0.123456, c: 0.0789, h: 28.45 })).toBe('oklch(0.123 0.079 28.4)');
	});

	it('trailing zero は除去する (CSS としては valid)', () => {
		expect(formatOklch({ l: 0.5, c: 0.1, h: 100 })).toBe('oklch(0.5 0.1 100)');
	});
});

describe('deriveSecondary (split-complementary 150°)', () => {
	it('h+150° で secondary を返す (l / c は維持)', () => {
		const p = { l: 0.5, c: 0.14, h: 215 };
		const sec = deriveSecondary(p);
		expect(sec.l).toBe(0.5);
		expect(sec.c).toBe(0.14);
		expect(sec.h).toBe(5); // (215 + 150) % 360 = 365 → 5
	});

	it('h+150 が 360 を超えても 0-360 範囲に巻く', () => {
		expect(deriveSecondary({ l: 0.5, c: 0.1, h: 280 }).h).toBe(70); // (280+150)%360 = 70
		expect(deriveSecondary({ l: 0.5, c: 0.1, h: 350 }).h).toBe(140); // (350+150)%360 = 140
	});

	it('complementary alias は deriveSecondary と同義 (旧 API 互換)', () => {
		const p = { l: 0.5, c: 0.14, h: 215 };
		expect(complementary(p)).toEqual(deriveSecondary(p));
	});
});

describe('ensureAaAgainstWhite (WCAG AA 4.5:1 自動調整)', () => {
	it('既存 builtin の L=0.5 primary は no-op (4.5:1 を既に満たす)', () => {
		for (const spec of BUILTIN_PALETTE_SPECS) {
			const adjusted = ensureAaAgainstWhite(spec.primary);
			expect(adjusted.l, `${spec.id}: L=0.5 primary should not be adjusted down`).toBe(
				spec.primary.l,
			);
		}
	});

	it('pale primary (L=0.9 pastel yellow) は L が下げられて AA を満たす', () => {
		const pale: Oklch = { l: 0.9, c: 0.05, h: 100 };
		const before = wcagContrastOklch(pale, { l: 1, c: 0, h: 0 });
		expect(before, 'baseline: pale primary は white に対し 4.5:1 未満').toBeLessThan(4.5);
		const adjusted = ensureAaAgainstWhite(pale);
		expect(adjusted.l).toBeLessThan(pale.l);
		expect(wcagContrastOklch(adjusted, { l: 1, c: 0, h: 0 })).toBeGreaterThanOrEqual(4.5);
		// hue / chroma は保たれる
		expect(adjusted.c).toBe(pale.c);
		expect(adjusted.h).toBe(pale.h);
	});

	it('返り値の L は [0, 1] 範囲内 (clamp)', () => {
		const extreme: Oklch = { l: 0.999, c: 0.001, h: 0 };
		const adjusted = ensureAaAgainstWhite(extreme);
		expect(adjusted.l).toBeGreaterThanOrEqual(0);
		expect(adjusted.l).toBeLessThanOrEqual(1);
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

describe('derivePalette: aesthetic chroma scale (transform 式の数値検証)', () => {
	it('全 semantic 軸が `SEMANTIC_BASE_CHROMA × AESTHETIC_CHROMA_SCALE[aesthetic]` を満たす', () => {
		const SEMANTIC_KEYS = ['--c-warn', '--c-error', '--c-success', '--c-info'] as const;
		for (const a of AESTHETICS) {
			for (const base of BASE_THEMES) {
				const expectedC =
					PALETTE_METHODOLOGY.SEMANTIC_BASE_CHROMA * PALETTE_METHODOLOGY.AESTHETIC_CHROMA_SCALE[a];
				const p = derivePalette({
					primary: { l: 0.5, c: 0.14, h: 215 },
					aesthetic: a,
					baseTheme: base,
				});
				for (const k of SEMANTIC_KEYS) {
					const c = parseOklch(p[k]).c;
					expect(c, `${a} ${base} ${k}: c = ${expectedC}`).toBeCloseTo(expectedC, 6);
				}
			}
		}
	});

	it('brutalist > glass > neumorph の chroma 比率 (vivid / sophisticated / pastel)', () => {
		const glassC =
			PALETTE_METHODOLOGY.SEMANTIC_BASE_CHROMA * PALETTE_METHODOLOGY.AESTHETIC_CHROMA_SCALE.glass;
		const brutC =
			PALETTE_METHODOLOGY.SEMANTIC_BASE_CHROMA *
			PALETTE_METHODOLOGY.AESTHETIC_CHROMA_SCALE.brutalist;
		const neuC =
			PALETTE_METHODOLOGY.SEMANTIC_BASE_CHROMA *
			PALETTE_METHODOLOGY.AESTHETIC_CHROMA_SCALE.neumorph;
		expect(brutC / glassC).toBeCloseTo(1.5, 6);
		expect(glassC / neuC).toBeCloseTo(1 / 0.6, 6);
		expect(brutC).toBeGreaterThan(glassC);
		expect(glassC).toBeGreaterThan(neuC);
	});
});

describe('derivePalette: base 別 lightness + Δl methodology', () => {
	it('dark base は light base より semantic L が 0.12 高い (1 perceptual step)', () => {
		const SEMANTIC_KEYS = ['--c-warn', '--c-error', '--c-success', '--c-info'] as const;
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
			for (const k of SEMANTIC_KEYS) {
				const lDark = parseOklch(dark[k]).l;
				const lLight = parseOklch(light[k]).l;
				expect(lDark - lLight, `${a} ${k}: dark.l - light.l = 0.12`).toBeCloseTo(0.12, 6);
			}
		}
	});

	it('semantic Δl: error=0, success=+0.06, info=+0.04, warn=+0.08 (monotonic order)', () => {
		const base = derivePalette({
			primary: { l: 0.5, c: 0.14, h: 215 },
			aesthetic: 'glass',
			baseTheme: 'light',
		});
		const lE = parseOklch(base['--c-error']).l;
		const lS = parseOklch(base['--c-success']).l;
		const lI = parseOklch(base['--c-info']).l;
		const lW = parseOklch(base['--c-warn']).l;
		expect(lE).toBeCloseTo(PALETTE_METHODOLOGY.SEMANTIC_BASE_LIGHTNESS.light, 6);
		expect(lS - lE).toBeCloseTo(PALETTE_METHODOLOGY.SEMANTIC_DELTA_L.success, 6);
		expect(lI - lE).toBeCloseTo(PALETTE_METHODOLOGY.SEMANTIC_DELTA_L.info, 6);
		expect(lW - lE).toBeCloseTo(PALETTE_METHODOLOGY.SEMANTIC_DELTA_L.warn, 6);
		// 並び: error < info < success < warn (Δl monotonic)
		expect(lE).toBeLessThan(lI);
		expect(lI).toBeLessThan(lS);
		expect(lS).toBeLessThan(lW);
	});
});

describe('derivePalette: seed echo / secondary auto-derive', () => {
	it('primary は WCAG 通過時はそのまま echo', () => {
		const p = derivePalette({
			primary: { l: 0.5, c: 0.18, h: 123 },
			aesthetic: 'glass',
			baseTheme: 'dark',
		});
		expect(parseOklch(p['--c-primary'])).toEqual({ l: 0.5, c: 0.18, h: 123 });
	});

	it('secondary 未指定なら split-complementary (h+150°) を返す', () => {
		const p = derivePalette({
			primary: { l: 0.5, c: 0.14, h: 215 },
			aesthetic: 'glass',
			baseTheme: 'dark',
		});
		expect(parseOklch(p['--c-secondary'])).toEqual({ l: 0.5, c: 0.14, h: 5 });
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

	it('secondary = null は未指定と同義 (auto split-complementary)', () => {
		const p = derivePalette({
			primary: { l: 0.5, c: 0.14, h: 215 },
			secondary: null,
			aesthetic: 'glass',
			baseTheme: 'dark',
		});
		expect(parseOklch(p['--c-secondary'])).toEqual({ l: 0.5, c: 0.14, h: 5 });
	});

	it('pale primary は WCAG adjust 後、 secondary も adjust 後 primary 由来になる', () => {
		const pale: Oklch = { l: 0.92, c: 0.04, h: 100 };
		const p = derivePalette({ primary: pale, aesthetic: 'glass', baseTheme: 'light' });
		const adjustedP = parseOklch(p['--c-primary']);
		const sec = parseOklch(p['--c-secondary']);
		expect(adjustedP.l).toBeLessThan(pale.l);
		// secondary は adjusted primary の split-complementary
		expect(sec.l).toBe(adjustedP.l);
		expect(sec.c).toBe(adjustedP.c);
		expect(sec.h).toBe((adjustedP.h + 150) % 360);
	});
});

describe('BUILTIN_PALETTE_SPECS: 6 builtin 仕様', () => {
	it('id / base / aesthetic が migration 044 の seed と整合', () => {
		const ids = BUILTIN_PALETTE_SPECS.map((s) => s.id).sort();
		expect(ids).toEqual([
			'brutalist',
			'brutalist-dark',
			'dark',
			'light',
			'neumorph',
			'neumorph-dark',
		]);
		for (const s of BUILTIN_PALETTE_SPECS) {
			if (s.aesthetic === 'glass') expect(s.primary.h).toBe(215);
			if (s.aesthetic === 'brutalist') expect(s.primary.h).toBe(28);
			if (s.aesthetic === 'neumorph') expect(s.primary.h).toBe(280);
		}
	});
});

describe('migration 044 同期 gate (derivePalette ↔ SQL byte-for-byte)', () => {
	// derivePalette の出力で migration 044 の seed が完全一致することを gate。
	// 「derive 関数を変更したら SQL を更新し忘れる」 回帰を防ぐ。
	// 値は formatOklch() 文字列での expect (= SQL に貼り付ける値そのもの)。
	const MIG_044_LITERALS: Record<string, Record<string, string>> = {
		dark: {
			'--c-primary': 'oklch(0.5 0.14 215)',
			'--c-secondary': 'oklch(0.5 0.14 5)',
			'--c-warn': 'oklch(0.8 0.14 75)',
			'--c-error': 'oklch(0.72 0.14 25)',
			'--c-success': 'oklch(0.78 0.14 150)',
			'--c-info': 'oklch(0.76 0.14 230)',
		},
		light: {
			'--c-primary': 'oklch(0.5 0.14 215)',
			'--c-secondary': 'oklch(0.5 0.14 5)',
			'--c-warn': 'oklch(0.68 0.14 75)',
			'--c-error': 'oklch(0.6 0.14 25)',
			'--c-success': 'oklch(0.66 0.14 150)',
			'--c-info': 'oklch(0.64 0.14 230)',
		},
		brutalist: {
			'--c-primary': 'oklch(0.5 0.22 28)',
			'--c-secondary': 'oklch(0.5 0.22 28)',
			'--c-warn': 'oklch(0.68 0.21 75)',
			'--c-error': 'oklch(0.6 0.21 25)',
			'--c-success': 'oklch(0.66 0.21 150)',
			'--c-info': 'oklch(0.64 0.21 230)',
		},
		'brutalist-dark': {
			'--c-primary': 'oklch(0.5 0.2 28)',
			'--c-secondary': 'oklch(0.5 0.2 28)',
			'--c-warn': 'oklch(0.8 0.21 75)',
			'--c-error': 'oklch(0.72 0.21 25)',
			'--c-success': 'oklch(0.78 0.21 150)',
			'--c-info': 'oklch(0.76 0.21 230)',
		},
		neumorph: {
			'--c-primary': 'oklch(0.5 0.1 280)',
			'--c-secondary': 'oklch(0.5 0.1 70)',
			'--c-warn': 'oklch(0.68 0.084 75)',
			'--c-error': 'oklch(0.6 0.084 25)',
			'--c-success': 'oklch(0.66 0.084 150)',
			'--c-info': 'oklch(0.64 0.084 230)',
		},
		'neumorph-dark': {
			'--c-primary': 'oklch(0.5 0.1 280)',
			'--c-secondary': 'oklch(0.5 0.1 70)',
			'--c-warn': 'oklch(0.8 0.084 75)',
			'--c-error': 'oklch(0.72 0.084 25)',
			'--c-success': 'oklch(0.78 0.084 150)',
			'--c-info': 'oklch(0.76 0.084 230)',
		},
	};

	it.each(
		BUILTIN_PALETTE_SPECS,
	)('$id の derivePalette() 出力が migration 044 SQL seed と byte-for-byte 一致', (spec) => {
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
