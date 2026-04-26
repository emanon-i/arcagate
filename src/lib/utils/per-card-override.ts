/**
 * Item の per-card override 設定が有効かを判定する。
 * `card_override_json` が non-null かつ JSON parse 可能で空オブジェクトでないこと。
 */
export function hasActiveOverride(cardOverrideJson: string | null | undefined): boolean {
	if (!cardOverrideJson) return false;
	try {
		const parsed = JSON.parse(cardOverrideJson);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return false;
		return Object.keys(parsed).length > 0;
	} catch {
		return false;
	}
}
