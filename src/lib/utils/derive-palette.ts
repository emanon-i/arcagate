/**
 * Design tokens v2 — palette derivation (純関数)。
 *
 * primary / secondary seeds + aesthetic + base theme から、 各 builtin / custom theme で
 * literal seed として `themes.css_vars` に保存される **派生 token 群** を計算する。
 *
 * 設計 (DEV_REVIEW_R4 ⑫後半 + audit BUILTIN_THEME_DIFF_MATRIX_2026-05-27 §5):
 * - CSS chain (`oklch(from)` / `color-mix(in oklab)`) は accent variants / surface mix /
 *   hover/focus 等の **runtime 派生** を担う。 本関数は CSS chain では表現しにくい
 *   **aesthetic × base 別の calibrated literal** (semantic 系 = warn/error/success/info、
 *   accent state の lightness shift 等) を返す。
 * - 出力は migration 044 の seed source + ThemeEditor の「reset / clone 時の初期値」 として使う。
 * - 純関数: `Math.random()` / `getComputedStyle` / DOM access 一切なし。 vitest で確定的に test 可能。
 */
import type { Aesthetic } from './color';

export interface Oklch {
	l: number;
	c: number;
	h: number;
}

export interface PaletteInput {
	primary: Oklch;
	/** undefined / null の場合は primary の補色 (h+180) を自動計算。 */
	secondary?: Oklch | null;
	aesthetic: Aesthetic;
	baseTheme: 'dark' | 'light';
}

/**
 * 派生 token の出力 (key = CSS custom property name)。 値は CSS が parse 可能な oklch 文字列。
 *
 * このマップは `themes.css_vars` JSON にそのまま書き込める形 (= migration seed の出元)。
 * CSS chain で表現される token (`--ag-accent` 等) は出力しない (chain を温存)。
 */
export interface DerivedPalette {
	/** seed echo (primary は user 入力をそのまま、 secondary は明示指定 or 自動補色)。 */
	'--c-primary': string;
	'--c-secondary': string;
	/** semantic seeds — hue は canonical 固定、 l/c は aesthetic × base で calibrated。 */
	'--c-warn': string;
	'--c-error': string;
	'--c-success': string;
	/** PR #588 で追加: info 軸 (青-cyan)。 既存 builtin には未定義、 migration で seed。 */
	'--c-info': string;
}

/** semantic 軸ごとの canonical hue (文化的信号性を維持するため固定)。 */
const SEMANTIC_HUES = {
	warn: 75,
	error: 25,
	success: 150,
	info: 230,
} as const;

/**
 * aesthetic × base ごとの semantic l / c calibration table。
 *
 * 既存 builtin (migration 043) の semantic 値を baseline とし、 そこから:
 * - glass: 既存値を踏襲 (実機検収済の chroma 帯)
 * - brutalist: chroma を強化 (鮮烈な信号色)
 * - neumorph: chroma を抑制 (muted な信号色)
 *
 * base (dark/light) は visibility 確保のため lightness を反転気味に調整。
 * dark base: l 高め (明色背景の vs 暗色背景での視認確保)、 light base: l 低め。
 */
const SEMANTIC_RANGES: Record<
	Aesthetic,
	Record<'dark' | 'light', Record<keyof typeof SEMANTIC_HUES, { l: number; c: number }>>
