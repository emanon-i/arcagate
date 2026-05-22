/**
 * audit 2026-05-15 rank 3 Phase 4: i18n Intl formatter utility。
 *
 * Phase 1-3 (i18n.svelte.ts) は plain string lookup + `{name}` interp で UI strings を多 locale 化。
 * Phase 4 は **数値 / 日時 / 相対時刻 / 単複** を `Intl.*` API で locale 別 format する utility 層を提供。
 *
 * 引用元 guideline: docs/l2_foundation/i18n-policy.md §3 Intl formatter (DateTimeFormat / NumberFormat / RelativeTimeFormat / PluralRules)
 *
 * 設計:
 * - Phase 1-3 の `currentLocale()` ($state) に追従し reactive (locale 切替で自動再計算)
 * - Intl オブジェクトを cache (locale 単位、 最大数 limit)。 反復 format での GC pressure を回避
 * - 旧 ad-hoc formatter (例: `formatRelativeTime` in PaletteQuickContext.svelte) を本 utility へ集約する
 *   ことで「2 人が適用しても同じ format」 を保証 (i18n-policy.md mechanical 基準と整合)
 *
 * 移行 (次 PR):
 * - PaletteQuickContext.formatRelativeTime → formatRelative()
 * - WorkspaceUndoSnackbar の "{n}秒" → formatRelative() or formatDuration()
 * - 各 widget の launch_count / hit count → formatNumber()
 */
import { currentLocale, t } from '$lib/i18n.svelte';

/**
 * Intl object cache。 locale × options を key に memoize。
 * Map size hard limit 32 で stale eviction (FIFO)。
 */
const relativeFormatCache = new Map<string, Intl.RelativeTimeFormat>();
const numberFormatCache = new Map<string, Intl.NumberFormat>();
const dateFormatCache = new Map<string, Intl.DateTimeFormat>();
const pluralRulesCache = new Map<string, Intl.PluralRules>();

const MAX_CACHE_SIZE = 32;

function cacheGet<T>(cache: Map<string, T>, key: string, factory: () => T): T {
	const existing = cache.get(key);
	if (existing) return existing;
	if (cache.size >= MAX_CACHE_SIZE) {
		// FIFO eviction: 最古 entry を削除
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) cache.delete(oldest);
	}
	const created = factory();
	cache.set(key, created);
	return created;
}

/**
 * 相対時刻 format (例: "5 分前" / "5 minutes ago")。
 *
 * 旧 PaletteQuickContext.formatRelativeTime の置換。 単位は秒/分/時/日/週/月/年で自動選択。
 *
 * @param iso ISO 8601 形式の時刻文字列 or Date オブジェクト
 * @param now 比較基準時刻 (default: Date.now())
 */
export function formatRelative(iso: string | Date, now: number = Date.now()): string {
	const locale = currentLocale();
	const target = typeof iso === 'string' ? new Date(iso).getTime() : iso.getTime();
	const diffMs = target - now;
	const diffSec = Math.round(diffMs / 1000);
	const absSec = Math.abs(diffSec);

	const fmt = cacheGet(
		relativeFormatCache,
		`${locale}|auto`,
		() => new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'long' }),
	);

	if (absSec < 60) return fmt.format(diffSec, 'second');
	const diffMin = Math.round(diffSec / 60);
	if (Math.abs(diffMin) < 60) return fmt.format(diffMin, 'minute');
	const diffHour = Math.round(diffMin / 60);
	if (Math.abs(diffHour) < 24) return fmt.format(diffHour, 'hour');
	const diffDay = Math.round(diffHour / 24);
	if (Math.abs(diffDay) < 7) return fmt.format(diffDay, 'day');
	const diffWeek = Math.round(diffDay / 7);
	if (Math.abs(diffWeek) < 5) return fmt.format(diffWeek, 'week');
	const diffMonth = Math.round(diffDay / 30);
	if (Math.abs(diffMonth) < 12) return fmt.format(diffMonth, 'month');
	const diffYear = Math.round(diffDay / 365);
	return fmt.format(diffYear, 'year');
}

/**
 * 数値 format (locale 別の桁区切り)。
 *
 * 例: 1234567 → "1,234,567" (en) / "1,234,567" (ja)、 0.5 → "0.5" / "0.5"
 *
 * @param value 数値
 * @param options Intl.NumberFormatOptions (例: `{ style: 'percent' }`, `{ minimumFractionDigits: 2 }`)
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
	const locale = currentLocale();
	const key = `${locale}|${JSON.stringify(options ?? {})}`;
	const fmt = cacheGet(numberFormatCache, key, () => new Intl.NumberFormat(locale, options));
	return fmt.format(value);
}

/**
 * 日時 format (locale 別)。
 *
 * @param iso ISO 8601 形式の時刻文字列 or Date オブジェクト
 * @param options Intl.DateTimeFormatOptions
 *   default: `{ dateStyle: 'medium', timeStyle: 'short' }` (例: "2026/05/15 14:30" / "May 15, 2026, 2:30 PM")
 */
