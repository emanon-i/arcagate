/**
 * Design tokens v2 — palette derivation (純関数 / methodology-explicit)。
 *
 * # 設計哲学 (PR #588)
 *
 * primary + secondary + aesthetic + base から、 派生 token (`--c-secondary` + semantic 4 軸 =
 * warn / error / success / info) を **transform 式で計算する純関数**。 副作用なし / Math.random /
 * DOM 不使用なので vitest で確定的に test 可能。
 *
 * ## なぜ transform 式か
 *
 * 旧 v1 は (aesthetic × base × semantic) のルックアップ表で値を持っていた (3×2×3 = 18 magic numbers)。
 * 「なぜこの値か」 が表だけ見ても辿れず、 user が「ここを少し変えたい」 と思っても根拠を読めなかった。
 * v2 (PR #588) は次の 4 つの transform 軸を明示し、 全派生値を **3 つの定数 + 5 つの式** から導く:
 *
 * 1. **`AESTHETIC_CHROMA_SCALE`** — aesthetic の知覚的個性を chroma の倍率 1 軸に集約
 *    - glass: 1.0x (sophisticated baseline)
 *    - brutalist: 1.5x (+50% — vivid manifesto、 高 chroma は brutalism の主張)
 *    - neumorph: 0.6x (-40% — pastel restraint、 低 chroma は neumorph の calm tone を支える)
 *    根拠: ratio 1.5 / 1.0 / 0.6 で brutalist > glass > neumorph の **2.5 倍幅** を作ると、
 *    OKLCh の知覚的均等性により user が「3 aesthetic の色は確かに違う」 と感じられる帯になる
 *    (audit BUILTIN_THEME_DIFF_MATRIX_2026-05-27 §4 B の「目立つべきなのに目立たない」 の根治)。
 *
 * 2. **`SEMANTIC_BASE_LIGHTNESS`** — base theme ごとの semantic 中心 lightness
 *    - light base: 0.60 (= 暗い semantic、 白背景で視認)
 *    - dark base: 0.72 (= 明るい semantic、 黒背景で視認)
 *    差 0.12 は OKLCh の **1 perceptual step** で「明らかに別の lightness」 と感じる最小幅。
 *
 * 3. **`SEMANTIC_DELTA_L`** — semantic 軸ごとの中心 lightness からの ±L 微調整
 *    - error: 0.00 (red は L 中心、 飽和度で signal を作る)
 *    - warn: +0.08 (yellow は L 高めで「明るい注意」 を作る)
 *    - success: +0.06 / info: +0.04 (それぞれ warn より控えめに高 L)
 *    根拠: 同 L のまま全 semantic を並べると「全部似た明るさ」 で 4 軸が見分けにくい。 hue だけでなく
 *    L にも幅を持たせて差別化する (OKLCh は L 軸が perceptual に直交)。
 *
 * 4. **`SECONDARY_SHIFT_DEG`** — primary から secondary を派生する hue shift
 *    - 150° (split-complementary 左側、 = 補色 180° の手前 30°)
 *    - 純補色 (180°) は warm/cool 極端で「ぶつかる」 dyad を作りやすく、 デザイン理論的に避ける慣行が
 *      強い。 split-complementary は調和を保ちつつ十分な hue 距離があり、 universal な harmonious pair。
 *    - 反対側 210° ではなく 150° を選んだ理由: hue 周期は時計回りで色相環 (RYGCBM) を進むため、
 *      150° shift は primary より「少し warm 寄り」 を返す。 builtin (青 H215 → cyan H5 でなく
 *      blue-violet H5 寄り、 赤 H28 → green-yellow H178 寄り) で warm 寄りバランスが自然。
 *
 * ## WCAG コントラスト保証
 *
 * `ensureAaAgainstWhite()`: user が picker で「白っぽすぎる primary」 (例: oklch(0.9 0.05 100))
 * を選んだ場合、 solid primary button に白っぽい text を載せると AA 4.5:1 を切る。
 * primary の **L を 0.02 step で下げて contrast を確保**する (hue / chroma は保つ、 = 「user の
 * 意図する色相」 は壊さない)。 既存 builtin の L=0.5 primary は変更不要 (4.5:1 を満たす)。
 *
 * ## 出力対象
 *
 * 本関数は **literal seed token のみ** を返す (semantic 4 軸 + secondary)。 accent state variants /
 * surface tint / hover / focus は CSS chain (`oklch(from)` / `color-mix(in oklab)`) が runtime
 * 派生する (chain 温存 / ThemeEditor の primary 編集が live で派生に伝播する保証、 PR #586 の
 * dirty トラッキング契約と整合)。
 *
 * ## 引用元
 *
 * - docs/l3_phases/audit/BUILTIN_THEME_DIFF_MATRIX_2026-05-27.md §5
 * - docs/l3_phases/audit/DEV_REVIEW_R4_THREE_DEFECTS_2026-05-27.md §4
 */
