/**
 * Wheel event の delta を pixel-equivalent に正規化し、zoom step として使える符号付き整数を返す。
 *
 * deltaMode (DOM_DELTA 仕様):
 *   - 0 (PIXEL): 1 単位 = 1 px (mouse wheel: 120px / click、trackpad smooth: 数 px)
 *   - 1 (LINE): 1 単位 ≈ 16 px (1 行) — Firefox 等の一部 mouse driver
 *   - 2 (PAGE): 1 単位 ≈ 100 px (1 page) — Office 系入力デバイス
 *
 * 旧実装 (`e.deltaY > 0 ? -10 : 10`) は sign しか使わず、trackpad smooth scroll で
 * 1 frame ごとに deltaY=3 等の小値が連発し +10 / -10 zoom が乱発、過敏な体感に。
 *
 * 新実装は |deltaY| を pixel-equivalent に変換 → 12 で割って step (2〜10) に丸める。
 *   - mouse wheel 120px → 10
 *   - trackpad smooth 3px → 2 (min)
 *   - 大量 page scroll device → 10 (max)
 */
export function normalizeWheelStep(e: { deltaY: number; deltaMode?: number }): number {
	if (!Number.isFinite(e.deltaY) || e.deltaY === 0) return 0;
	const sign = e.deltaY > 0 ? -1 : 1;
	const pxFactor = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
	const pxAbs = Math.abs(e.deltaY) * pxFactor;
	const magnitude = Math.min(10, Math.max(2, Math.round(pxAbs / 12)));
	return sign * magnitude;
}