export function formatDate(
	iso: string | Date,
	options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string {
	const locale = currentLocale();
	const date = typeof iso === 'string' ? new Date(iso) : iso;
	const key = `${locale}|${JSON.stringify(options)}`;
	const fmt = cacheGet(dateFormatCache, key, () => new Intl.DateTimeFormat(locale, options));
	return fmt.format(date);
}

/**
 * 単複 plural category 取得 (i18n `t()` の plural variant 解決用)。
 *
 * 例: ja は category 1 種 ('other')、 en は 2 種 ('one' | 'other')、 ru は 4 種等。
 *
 * 使用例:
 *   const cat = pluralCategory(count);
 *   t(`library.stats.items_${cat}`, { count })
 *   // ja: items_other = "{count} 件"
 *   // en: items_one = "{count} item" / items_other = "{count} items"
 *
 * @param value 数値
 * @param type 'cardinal' (default、 1 / 2 / 3...) or 'ordinal' (1st / 2nd / 3rd...)
 */
export function pluralCategory(value: number, type: Intl.PluralRuleType = 'cardinal'): string {
	const locale = currentLocale();
	const key = `${locale}|${type}`;
	const rules = cacheGet(pluralRulesCache, key, () => new Intl.PluralRules(locale, { type }));
	return rules.select(value);
}

/**
 * 期間 format (秒数 → "5 秒" / "5 seconds" / "1 分 30 秒" etc)。
 *
 * 旧 WorkspaceUndoSnackbar の "{n}秒" 等を本 helper へ移行する想定。
 * 簡易版 (秒のみ): 60 未満は "n 秒" / "n second(s)"、 60 以上は分秒。
 *
 * Intl.DurationFormat は 2024-09 時点で Chromium ベース未対応、 Safari のみ。
 * Tauri = WebView2 (Chromium) なので Intl.NumberFormat unit base で代替実装。
 */
export function formatDurationSeconds(seconds: number): string {
	const locale = currentLocale();
	const abs = Math.abs(Math.round(seconds));
	if (abs < 60) {
		const fmt = cacheGet(
			numberFormatCache,
			`${locale}|unit-second`,
			() =>
				new Intl.NumberFormat(locale, {
					style: 'unit',
					unit: 'second',
					unitDisplay: 'short',
				}),
		);
		return fmt.format(seconds);
	}
	const min = Math.floor(abs / 60);
	const sec = abs % 60;
	const minFmt = cacheGet(
		numberFormatCache,
		`${locale}|unit-minute`,
		() =>
			new Intl.NumberFormat(locale, {
				style: 'unit',
				unit: 'minute',
				unitDisplay: 'short',
			}),
	);
	if (sec === 0) return minFmt.format(min);
	const secFmt = cacheGet(
		numberFormatCache,
		`${locale}|unit-second`,
		() =>
			new Intl.NumberFormat(locale, {
				style: 'unit',
				unit: 'second',
				unitDisplay: 'short',
			}),
	);
	return `${minFmt.format(min)} ${secFmt.format(sec)}`;
}

/**
 * 単複対応の翻訳 lookup。 `key` に `_one` / `_other` suffix を付けた variant を
 * `Intl.PluralRules` の category で選び、 `t()` で補間する。
 *
 * - ja: PluralRules は常に 'other' を返すため `_other` のみ評価される
 * - en: count=1 → 'one' ("1 item")、 それ以外 → 'other' ("{count} items")
 *
 * 使用例:
 *   tPlural('toast.items_added_n', count)            // → t('toast.items_added_n_one' | '_other', { count })
 *   tPlural('workspace.picker.count', n, { n })      // {n} 補間を vars で渡す
 *
 * `count` は plural category 判定に使い、 `{ count, ...vars }` として補間にも渡す。
 * variant が見つからない場合は `_other` に fallback する。
 *
 * 引用元 guideline: docs/l3_phases/paid-quality/PH-PQ-700_i18n-and-global.md T2
 *   (helper 配置は循環 import 回避のため i18n.svelte.ts ではなく本 formatter 層に置く)
 */
export function tPlural(
	key: string,
	count: number,
	vars?: Record<string, string | number>,
): string {
	const category = pluralCategory(count);
	const merged = { count, ...vars };
	const variantKey = `${key}_${category}`;
	const direct = t(variantKey, merged);
	if (direct !== variantKey) return direct;
	return t(`${key}_other`, merged);
}

/**
 * cache 全削除 (test や locale 設定 reset 時に使用)。
 * 本番コードからは通常呼ばない。
 */
export function _clearFormatterCache(): void {
	relativeFormatCache.clear();
	numberFormatCache.clear();
	dateFormatCache.clear();
	pluralRulesCache.clear();
}
