/**
 * 色弱シミュレーション + ΔE76 (PR #590)。
 *
 * # なぜ必要か
 *
 * 成人男性 ~8% / 全人口 ~4-5% が CVD (Color Vision Deficiency)。 もっとも頻度の高い 2 型:
 *   - **deuteranopia / deuteranomaly** (緑色覚異常、 全 CVD の ~75%)
 *   - **protanopia / protanomaly** (赤色覚異常、 全 CVD の ~20%)
 * は、 warn (黄) / error (赤) / success (緑) の弁別を直接損なう。 derivePalette の
 * canonical hue (75 / 25 / 150 / 230) が CVD 後も区別可能であることを機械検証して、
 * 「色だけで信号を作っている」 という日常 UI の前提が壊れていないかを gate する。
 *
 * # アルゴリズム
 *
 * Brettel-Vienot-Mollon 1997 + Machado et al. 2009 ハイブリッド (各論文の Daltonization 用
 * 線形変換行列をそのまま使用)。 **linear sRGB 空間で適用** (gamma decode 後 → 変換 → gamma encode)。
 *
 * 行列出典 (Machado et al. 2009, Table 2 "Severity 1.0"):
 *   - https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html
 *   - Daltonization-ready (severity=1.0 = 完全色弱、 = dichromacy)
 *
 * ΔE は **CIELAB ΔE76** (Euclidean distance) を使用 (簡易だが「区別できる / できない」 判定には十分):
 *   - ΔE76 < 1.0: 識別困難
 *   - ΔE76 < 2.3: 訓練された目で識別可能 (JND ≈ 1.0 だが平均 2.3)
 *   - ΔE76 >= 10: 明確に別色 (本 module の semantic 4 軸 threshold)
 *
 * 参考: ΔE2000 はより perceptually accurate だが、 計算が複雑で本 use case (semantic axes
 * の区別性) では ΔE76 で十分な感度がある。
 */
import { hexToLinearRgb, type LinearRgb } from './color';

/**
 * Machado et al. 2009 severity=1.0 (完全 dichromacy) の linear sRGB 変換行列。
 * row-major: [r' g' b'] = M × [r g b]^T (linear sRGB、 [0, 1] 範囲想定)。
 */
const CVD_MATRICES = {
	deuteranopia: [
		[0.367_322_1, 0.860_645_5, -0.227_967_6],
		[0.280_085_5, 0.672_501_5, 0.047_413],
		[-0.011_771, 0.042_530_9, 0.969_240_1],
	],
	protanopia: [
		[0.152_286, 1.052_583, -0.204_869],
		[0.114_503, 0.786_281, 0.099_216],
		[-0.003_882, -0.048_116, 1.051_998],
	],
} as const;

export type CvdType = keyof typeof CVD_MATRICES;

function applyMatrix(rgb: LinearRgb, m: readonly (readonly number[])[]): LinearRgb {
	return {
		r: m[0][0] * rgb.r + m[0][1] * rgb.g + m[0][2] * rgb.b,
		g: m[1][0] * rgb.r + m[1][1] * rgb.g + m[1][2] * rgb.b,
		b: m[2][0] * rgb.r + m[2][1] * rgb.g + m[2][2] * rgb.b,
	};
}

function clamp01(v: number): number {
	return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** linear sRGB を色弱変換後の linear sRGB に変換 (clamp なし、 ΔE 計算用に linear のまま返す)。 */
export function simulateCvdLinear(rgb: LinearRgb, type: CvdType): LinearRgb {
	return applyMatrix(rgb, CVD_MATRICES[type]);
}

/** `#rrggbb` → CVD 後の linear sRGB (ΔE 計算 / 内部用)。 */
export function simulateCvdLinearFromHex(hex: string, type: CvdType): LinearRgb {
	return simulateCvdLinear(hexToLinearRgb(hex), type);
}

// ═══════════════════════════════════════════════════════════════════════════
// ΔE76 (CIELAB Euclidean distance) — linear sRGB → CIE XYZ (D65) → CIELAB → ΔE
// ═══════════════════════════════════════════════════════════════════════════

/** linear sRGB → CIE XYZ (D65 white point)。 sRGB → XYZ の standard matrix (Lindbloom)。 */
function linearRgbToXyz(rgb: LinearRgb): { x: number; y: number; z: number } {
	return {
		x: 0.412_456_4 * rgb.r + 0.357_576_1 * rgb.g + 0.180_437_5 * rgb.b,
		y: 0.212_672_9 * rgb.r + 0.715_152_2 * rgb.g + 0.072_175 * rgb.b,
		z: 0.019_333_9 * rgb.r + 0.119_192 * rgb.g + 0.950_304_1 * rgb.b,
	};
}

/** CIE XYZ → CIELAB (D65 reference white)。 */
function xyzToLab(xyz: { x: number; y: number; z: number }): {
	L: number;
	a: number;
	b: number;
} {
	// D65 reference white (CIE 1931 2° observer)
	const Xn = 0.950_47;
	const Yn = 1.0;
	const Zn = 1.088_83;
	const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27) * t + 16 / 116);
	const fx = f(xyz.x / Xn);
	const fy = f(xyz.y / Yn);
	const fz = f(xyz.z / Zn);
	return {
		L: 116 * fy - 16,
		a: 500 * (fx - fy),
		b: 200 * (fy - fz),
	};
}

/** linear sRGB → CIELAB (ΔE76 計算入口)。 channel は [0, 1] にハードクランプしてから XYZ 化。 */
export function linearRgbToLab(rgb: LinearRgb): { L: number; a: number; b: number } {
	return xyzToLab(linearRgbToXyz({ r: clamp01(rgb.r), g: clamp01(rgb.g), b: clamp01(rgb.b) }));
}

/**
 * ΔE76 (CIELAB Euclidean distance)。 入力は linear sRGB (= CVD 変換後の値も含む) で渡す。
 * 結果は 「ΔE76 単位での色差」 で、 一般に >= 10 で「明確に別色」 と感じる。
 */
export function deltaE76Linear(a: LinearRgb, b: LinearRgb): number {
	const la = linearRgbToLab(a);
	const lb = linearRgbToLab(b);
	return Math.sqrt((la.L - lb.L) ** 2 + (la.a - lb.a) ** 2 + (la.b - lb.b) ** 2);
}

/** `#rrggbb` × `#rrggbb` の ΔE76 (色弱 simulator と組み合わせる primary API)。 */
export function deltaE76Hex(hex1: string, hex2: string): number {
	return deltaE76Linear(hexToLinearRgb(hex1), hexToLinearRgb(hex2));
}

/**
 * 2 色を指定 CVD type で simulate した後の ΔE76 を返す。
 * derivePalette の semantic 4 軸 (warn / error / success / info) を pairwise 評価して、
 * 「色弱者でも信号が区別可能」 を test で gate するための primary API。
 */
export function deltaE76AfterCvdHex(hex1: string, hex2: string, type: CvdType): number {
	return deltaE76Linear(simulateCvdLinearFromHex(hex1, type), simulateCvdLinearFromHex(hex2, type));
}
