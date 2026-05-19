/**
 * Library card の per-card override 解釈。
 *
 * card_override_json schema (Item.card_override_json field、JSON 文字列):
 * - background?: LibraryCardBackgroundConfig (offsetX / offsetY / rotation)。
 *   画像は常に全面 cover 固定 (表示モード selector 撤廃済)。
 * - style?: LibraryCardStyleConfig (textColor / overlay / stroke 等)
 * - opener_id?: string (Opener ID、cascade で widget default / system 起動より優先)
 */

import type { LibraryCardBackgroundConfig, LibraryCardStyleConfig } from '$lib/state/config.svelte';

export interface CardOverrideJson {
	background?: Partial<LibraryCardBackgroundConfig>;
	style?: Partial<LibraryCardStyleConfig>;
	/** C-15 #10 + #19: 各 card で起動アプリ (Opener) を override (最優先 cascade)。 */
	opener_id?: string | null;
}

const VALID_ROTATIONS: readonly number[] = [0, 90, 180, 270];

/**
 * 旧 schema を新 schema へ read-time で正規化する。
 * - PR #513: background.mode 'icon'|'image' + focalX/focalY → offsetX/offsetY
 * - migration 038: 画像表示モード (fit) 撤廃 (常に cover 固定) + rotation field 追加
 * 既存 card_override_json は migration 038 で DB 側も書き換え済、本関数は backup 復元等で
 * 旧 shape が残った場合の防御。
 */
function normalizeBackground(bg: Record<string, unknown>): Partial<LibraryCardBackgroundConfig> {
	const out: Record<string, unknown> = { ...bg };
	if (out.offsetX === undefined && typeof out.focalX === 'number') out.offsetX = out.focalX;
	if (out.offsetY === undefined && typeof out.focalY === 'number') out.offsetY = out.focalY;
	// 撤廃 field (画像表示モード selector 廃止 — 常に cover 固定)
	delete out.fit;
	delete out.mode;
	delete out.focalX;
	delete out.focalY;
	// 90 度刻み回転、未設定 / 不正値は 0
	if (typeof out.rotation !== 'number' || !VALID_ROTATIONS.includes(out.rotation)) {
		out.rotation = 0;
	}
	return out as Partial<LibraryCardBackgroundConfig>;
}

export function parseCardOverride(json: string | null | undefined): CardOverrideJson | null {
	if (!json) return null;
	try {
		const parsed = JSON.parse(json) as CardOverrideJson;
		if (parsed.background && typeof parsed.background === 'object') {
			parsed.background = normalizeBackground(parsed.background as Record<string, unknown>);
		}
		return parsed;
	} catch {
		return null;
	}
}

export function getCardOpenerId(item: {
	card_override_json: string | null | undefined;
}): string | null {
	const o = parseCardOverride(item.card_override_json);
	return o?.opener_id ?? null;
}

/**
 * per-card 画像の 90 度刻み回転を CSS transform 文字列にする。
 * 90 / 270 度は回転後の bounding box が縦横入れ替わり 4:3 card を覆えなくなるため、
 * 横方向 (短辺) を埋めるよう scale で拡大して cover を維持する。
 * (card aspect 4:3 → 必要倍率 4/3 ≈ 1.333、僅かに過大な 1.34 で隙間を防ぐ)
 */
export function cardRotationTransform(rotation: number | undefined): string {
	const r = (((rotation ?? 0) % 360) + 360) % 360;
	if (r === 0) return '';
	if (r === 90 || r === 270) return `rotate(${r}deg) scale(1.34)`;
	return `rotate(${r}deg)`;
}
