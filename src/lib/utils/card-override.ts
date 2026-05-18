/**
 * Library card の per-card override 解釈。
 *
 * card_override_json schema (Item.card_override_json field、JSON 文字列):
 * - background?: LibraryCardBackgroundConfig (fit 'cover' | 'contain' | 'center' / offsetX / offsetY)
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

/**
 * 旧 schema (PR #513: background.mode 'icon'|'image' + focalX/focalY) を
 * 新 schema (fit 'cover'|'contain'|'center' + offsetX/offsetY) へ read-time で正規化する。
 * 既存 card_override_json は次回編集時 (patchOverride) に新 shape で書き戻される。
 */
function normalizeBackground(bg: Record<string, unknown>): Partial<LibraryCardBackgroundConfig> {
	const out: Record<string, unknown> = { ...bg };
	if (out.fit === undefined && out.mode !== undefined) {
		out.fit = out.mode === 'image' ? 'cover' : 'center';
	}
	if (out.offsetX === undefined && typeof out.focalX === 'number') out.offsetX = out.focalX;
	if (out.offsetY === undefined && typeof out.focalY === 'number') out.offsetY = out.focalY;
	delete out.mode;
	delete out.focalX;
	delete out.focalY;
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