import { APCA_BRONZE_LC_BODY, apcaLcAbsHex } from './apca';
import { type Aesthetic, contrastRatio, oklchToHex } from './color';
import { clampToGamut } from './gamut';

export interface Oklch {
	l: number;
	c: number;
	h: number;
}

export interface PaletteInput {
	primary: Oklch;
	/** undefined / null の場合は primary の split-complementary (h+150°) を自動計算。 */
	secondary?: Oklch | null;
	aesthetic: Aesthetic;
	baseTheme: 'dark' | 'light';
}

export interface DerivedPalette {
	'--c-primary': string;
	'--c-secondary': string;
	'--c-warn': string;
	'--c-error': string;
	'--c-success': string;
	/** PR #588 で追加: info 軸 (青-cyan)、 link / hint / detail callout 用。 */
	'--c-info': string;
}

// ═══════════════════════════════════════════════════════════════════════════
// METHODOLOGY CONSTANTS (root reason は file header の「設計哲学」 を参照)
// ═══════════════════════════════════════════════════════════════════════════

/** semantic 軸の canonical hue (文化的信号性のため不変、 aesthetic / base に依存しない)。 */
const SEMANTIC_HUES = {
	warn: 75,
	error: 25,
	success: 150,
	info: 230,
} as const;

/**
 * aesthetic 別 chroma 倍率 (= 知覚的個性を 1 軸に集約)。
 * brutalist 1.5 / glass 1.0 / neumorph 0.6 の **2.5 倍幅** で 3 aesthetic の
 * vividness 差を user が判別可能な perceptual step に乗せる。
 */
const AESTHETIC_CHROMA_SCALE: Record<Aesthetic, number> = {
	glass: 1.0,
	brutalist: 1.5,
	neumorph: 0.6,
};

/**
 * semantic の base chroma (aesthetic scale が掛かる前の anchor)。
 * 0.14 を選んだ根拠: brutalist (×1.5 = 0.21) で signal-color 帯に届き、 neumorph (×0.6 = 0.084)
 * で pastel 帯に収まる。 0.21 は sRGB gamut 内に収まる安全範囲 (hue 75 / 25 / 150 / 230 で gamut
 * clipping を起こさない)。
 */
const SEMANTIC_BASE_CHROMA = 0.14;

/**
 * base theme ごとの semantic 中心 lightness。
 * dark - light = 0.12 は OKLCh の 1 perceptual step (= 「明らかに別の明るさ」 と感じる最小幅)。
 */
const SEMANTIC_BASE_LIGHTNESS: Record<'dark' | 'light', number> = {
	light: 0.6,
	dark: 0.72,
};

/**
 * semantic 軸ごとの中心 lightness からの Δl (OKLCh perceptual uniformity を活用)。
 * 同 L のまま全 semantic を並べると 4 軸が見分けにくいため、 hue だけでなく L にも幅を持たせる。
 * error=0 は red の自然な signal 性、 warn=+0.08 は yellow の「明るい注意」 を担う。
 */
const SEMANTIC_DELTA_L: Record<keyof typeof SEMANTIC_HUES, number> = {
	warn: 0.08,
	error: 0.0,
	success: 0.06,
	info: 0.04,
};

/**
 * secondary 自動派生時の hue shift (split-complementary)。
 * 180° (純補色) ではなく 150° で warm/cool dyad の衝突を避け universal な調和 pair を作る。
 */
const SECONDARY_SHIFT_DEG = 150;

/** WCAG AA 4.5:1 を target に primary を auto-adjust する。 */
const WCAG_AA_RATIO = 4.5;
/** APCA Bronze body text 相当 (Lc 絶対値) — PR #590 で WCAG と並んで gate される。 */
const APCA_TARGET_LC = APCA_BRONZE_LC_BODY;
const WCAG_AUTOADJUST_STEP = 0.02;
const WCAG_AUTOADJUST_MAX_STEPS = 30;

