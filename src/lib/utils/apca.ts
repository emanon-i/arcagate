/**
 * APCA (Accessible Perceptual Contrast Algorithm) Lc 計算 — pure TS 実装 (PR #590)。
 *
 * # なぜ WCAG 2.x の 4.5:1 だけでは不十分か
 *
 * WCAG 2.x の contrast ratio は relative luminance の比のみで計算され、 polarity (= text が
 * 明色 / 暗色のどちら) や hue / 周波数応答を考慮しない。 結果として:
 *   - small bright accent text on near-white bg で「数値上は AA」 でも実用上読みにくい
 *   - dark cyan text on dark navy bg で「AAA 通過」 でも実用上不可読
 * という乖離が報告されている (Andrew Somers, APCA author の研究)。
 *
 * APCA (WCAG 3 候補) は polarity と CIE luminance を考慮し、 「body text を読むのに十分か」 を
 * **Lc 値** (-108 〜 +106) で返す。 慣例的に |Lc| ≥ 60 を normal text の AA 相当として扱う。
 *
 * # アルゴリズム reference
 *
 * 本実装は apca-w3 の SA98G algorithm を pure TS にトランスクライブしたもの:
 *   - https://github.com/Myndex/apca-w3 (Public Domain Dedication and License v1.0)
 *   - Andrew Somers, "APCA — Accessible Perceptual Contrast Algorithm", 2022-
 *
 * 定数は SA98G (= APCA G-4g、 WCAG 3 candidate Bronze level の reference impl) と一致。
 *
 * # 制限
 *
 * - 「body text」 を想定。 large display text (font-size >= 24px) は Lc ≥ 45 で AA 相当 (本 module
 *   では gating しない、 呼び出し側で判定)。
 * - 半透明色 (color-mix の transparent 入り) は呼び出し前に opaque 化が必要 (APCA は opaque
 *   foreground/background のみ)。 derivePalette の `--ag-accent-text` × `--ag-accent` 直接判定で
 *   accent bg は opaque (= var(--c-primary))、 text は color-mix(c-primary, c-fg 52%) で
 *   結果も opaque なので問題なし。
 */
const SA98G = {
	// sRGB gamma decode (apca-w3 では simple TRC=2.4 のべき乗、 piecewise でない近似)。
	mainTRC: 2.4,
	// sRGB → Y (luminance) coefficients (sRGB primaries 別、 ITU-R BT.709 相当)
	sRco: 0.2126729,
	sGco: 0.7151522,
	sBco: 0.072175,
	// black soft clamp (低 Y で「真っ黒 vs 微暗」 の差を圧縮、 dark hole 補正)
	blkThrs: 0.022,
	blkClmp: 1.414,
	// scale / offset (Y 差分 → Lc 100 倍スケール換算)
	scaleBoW: 1.14,
	scaleWoB: 1.14,
	loBoWoffset: 0.027,
	loWoBoffset: 0.027,
	deltaYmin: 0.0005,
	loClip: 0.1,
	// 通常 polarity (dark text on light BG) の exponent
	normBG: 0.56,
	normTXT: 0.57,
	// reverse polarity (light text on dark BG) の exponent
	revTXT: 0.62,
	revBG: 0.65,
} as const;

/**
 * `#rrggbb` から APCA-spec の sRGB Y (luminance) を計算する。
 * apca-w3 では `r/255 ^ 2.4` の simple TRC を採用 (piecewise でない近似)。
 */
function hexToApcaY(hex: string): number {
	// 直接 sRGB チャネル比 (gamma encoded) を取り出すため、 hexToLinearRgb (piecewise) は使わず
	// raw byte → 正規化 → simple TRC^2.4 を踏む (APCA spec に厳密に合わせる)。
	const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
	if (!m) return 0;
	const r = Number.parseInt(m[1], 16) / 255;
	const g = Number.parseInt(m[2], 16) / 255;
	const b = Number.parseInt(m[3], 16) / 255;
	return (
		SA98G.sRco * r ** SA98G.mainTRC +
		SA98G.sGco * g ** SA98G.mainTRC +
		SA98G.sBco * b ** SA98G.mainTRC
	);
}

/**
 * APCA Lc contrast 値を返す (-108 〜 +106)。
 * 正値 = dark text on light bg、 負値 = light text on dark bg。
 * |Lc| ≥ 60 ≈ WCAG AA equivalent for normal body text (= 本 module の主な合否 threshold)。
 */
export function apcaContrastY(txtY: number, bgY: number): number {
	// 黒寄り側を soft-clamp して「真っ黒 vs 微暗」 の noise を吸収。
	const txt = txtY > SA98G.blkThrs ? txtY : txtY + (SA98G.blkThrs - txtY) ** SA98G.blkClmp;
	const bg = bgY > SA98G.blkThrs ? bgY : bgY + (SA98G.blkThrs - bgY) ** SA98G.blkClmp;

	if (Math.abs(bg - txt) < SA98G.deltaYmin) return 0.0;

	if (bg > txt) {
		// Normal polarity: 暗い text を明るい bg に重ねる (body text の主用途)
		const sapc = (bg ** SA98G.normBG - txt ** SA98G.normTXT) * SA98G.scaleBoW;
		if (sapc < SA98G.loClip) return 0.0;
		return (sapc - SA98G.loBoWoffset) * 100;
	}
	// Reverse polarity: 明るい text を暗い bg に重ねる (light mode の dark heading や dark mode 全般)
	const sapc = (bg ** SA98G.revBG - txt ** SA98G.revTXT) * SA98G.scaleWoB;
	if (sapc > -SA98G.loClip) return 0.0;
	return (sapc + SA98G.loWoBoffset) * 100;
}

/** `#rrggbb` の text / bg ペアから APCA Lc を返す (sign 含む、 = polarity 情報あり)。 */
export function apcaLcHex(textHex: string, bgHex: string): number {
	return apcaContrastY(hexToApcaY(textHex), hexToApcaY(bgHex));
}

/** |Lc| (絶対値) を返す。 polarity は気にせず「読みやすさ」 だけを評価するときの primary API。 */
export function apcaLcAbsHex(textHex: string, bgHex: string): number {
	return Math.abs(apcaLcHex(textHex, bgHex));
}

/** APCA Bronze (WCAG 3 candidate) の閾値 — body text の AA 相当。 */
export const APCA_BRONZE_LC_BODY = 60;
/** large display text (>= 24px / >= 18px+bold) の閾値。 derivePalette では body text 想定。 */
export const APCA_BRONZE_LC_LARGE = 45;
