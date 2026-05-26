import { describe, expect, it } from 'vitest';
import { BG_REF_DARK, BG_REF_LIGHT, randomSeedPair } from './color';

/**
 * `#rrggbb` を [0,1] の (max - min) 「RGB スプレッド」 に変換。
 * 高 chroma 色 (鮮烈) ほど大きく、 低 chroma 色 (グレースケール近) ほど小さい。
 * OKLCH の chroma の **proxy** として使う (厳密変換は不要、 aesthetic の chroma レンジ差を
 * 区別できれば十分)。
 *   - neumorph (chroma 0.02–0.06) → spread ≲ 0.2 (near-grayscale)
 *   - glass    (chroma 0.16–0.22) → spread ~0.35–0.55
 *   - brutalist(chroma 0.18–0.28) → spread ~0.45–0.75 (richer)
 */
function rgbSpread(hex: string): number {
	const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
	if (!m) return 0;
	const r = Number.parseInt(m[1], 16) / 255;
	const g = Number.parseInt(m[2], 16) / 255;
	const b = Number.parseInt(m[3], 16) / 255;
	return Math.max(r, g, b) - Math.min(r, g, b);
}

describe('randomSeedPair', () => {
	// 統計的 verify: 各 aesthetic に対し 80 samples 生成して、 spread の平均が aesthetic の
	// chroma 帯に **整合** することを確認する。 Math.random() は seed 固定できないため、
	// 確率 1 - 1e-9 程度で stable な閾値を選ぶ (chroma 平均がそれぞれ 0.04 / 0.19 / 0.23 で
	// 80 samples の標準誤差を加味)。

	function sampleSpreads(aesthetic: 'glass' | 'neumorph' | 'brutalist', n = 80): number[] {
		const out: number[] = [];
		for (let i = 0; i < n; i++) {
			const pair = randomSeedPair(aesthetic, BG_REF_DARK, '#000000', '#000000');
			out.push(rgbSpread(pair.primary));
		}
		return out;
	}

	function average(xs: number[]): number {
		return xs.reduce((s, x) => s + x, 0) / xs.length;
	}

	it('neumorph: 全 sample が low-chroma (= near-grayscale) になる', () => {
		const spreads = sampleSpreads('neumorph');
		const avg = average(spreads);
		// neumorph の chroma 0.02-0.06 は RGB 上ほぼグレー (spread <= 0.25 が大半)。
		expect(avg).toBeLessThan(0.25);
		// 全 sample が brutalist 領域 (spread >= 0.45) に **絶対** 落ちてはいけない。
		expect(spreads.every((s) => s < 0.45)).toBe(true);
	});

	it('brutalist: 平均 spread が neumorph の 2 倍以上に出る', () => {
		const brutalist = sampleSpreads('brutalist');
		const neumorph = sampleSpreads('neumorph');
		expect(average(brutalist)).toBeGreaterThan(average(neumorph) * 2);
		// brutalist は high-chroma なので、 spread >= 0.5 の sample が過半数を超える。
		const richCount = brutalist.filter((s) => s >= 0.5).length;
		expect(richCount).toBeGreaterThan(brutalist.length / 2);
	});

	it('glass: brutalist と neumorph の中間 chroma 帯に入る', () => {
		const glass = sampleSpreads('glass');
		const neumorph = sampleSpreads('neumorph');
		const brutalist = sampleSpreads('brutalist');
		const avgGlass = average(glass);
		expect(avgGlass).toBeGreaterThan(average(neumorph));
		expect(avgGlass).toBeLessThan(average(brutalist));
	});

	it('aesthetic 不一致を統計的に区別: brutalist vs glass の平均 spread 差が 0.05 以上', () => {
		// ThemeEditor の旧実装は `'glass'` ハードコード → brutalist active でも glass 範囲しか
		// 出ない。 修正後は detectAesthetic('brutalist') が brutalist 範囲で random させるので、
		// 平均 spread に統計的な区別が出る (= 「random しても色が変わらない」 ⑫(b) の根治 verify)。
		const brutalist = sampleSpreads('brutalist');
		const glass = sampleSpreads('glass');
		expect(average(brutalist) - average(glass)).toBeGreaterThan(0.05);
	});

	it('valid hex 形式の primary / secondary を返す (`#rrggbb` 6 桁)', () => {
		// 内部 retry / fallback 経路を問わず、 戻り値が常に 6 桁 hex であることを 16 sample で確認。
		// downstream の `setVar('--c-primary', value)` / `<input type="color">` は 6 桁 hex を要求する。
		for (let i = 0; i < 16; i++) {
			const pair = randomSeedPair('glass', BG_REF_LIGHT, '#000000', '#ffffff');
			expect(pair.primary).toMatch(/^#[0-9a-f]{6}$/i);
			expect(pair.secondary).toMatch(/^#[0-9a-f]{6}$/i);
		}
	});
});
