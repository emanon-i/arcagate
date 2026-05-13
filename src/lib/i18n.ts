/**
 * audit 2026-05-13 Q8: i18n architecture placeholder。
 *
 * 現状: `docs/l0_ideas/motivation.md` で「Japanese-only target」 と明記、 immediate i18n 不要。
 * 将来 (= 別言語 user 要求発生時): 本 file を locale-aware に拡張する entry point。
 *
 * 実装方針 (将来):
 *   - `src/lib/i18n/messages.{ja,en}.json` で key-value 持つ
 *   - `t(key, vars?)` でメッセージ取得
 *   - `localeStore.set('ja' | 'en')` で切替
 *   - 既存 hardcoded `'ja'/'ja-JP'` (`FilePreviewWidget.svelte:83` 等) を `currentLocale()` 経由に
 *
 * 現状の役割 (placeholder):
 *   - 「i18n を意識していること」 の marker (lint で hardcoded string 検出する基盤)
 *   - i18n 着手時の entry point として import 経路を確保
 *
 * 参照: `E:/tmp/arcagate-refactor-audit-2026-05-13.md` §I-3 N5
 */

export type Locale = 'ja';

/** 現在 locale。 future expansion 時に localeStore に置換。 */
export function currentLocale(): Locale {
	return 'ja';
}

/**
 * 将来用 placeholder。 現状は key をそのまま返す (= no-op)。
 * 着手時に `messages.<locale>.json` を引いて return するよう拡張。
 */
export function t(key: string): string {
	return key;
}