// ═══════════════════════════════════════════════════════════════════════════
// PURE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function clamp01(v: number): number {
	return v < 0 ? 0 : v > 1 ? 1 : v;
}

function formatNumber(n: number, decimals: number): string {
	return Number(n.toFixed(decimals)).toString();
}

/** Oklch を CSS の `oklch(L C H)` 形式に整形 (l/c は 3 桁、 h は 1 桁)。 */
export function formatOklch(o: Oklch): string {
	return `oklch(${formatNumber(o.l, 3)} ${formatNumber(o.c, 3)} ${formatNumber(o.h, 1)})`;
}

/**
 * primary の split-complementary 自動派生 (h+150°、 l / c は維持)。
 * 補色 180° の左側 30° = 純補色のぶつかりを避ける universal harmonic shift。
 */
export function deriveSecondary(primary: Oklch): Oklch {
	return { l: primary.l, c: primary.c, h: (primary.h + SECONDARY_SHIFT_DEG) % 360 };
}

/**
 * 旧 API 互換 alias (BUILTIN_PALETTE_SPECS の secondary 自動派生想定で使われる)。
 * v2 では split-complementary (150°) が default。
 */
export function complementary(primary: Oklch): Oklch {
	return deriveSecondary(primary);
}

/** oklch 2 色の WCAG コントラスト比 (hex 経由で computed)。 */
export function wcagContrastOklch(a: Oklch, b: Oklch): number {
	return contrastRatio(oklchToHex(a), oklchToHex(b));
}

/**
 * primary が white background に対し **WCAG AA (4.5:1) と APCA Lc ≥ 60 の両方を満たす** よう
 * L を自動下げる (PR #590)。
 *
 * 用途: solid primary button の text=white を想定した最も厳しいケース。 ここで両 metric を
 * 保証すれば、 通常運用 (color-mix された accent-text vs accent bg) も大幅に余裕を持ってクリアする。
 *
 * 2 軸 (WCAG luminance ratio + APCA polarity-aware perceptual) を AND で gate する理由:
 * APCA は polarity (光寄り/暗寄り) と body text 想定の応答曲線を考慮するため、 WCAG だけだと
 * 「数値上 AA 通過、 実用上不可読」 (Andrew Somers の APCA paper §3) を起こしうる。 両方を
 * 同時に通過させることで、 数値上の安心と実用上の可読性を both 担保する。
 *
 * hue / chroma は保持し L のみ調整 (user の意図する色相を壊さない)。 L=0 に至っても満たさない
 * 極端な input は best-effort で最低 L を返す。
 *
 * @param targetWcag - WCAG AA threshold (default 4.5、 normal text body)
 * @param targetApcaLc - APCA Lc threshold (default 60、 body text Bronze)
 */
