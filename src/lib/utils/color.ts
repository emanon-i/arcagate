/**
 * Design tokens v2 — color science helpers.
 *
 * seed (--c-primary / --c-secondary) を色彩学的に生成 / 検証する。
 * 派生 token は CSS 側 (oklch(from …) / color-mix()) が計算するため、
 * ここでは「seed を決める」 / 「WCAG コントラストを検証する」 だけを担う。
 */

// PH-CF-800 F1: HUD は user 判断で builtin から削除。 aesthetic axis は 3 軸に縮約。
export type Aesthetic = 'glass' | 'neumorph' | 'brutalist';

export interface Oklch {
	l: number;
	c: number;
	h: number;
}

export interface LinearRgb {
	r: number;
	g: number;
	b: number;
}

/**
 * oklch → linear sRGB (Björn Ottosson の oklab 変換)。
 * PR #590 で gamut / APCA / 色弱シミュレーション用に export 化 (旧 private 化は維持して
 * 重複実装を避ける)。 戻り値の channel は **gamut 外を示す負値や 1 超過もそのまま返す**
 * (clamp は呼び出し側の `clamp01` で行う、 = gamut 判定で out-of-range を検出する目的)。
 */
export function oklchToLinearRgb({ l: L, c, h }: Oklch): LinearRgb {
	const hr = (h * Math.PI) / 180;
	const a = c * Math.cos(hr);
	const b = c * Math.sin(hr);

	const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = L - 0.0894841775 * a - 1.291485548 * b;

	const l3 = l_ * l_ * l_;
	const m3 = m_ * m_ * m_;
	const s3 = s_ * s_ * s_;

	return {
		r: 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
		g: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
		b: -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
	};
}

function clamp01(v: number): number {
	return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** linear → gamma-encoded sRGB channel。 */
function linearToSrgb(v: number): number {
	const x = clamp01(v);
	return x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055;
}

function channelToHex(v: number): string {
	return Math.round(clamp01(v) * 255)
		.toString(16)
		.padStart(2, '0');
}

/** oklch 値を `#rrggbb` に変換 (color picker / 保存用)。 */
export function oklchToHex(o: Oklch): string {
	const lin = oklchToLinearRgb(o);
	return `#${channelToHex(linearToSrgb(lin.r))}${channelToHex(linearToSrgb(lin.g))}${channelToHex(
		linearToSrgb(lin.b),
	)}`;
}

/**
 * `#rrggbb` → linear sRGB。 PR #590 で gamut / 色弱シミュレーション用に export 化。
 */
export function hexToLinearRgb(hex: string): LinearRgb {
	const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
	const n = m ? Number.parseInt(m[1], 16) : 0;
	const toLinear = (srgb: number) =>
		srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
	return {
		r: toLinear(((n >> 16) & 0xff) / 255),
		g: toLinear(((n >> 8) & 0xff) / 255),
		b: toLinear((n & 0xff) / 255),
	};
}

/** WCAG 2.x relative luminance。 */
function relativeLuminance(hex: string): number {
	const { r, g, b } = hexToLinearRgb(hex);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG コントラスト比 (1〜21)。 */
export function contrastRatio(hexA: string, hexB: string): number {
	const la = relativeLuminance(hexA);
	const lb = relativeLuminance(hexB);
	const lighter = Math.max(la, lb);
	const darker = Math.min(la, lb);
	return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 任意の CSS color 式 (oklch(...) / var(--c-*) / 名前付き色 等) を `#rrggbb` に解決する。
 * ブラウザに計算させる (getComputedStyle の color は常に rgb(...) を返す) ため、
 * oklch / color-mix 等 v2 の派生式も含めて確実に hex 化できる。
 */
export function cssColorToHex(expr: string): string {
	if (typeof document === 'undefined') return '#000000';
	const probe = document.createElement('span');
	probe.style.color = expr;
	probe.style.display = 'none';
	document.body.appendChild(probe);
	const resolved = getComputedStyle(probe).color;
	probe.remove();
	const m = /rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(resolved);
	if (!m) return '#000000';
	const toHex = (s: string) => Math.round(Number(s)).toString(16).padStart(2, '0');
	return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
}

/** custom theme の random 生成 / コントラスト検証で使う theme base 別の代表背景色。 */
export const BG_REF_DARK = '#1a1d24';
export const BG_REF_LIGHT = '#fbfbfc';

/** aesthetic ごとの chroma / lightness レンジ (spec D)。 */
const AESTHETIC_RANGE: Record<Aesthetic, { c: [number, number]; l: [number, number] }> = {
	glass: { c: [0.16, 0.22], l: [0.58, 0.7] },
	neumorph: { c: [0.02, 0.06], l: [0.85, 0.95] },
	brutalist: { c: [0.18, 0.28], l: [0.55, 0.65] },
};

/** harmony angle 候補 (補色 / 三角 / 類似 等)。 */
const HARMONY_ANGLES = [30, 60, 120, 150, 180];

function rand(min: number, max: number): number {
	return min + Math.random() * (max - min);
}

function pick<T>(arr: readonly T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

export interface SeedPair {
	primary: string;
	secondary: string;
}

/**
 * aesthetic に応じた chroma/lightness レンジでハーモニーな primary/secondary
 * pair を生成する。 secondary は背景 (bgHex) と WCAG AA (>=3:1) を満たすまで
 * 最大 10 回 re-roll、 最終的に落ちたら fallbackSecondary を返す。
 */
export function randomSeedPair(
	aesthetic: Aesthetic,
	bgHex: string,
	fallbackPrimary: string,
	fallbackSecondary: string,
): SeedPair {
	const range = AESTHETIC_RANGE[aesthetic];
	const baseHue = rand(0, 360);
	const primary = oklchToHex({
		l: rand(range.l[0], range.l[1]),
		c: rand(range.c[0], range.c[1]),
		h: baseHue,
	});

	for (let attempt = 0; attempt < 10; attempt++) {
		const angle = pick(HARMONY_ANGLES) * (Math.random() < 0.5 ? -1 : 1);
		const secondary = oklchToHex({
			l: rand(range.l[0], range.l[1]),
			c: rand(range.c[0], range.c[1]),
			h: (baseHue + angle + 360) % 360,
		});
		if (contrastRatio(secondary, bgHex) >= 3 && contrastRatio(primary, secondary) >= 1.25) {
			return { primary, secondary };
		}
	}
	return { primary: fallbackPrimary, secondary: fallbackSecondary };
}
