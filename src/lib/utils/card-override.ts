/**
 * Library card の per-card override 解釈。
 *
 * card_override_json schema (Item.card_override_json field、JSON 文字列):
 * - background?: LibraryCardBackgroundConfig (offsetX / offsetY / rotation)。
 *   background を持つカードは icon_path を全面 cover 表示する (表示モード選択は撤廃)。
 * - style?: LibraryCardStyleConfig (textColor / overlay / stroke 等)
 * - opener_id?: string (Opener ID、cascade で widget default / system 起動より優先)
 *
 * background / style は「見た目」、opener_id は「起動」で独立。見た目設定の有無は
 * hasAppearanceOverride で判定し、opener_id 単独の override は見た目扱いしない。
 */

import type { LibraryCardBackgroundConfig, LibraryCardStyleConfig } from '$lib/state/config.svelte';

export interface CardOverrideJson {
	background?: Partial<LibraryCardBackgroundConfig>;
	style?: Partial<LibraryCardStyleConfig>;
	/** C-15 #10 + #19: 各 card で起動アプリ (Opener) を override (最優先 cascade)。 */
	opener_id?: string | null;
}

/**
 * 旧 schema を新 schema へ read-time で正規化する。
 * - PR #513: background.mode 'icon'|'image' + focalX/focalY
 * - PR #531 期: background.fit 'cover'|'contain'|'center'
 * 表示モード (mode / fit) は撤廃済 (background 在り = 常に full-bleed cover)。
 * offsetX / offsetY / rotation のみ whitelist で残し、legacy key は破棄する。
 * 既存 card_override_json は次回編集時 (patchOverride) に新 shape で書き戻される。
 */
function normalizeBackground(bg: Record<string, unknown>): Partial<LibraryCardBackgroundConfig> {
	const out: Partial<LibraryCardBackgroundConfig> = {};
	if (typeof bg.offsetX === 'number') out.offsetX = bg.offsetX;
	else if (typeof bg.focalX === 'number') out.offsetX = bg.focalX;
	if (typeof bg.offsetY === 'number') out.offsetY = bg.offsetY;
	else if (typeof bg.focalY === 'number') out.offsetY = bg.focalY;
	if (bg.rotation === 90 || bg.rotation === 180 || bg.rotation === 270) {
		out.rotation = bg.rotation;
	}
	return out;
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
 * 「見た目」 override (background / style) が設定されているか。
 * opener_id 単独の override は見た目扱いしない (起動設定は独立して保持される)。
 */
export function hasAppearanceOverride(json: string | null | undefined): boolean {
	const o = parseCardOverride(json);
	return o != null && (o.background != null || o.style != null);
}

/**
 * CardOverrideJson を card_override_json 文字列へ。background / style / opener_id が
 * すべて空なら null を返す (= card_override_json を解除する)。空 key は出力しない。
 */
export function serializeCardOverride(o: CardOverrideJson): string | null {
	const hasOpener = o.opener_id != null && o.opener_id !== '';
	const hasBg = o.background != null;
	const hasStyle = o.style != null;
	if (!hasBg && !hasStyle && !hasOpener) return null;
	const out: CardOverrideJson = {};
	if (hasBg) out.background = o.background;
	if (hasStyle) out.style = o.style;
	if (hasOpener) out.opener_id = o.opener_id;
	return JSON.stringify(out);
}

/**
 * full-bleed カード画像 (<img>) の inline style。offset (object-position) と
 * 90° 刻み回転を表現する。card は landscape (aspect-[4/3]) 前提。
 * - 0° / 180°: card 全面 (W×H) に重ねて回転する。
 * - 90° / 270°: 一辺 = card 幅の正方形を中央回転する。正方形は回転で footprint が
 *   不変なため、landscape card を必ず全面被覆する (余剰は card の overflow-hidden で切る)。
 */
export function fullBleedImageStyle(bg: LibraryCardBackgroundConfig): string {
	const pos = `object-position:${bg.offsetX}% ${bg.offsetY}%;`;
	if (bg.rotation === 90 || bg.rotation === 270) {
		return `position:absolute;left:50%;top:50%;width:100%;aspect-ratio:1;transform:translate(-50%,-50%) rotate(${bg.rotation}deg);${pos}`;
	}
	return `position:absolute;inset:0;width:100%;height:100%;transform:rotate(${bg.rotation}deg);${pos}`;
}
