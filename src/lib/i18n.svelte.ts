/**
 * audit 2026-05-14 rank 3 Phase 1: i18n infrastructure 本格実装。
 *
 * 旧 (Q8 placeholder): no-op で `t(key)` が key を返すだけ。
 * 新 (本格): messages_{locale}.json で key-value lookup、 localeStore で切替、 OS locale auto detect、
 *           Microsoft Store + 海外展開対応 (motivation.md 2026-05-14 update)。
 *
 * Key naming convention: `<area>.<sub>.<name>` (例: 'nav.library', 'dialog.confirm_delete')
 * Locale 切替時の reactivity: $state で currentLocale を保持、 caller は $derived で再評価。
 *
 * 段階:
 *   Phase 1 (本 file): infrastructure + messages_ja.json (default 'ja') + t(key) + 1 callsite verify
 *   Phase 2 (続 PR): Settings に Language selector + OS locale auto detect
 *   Phase 3 (続 PR): messages_en.json + 全 hardcoded JP key 化 audit (500-1000 callsite)
 *   Phase 4 (続 PR): Intl.DateTimeFormat / Intl.NumberFormat formatter
 *   Phase 5 (続 PR): locale 切替 e2e + screenshot diff
 */
import messagesJa from './i18n/messages_ja.json';

export type Locale = 'ja' | 'en';

// 現状 messages は ja のみ。 en は Phase 3 で追加。
const MESSAGES: Record<Locale, Record<string, unknown>> = {
	ja: messagesJa,
	en: messagesJa, // Phase 3 で messages_en.json import に置換 (現状は ja fallback)
};

/**
 * 現在の locale。 $state で reactive、 Settings Language selector or OS auto detect で更新される。
 * default は 'ja' (motivation.md JP-first)、 Phase 2 で OS locale detect 経由で 'en' 等に。
 */
let currentLocaleState = $state<Locale>('ja');

export function currentLocale(): Locale {
	return currentLocaleState;
}

export function setLocale(next: Locale): void {
	currentLocaleState = next;
}

/**
 * dot-notated key path で messages dict を lookup。
 * 例: t('nav.library') → 'Library' (ja) / 'Library' (en)
 *     t('common.cancel') → 'キャンセル' (ja) / 'Cancel' (en)
 *
 * Phase 1 では fallback chain は単純: 該当 locale → 'ja' default → key そのもの。
 * vars 補間は Phase 3 以降で `{name}` placeholder 対応 (現状 plain string のみ)。
 */
export function t(key: string): string {
	const messages = MESSAGES[currentLocaleState] ?? MESSAGES.ja;
	const parts = key.split('.');
	let cursor: unknown = messages;
	for (const part of parts) {
		if (typeof cursor === 'object' && cursor !== null && part in cursor) {
			cursor = (cursor as Record<string, unknown>)[part];
		} else {
			// fallback to ja
			let fallback: unknown = MESSAGES.ja;
			for (const p of parts) {
				if (typeof fallback === 'object' && fallback !== null && p in fallback) {
					fallback = (fallback as Record<string, unknown>)[p];
				} else {
					return key; // 最終 fallback: key そのもの (= 翻訳漏れ可視化)
				}
			}
			return typeof fallback === 'string' ? fallback : key;
		}
	}
	return typeof cursor === 'string' ? cursor : key;
}

/**
 * OS locale (= `navigator.language`) から最も近い対応 locale を返す。
 * 'ja' / 'ja-JP' → 'ja'、 'en' / 'en-US' / 'en-GB' → 'en'、 それ以外 → 'ja' default (motivation 通り)。
 */
export function detectOsLocale(): Locale {
	if (typeof navigator === 'undefined') return 'ja';
	const lang = navigator.language.toLowerCase();
	if (lang.startsWith('en')) return 'en';
	return 'ja';
}