> = {
	glass: {
		dark: {
			warn: { l: 0.82, c: 0.15 },
			error: { l: 0.68, c: 0.17 },
			success: { l: 0.78, c: 0.14 },
			info: { l: 0.75, c: 0.14 },
		},
		light: {
			warn: { l: 0.74, c: 0.16 },
			error: { l: 0.58, c: 0.2 },
			success: { l: 0.66, c: 0.15 },
			info: { l: 0.58, c: 0.16 },
		},
	},
	brutalist: {
		dark: {
			warn: { l: 0.7, c: 0.16 },
			error: { l: 0.58, c: 0.2 },
			success: { l: 0.62, c: 0.15 },
			info: { l: 0.6, c: 0.18 },
		},
		light: {
			warn: { l: 0.62, c: 0.18 },
			error: { l: 0.52, c: 0.22 },
			success: { l: 0.55, c: 0.16 },
			info: { l: 0.5, c: 0.2 },
		},
	},
	neumorph: {
		dark: {
			warn: { l: 0.8, c: 0.13 },
			error: { l: 0.68, c: 0.16 },
			success: { l: 0.74, c: 0.13 },
			info: { l: 0.7, c: 0.12 },
		},
		light: {
			warn: { l: 0.72, c: 0.11 },
			error: { l: 0.6, c: 0.14 },
			success: { l: 0.66, c: 0.1 },
			info: { l: 0.62, c: 0.1 },
		},
	},
};

function formatNumber(n: number, decimals: number): string {
	const rounded = Number(n.toFixed(decimals));
	// "0.5" / "0" は CSS oklch で valid なので素直に文字列化 (trailing zero は除去)。
	return rounded.toString();
}

/** Oklch を CSS の `oklch(L C H)` 形式に整形 (l/c は 3 桁、 h は 1 桁)。 */
export function formatOklch(o: Oklch): string {
	return `oklch(${formatNumber(o.l, 3)} ${formatNumber(o.c, 3)} ${formatNumber(o.h, 1)})`;
}

/** primary の補色 (色相 +180°) を自動計算する。 secondary 未指定時に使用。 */
export function complementary(primary: Oklch): Oklch {
	return { l: primary.l, c: primary.c, h: (primary.h + 180) % 360 };
}

/**
 * `derivePalette` — primary + secondary + aesthetic + base theme から派生 token を計算する純関数。
 *
 * 出力対象は **CSS chain で表現できない literal seed のみ** (semantic 系)。 accent state variants /
 * surface tinted / hover / focus は CSS chain (`oklch(from)` / `color-mix`) で runtime 派生されるため、
 * 本関数では返さない (理由: chain freeze 回避 / ThemeEditor の primary 編集が live で派生に伝播する保証)。
 *
 * 副作用なし。 `vitest` で aesthetic × base の代表組合せに対して snapshot / 帯域 assert 可能。
 */
export function derivePalette(input: PaletteInput): DerivedPalette {
	const { primary, secondary, aesthetic, baseTheme } = input;
	const sec = secondary ?? complementary(primary);
	const ranges = SEMANTIC_RANGES[aesthetic][baseTheme];
	return {
		'--c-primary': formatOklch(primary),
		'--c-secondary': formatOklch(sec),
		'--c-warn': formatOklch({ l: ranges.warn.l, c: ranges.warn.c, h: SEMANTIC_HUES.warn }),
		'--c-error': formatOklch({ l: ranges.error.l, c: ranges.error.c, h: SEMANTIC_HUES.error }),
		'--c-success': formatOklch({
			l: ranges.success.l,
			c: ranges.success.c,
			h: SEMANTIC_HUES.success,
		}),
		'--c-info': formatOklch({ l: ranges.info.l, c: ranges.info.c, h: SEMANTIC_HUES.info }),
	};
}

/** 6 builtin theme の primary / secondary / base / aesthetic 表 (migration 044 seed source)。 */
export interface BuiltinPaletteSpec {
	id: string;
	baseTheme: 'dark' | 'light';
	aesthetic: Aesthetic;
	primary: Oklch;
	secondary?: Oklch;
}

export const BUILTIN_PALETTE_SPECS: readonly BuiltinPaletteSpec[] = [
	{
		id: 'dark',
		baseTheme: 'dark',
		aesthetic: 'glass',
		primary: { l: 0.5, c: 0.14, h: 215 },
	},
	{
		id: 'light',
		baseTheme: 'light',
		aesthetic: 'glass',
		primary: { l: 0.5, c: 0.14, h: 215 },
	},
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