export function ensureAaAgainstWhite(
	primary: Oklch,
	targetWcag = WCAG_AA_RATIO,
	targetApcaLc = APCA_TARGET_LC,
): Oklch {
	const WHITE: Oklch = { l: 1, c: 0, h: 0 };
	const WHITE_HEX = '#ffffff';
	let candidate = primary;
	for (let i = 0; i < WCAG_AUTOADJUST_MAX_STEPS; i++) {
		const wcag = wcagContrastOklch(candidate, WHITE);
		const lc = apcaLcAbsHex(oklchToHex(candidate), WHITE_HEX);
		if (wcag >= targetWcag && lc >= targetApcaLc) return candidate;
		// 白との contrast が足りない (WCAG or APCA) = primary が明るすぎる。 L を下げる方向で adjust。
		candidate = { l: clamp01(candidate.l - WCAG_AUTOADJUST_STEP), c: candidate.c, h: candidate.h };
	}
	return candidate;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 派生 token を transform 式で計算する純関数 (v2 + PR #590 gamut clamp)。
 *
 * 入力: primary (Oklch) + 任意の secondary + aesthetic + base
 * 出力: `--c-primary` / `--c-secondary` / `--c-warn` / `--c-error` / `--c-success` / `--c-info`
 *
 * 各 token の transform 式:
 * - `--c-primary` = ensureAaAgainstWhite(input.primary)   // WCAG 4.5:1 + APCA Lc ≥ 60
 * - `--c-secondary` = input.secondary ?? deriveSecondary(adjusted primary)   // h+150°
 * - `--c-warn` = clampToGamut(oklch(semL[base] + 0.08, 0.14 × scale[aesthetic], 75))
 * - `--c-error` = clampToGamut(oklch(semL[base] + 0.00, 0.14 × scale[aesthetic], 25))
 * - `--c-success` = clampToGamut(oklch(semL[base] + 0.06, 0.14 × scale[aesthetic], 150))
 * - `--c-info` = clampToGamut(oklch(semL[base] + 0.04, 0.14 × scale[aesthetic], 230))
 *
 * PR #590: 各 semantic 出力に `clampToGamut()` を適用する (= chroma scale × hue 組合せで
 * sRGB gamut 外に振れる brutalist (c=0.21) の特定 hue を、 chroma を下げて hue を保ったまま
 * gamut 内に収める)。 これにより browser の hard-clamp 経由の意図しない hue shift を防ぐ。
 */
export function derivePalette(input: PaletteInput): DerivedPalette {
	const { primary: rawPrimary, secondary, aesthetic, baseTheme } = input;
	const primary = ensureAaAgainstWhite(rawPrimary);
	const sec = secondary ?? deriveSecondary(primary);
	const semC = SEMANTIC_BASE_CHROMA * AESTHETIC_CHROMA_SCALE[aesthetic];
	const semBaseL = SEMANTIC_BASE_LIGHTNESS[baseTheme];

	const sem = (h: number, deltaL: number): Oklch =>
		clampToGamut({
			l: clamp01(semBaseL + deltaL),
			c: semC,
			h,
		});

	return {
		'--c-primary': formatOklch(primary),
		'--c-secondary': formatOklch(sec),
		'--c-warn': formatOklch(sem(SEMANTIC_HUES.warn, SEMANTIC_DELTA_L.warn)),
		'--c-error': formatOklch(sem(SEMANTIC_HUES.error, SEMANTIC_DELTA_L.error)),
		'--c-success': formatOklch(sem(SEMANTIC_HUES.success, SEMANTIC_DELTA_L.success)),
		'--c-info': formatOklch(sem(SEMANTIC_HUES.info, SEMANTIC_DELTA_L.info)),
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILTIN PALETTE SPECS (migration 044 seed source)
// ═══════════════════════════════════════════════════════════════════════════

export interface BuiltinPaletteSpec {
	id: string;
	baseTheme: 'dark' | 'light';
	aesthetic: Aesthetic;
	primary: Oklch;
	secondary?: Oklch;
}

/**
 * 6 builtin の primary / aesthetic / base 表。 secondary を省略すると
 * `deriveSecondary(primary)` (= h+150°) で自動派生される。
 * brutalist 系は user の design intent で secondary = primary に固定 (single-accent)。
 */
export const BUILTIN_PALETTE_SPECS: readonly BuiltinPaletteSpec[] = [
	{ id: 'dark', baseTheme: 'dark', aesthetic: 'glass', primary: { l: 0.5, c: 0.14, h: 215 } },
	{ id: 'light', baseTheme: 'light', aesthetic: 'glass', primary: { l: 0.5, c: 0.14, h: 215 } },
	{
		id: 'brutalist',
		baseTheme: 'light',
		aesthetic: 'brutalist',
		primary: { l: 0.5, c: 0.22, h: 28 },
		secondary: { l: 0.5, c: 0.22, h: 28 },
	},
	{
		id: 'brutalist-dark',
		baseTheme: 'dark',
		aesthetic: 'brutalist',
		primary: { l: 0.5, c: 0.2, h: 28 },
		secondary: { l: 0.5, c: 0.2, h: 28 },
	},
	{
		id: 'neumorph',
		baseTheme: 'light',
		aesthetic: 'neumorph',
		primary: { l: 0.5, c: 0.1, h: 280 },
	},
	{
		id: 'neumorph-dark',
		baseTheme: 'dark',
		aesthetic: 'neumorph',
		primary: { l: 0.5, c: 0.1, h: 280 },
	},
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS RE-EXPORT (test / generator から参照)
// ═══════════════════════════════════════════════════════════════════════════

export const PALETTE_METHODOLOGY = {
	SEMANTIC_HUES,
	AESTHETIC_CHROMA_SCALE,
	SEMANTIC_BASE_CHROMA,
	SEMANTIC_BASE_LIGHTNESS,
	SEMANTIC_DELTA_L,
	SECONDARY_SHIFT_DEG,
	WCAG_AA_RATIO,
	APCA_TARGET_LC,
} as const;
