import { describe, expect, it } from 'vitest';
import { contrastRatio, oklchToHex } from './color';

/**
 * PH-CF-800 F2: builtin 6 本の `--c-primary` ベタ塗りの上に乗る白文字が WCAG AA (4.5:1)
 * 以上のコントラストを満たすことの回帰テスト。
 *
 * `arcagate-theme.css` の `--c-primary` 定義 (L0.50 帯) を TS 側で再現し、 白 (#ffffff) と
 * のコントラストを計算する。 旧実装 (PH-CF-800 以前) は L0.62〜L0.78 で 1.3–4.0:1 と
 * AA 未達だったため `features/cross-cutting/design-tokens.md` §accent コントラスト契約
 * に従い L0.50 帯へ全 builtin で揃えた。
 *
 * builtin の primary を変更する際は本 fixture と CSS の両方を必ず同時に更新すること
 * (どちらかだけ変えると test fail → 契約違反検知)。
 */
const WHITE = '#ffffff';
const WCAG_AA = 4.5;

/** builtin theme の primary 定義 (`--c-primary` の oklch リテラルと一致)。 */
const BUILTIN_PRIMARIES: Record<string, { l: number; c: number; h: number }> = {
	light: { l: 0.5, c: 0.14, h: 215 },
	dark: { l: 0.5, c: 0.14, h: 215 },
	brutalist: { l: 0.5, c: 0.22, h: 28 },
	'brutalist-dark': { l: 0.5, c: 0.2, h: 28 },
	neumorph: { l: 0.5, c: 0.1, h: 280 },
	'neumorph-dark': { l: 0.5, c: 0.1, h: 280 },
};

describe('PH-CF-800 F2: builtin primary WCAG contrast', () => {
	for (const [id, oklch] of Object.entries(BUILTIN_PRIMARIES)) {
		it(`${id}: white-on-primary >= ${WCAG_AA}:1`, () => {
			const primaryHex = oklchToHex(oklch);
			const ratio = contrastRatio(primaryHex, WHITE);
			expect(
				ratio,
				`theme '${id}' primary ${primaryHex} (oklch ${JSON.stringify(oklch)}) vs ${WHITE} = ${ratio.toFixed(2)}:1`,
			).toBeGreaterThanOrEqual(WCAG_AA);
		});
	}
});
