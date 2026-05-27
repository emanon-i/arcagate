import { describe, expect, it } from 'vitest';
import { APCA_BRONZE_LC_BODY, apcaLcAbsHex, apcaLcHex } from './apca';

describe('apcaLcHex (polarity-aware contrast)', () => {
	it('純黒 text on 純白 bg = 正 Lc (Bronze body text を満たす ~+106)', () => {
		const lc = apcaLcHex('#000000', '#ffffff');
		expect(lc).toBeGreaterThan(60);
		expect(lc).toBeLessThan(110);
	});

	it('純白 text on 純黒 bg = 負 Lc (reverse polarity)', () => {
		const lc = apcaLcHex('#ffffff', '#000000');
		expect(lc).toBeLessThan(-60);
		expect(lc).toBeGreaterThan(-110);
	});

	it('同色は Lc = 0', () => {
		expect(apcaLcHex('#888888', '#888888')).toBe(0);
	});

	it('近接色は 0 に近い (deltaY 閾値以下で 0)', () => {
		// 数値上 ほぼ同 luminance の 2 色は Lc ≈ 0 を返す
		const lc = apcaLcHex('#808080', '#828282');
		expect(Math.abs(lc)).toBeLessThan(10);
	});
});

describe('apcaLcAbsHex (絶対値、 polarity 不問)', () => {
	it('|Lc| は polarity を swap しても近い値 (APCA 非対称 exponents で完全一致はしない)', () => {
		// APCA の normBG (0.56) と revBG (0.65) が異なるため、 black-on-white と white-on-black の
		// |Lc| は厳密には一致しない (それぞれ ~+106 / ~-108)。 「近い」 で十分。
		const a = apcaLcAbsHex('#000000', '#ffffff');
		const b = apcaLcAbsHex('#ffffff', '#000000');
		expect(Math.abs(a - b)).toBeLessThan(5);
	});

	it('|Lc| ≥ APCA_BRONZE_LC_BODY (60) を normal text の合否 threshold とする', () => {
		// black on white は明らかに合格
		expect(apcaLcAbsHex('#000000', '#ffffff')).toBeGreaterThanOrEqual(APCA_BRONZE_LC_BODY);
	});

	it('既存 builtin の primary L=0.5 series は white text on solid primary 想定で AA 相当を満たす', () => {
		// L≈0.5 (oklch) の primary は sRGB hex で 0x80 前後の brightness。 white text on そこに乗せて
		// |Lc| ≥ 60 を満たす (= ensureAaAgainstWhite の合格条件)。
		// 代表色 (glass dark primary: oklch(0.5 0.14 215) ≈ #1a6f99 程度) を直接 hex で test。
		// 計算は oklchToHex 経由が正確だが、 ここでは APCA の API 単体検証のため代表的 hex で。
		expect(apcaLcAbsHex('#ffffff', '#1a6f99')).toBeGreaterThanOrEqual(60);
		expect(apcaLcAbsHex('#ffffff', '#806a3a')).toBeGreaterThanOrEqual(60);
	});

	it('pale yellow (L≈0.9) on white は |Lc| < 60 (= WCAG 4.5:1 と同じく不合格 zone)', () => {
		// oklch(0.9 0.05 100) ≈ #e8da9a。 white との contrast は body text として不十分。
		expect(apcaLcAbsHex('#e8da9a', '#ffffff')).toBeLessThan(60);
	});
});
