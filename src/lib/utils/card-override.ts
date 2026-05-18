/**
 * Library card の per-card override 解釈。
 *
 * card_override_json schema (Item.card_override_json field、JSON 文字列):
 * - background?: LibraryCardBackgroundConfig (mode 'icon' | 'image' / focalX / focalY)
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

export function parseCardOverride(json: string | null | undefined): CardOverrideJson | null {
	if (!json) return null;
	try {
		return JSON.parse(json) as CardOverrideJson;
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
