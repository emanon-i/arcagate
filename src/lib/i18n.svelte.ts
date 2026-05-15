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

// Phase 3 完了: messages_en.json は **lazy import** で 'en' locale 切替時のみ load。
// 起動時 bundle に en を含めない (= ja default の hot path 性能影響 0)。
// e2e 検証で eager import が WebView2 起動遅延 → page closed 連鎖を引き起こしたため、 lazy 採用。
const MESSAGES: Record<Locale, Record<string, unknown>> = {
	ja: messagesJa,
	en: messagesJa, // 初期は ja fallback、 setLocale('en') で動的 load
};

let enLoaded = false;

async function ensureEnLoaded(): Promise<void> {
	if (enLoaded) return;
	const mod = await import('./i18n/messages_en.json');
	MESSAGES.en = mod.default;
	enLoaded = true;
}

/**
 * 現在の locale。 $state で reactive、 Settings Language selector or OS auto detect で更新される。
 * default は 'ja' (motivation.md JP-first)、 Phase 2 で OS locale detect 経由で 'en' 等に。
 */
let currentLocaleState = $state<Locale>('ja');

export function currentLocale(): Locale {
	return currentLocaleState;
}

export async function setLocale(next: Locale): Promise<void> {
	if (next === 'en') await ensureEnLoaded();
	currentLocaleState = next;
}

/**
 * dot-notated key path で messages dict を lookup。
 * 例: t('nav.library') → 'Library' (ja) / 'Library' (en)
 *     t('common.cancel') → 'キャンセル' (ja) / 'Cancel' (en)
 *
 * 第 2 引数 vars で `{name}` placeholder 補間に対応 (Phase 3 で本格化)。
 *   例: t('workspace.tooltip.fit_selected_n', { count: 3 })
 *       template: '選択中 {count} 個を表示 (Ctrl+Shift+1)'
 *       → '選択中 3 個を表示 (Ctrl+Shift+1)'
 *
 * fallback chain: 該当 locale → 'ja' default → key そのもの (= 翻訳漏れ可視化)。
 * 未提供の placeholder は `{name}` のまま残す (debug 容易)。
 */
export function t(key: string, vars?: Record<string, string | number>): string {
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
					return key;
				}
			}
			return typeof fallback === 'string' ? interpolate(fallback, vars) : key;
		}
	}
	return typeof cursor === 'string' ? interpolate(cursor, vars) : key;
}

/**
 * `{name}` placeholder を vars[name] で置換。
 * vars 未指定 / key 不在の placeholder は原文のまま残す。
 */
function interpolate(template: string, vars?: Record<string, string | number>): string {
	if (!vars) return template;
	return template.replace(/\{(\w+)\}/g, (match, name: string) => {
		const value = vars[name];
		return value !== undefined ? String(value) : match;
	});
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
