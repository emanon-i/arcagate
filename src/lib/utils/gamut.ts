/**
 * sRGB gamut clipping (PR #590)。
 *
 * oklch perceptual uniformity を活用した手 transform (derivePalette の chroma scale ×
 * canonical hue) は、 brutalist (chroma 0.21) で hue/lightness 組合せによっては
 * **sRGB gamut 外** に落ちる可能性がある (linear sRGB channel が [0,1] を超える / 負値)。
 *
 * CSS の `oklch(L C H)` は gamut 外でも parse 自体は valid だが、 browser が channel を
 * 0/1 に hard-clamp する → 結果として **hue が想定外に shift** する (= 信号性が壊れる)。
 *
 * 本 module は「hue を保ったまま chroma を下げて sRGB に収める」 algorithm:
 *   1. `inSrgbGamut(o)` — linear sRGB channel が全て [0, 1] 範囲内かを check (許容誤差 1e-6)
 *   2. `clampToGamut(o)` — 範囲外なら chroma を 0.005 step で下げ、 sRGB に収まる最大 chroma を返す
 *       (max 100 step = chroma 0.5 まで下げる、 通常 derivePalette の brutalist 0.21 は数 step で収束)。
 *
 * 引用: Björn Ottosson "oklab: A perceptual color space for image processing"
 *      (https://bottosson.github.io/posts/oklabgamut/) — gamut intersection の数値解析。
 *      本 module は精度を犠牲にして実装単純化した二分探索なし版 (linear scan、 ~50 iter で収束)。
 */
import { type LinearRgb, type Oklch, oklchToLinearRgb } from './color';

/** linear sRGB channel が [0, 1] 範囲内かを check (浮動小数の許容誤差 1e-6 を考慮)。 */
function channelInRange(v: number, eps = 1e-6): boolean {
	return v >= -eps && v <= 1 + eps;
}

/** oklch が sRGB gamut 内かを判定 (3 channel 全て in-range)。 */
export function inSrgbGamut(o: Oklch): boolean {
	const lin = oklchToLinearRgb(o);
	return channelInRange(lin.r) && channelInRange(lin.g) && channelInRange(lin.b);
}

/**
 * oklch を sRGB gamut に収めるよう **chroma だけ** を下げる (hue / L は保持)。
 * - 既に gamut 内なら no-op で original を返す。
 * - 範囲外なら chroma を `step` (default 0.005) ずつ下げて再 check、 最大 `maxIter` 回試行。
 * - chroma 0 まで下げても収まらない極端な L 値 (例: L < 0 や L > 1) は best-effort で c=0 を返す
 *   (= 完全に無彩色 = 必ず gamut 内、 lightness のみで表現)。
 */
export function clampToGamut(o: Oklch, step = 0.005, maxIter = 100): Oklch {
	if (inSrgbGamut(o)) return o;
	let c = o.c;
	for (let i = 0; i < maxIter; i++) {
		c -= step;
		if (c <= 0) return { l: o.l, c: 0, h: o.h };
		if (inSrgbGamut({ l: o.l, c, h: o.h })) return { l: o.l, c, h: o.h };
	}
	return { l: o.l, c: 0, h: o.h };
}

/** linear sRGB の各 channel を [0, 1] に hard-clamp (gamut 外を見える色に丸める)。 */
export function clampLinearRgb(lin: LinearRgb): LinearRgb {
	return {
		r: lin.r < 0 ? 0 : lin.r > 1 ? 1 : lin.r,
		g: lin.g < 0 ? 0 : lin.g > 1 ? 1 : lin.g,
		b: lin.b < 0 ? 0 : lin.b > 1 ? 1 : lin.b,
	};
}
