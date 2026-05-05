/**
 * R10-C: 日本語 message catalog 雛形 (L4 多言語化フェーズへの基盤)。
 *
 * 現在は **日本語固定** (criteria-quality.md H2/H3/H4 で意図的)。
 * 本 module は L4 着手時に `t(key)` 経由参照に切替えるための共通 string 集約点。
 *
 * 命名 convention:
 *   - actions.X = button / menu の動作ラベル (短い、verb 的)
 *   - dialogs.X = dialog タイトル / 確認文言
 *   - common.X = 汎用 (close 等)
 *
 * 使い方 (Phase 2 = 本 PR 時点):
 *   ```ts
 *   import { messages } from '$lib/i18n/messages-ja';
 *   <button aria-label={messages.actions.close}>...
 *   ```
 *
 * Phase 3 (L4 framework 採用後) で `t()` 経由に置換:
 *   ```ts
 *   import { t } from '$lib/i18n';
 *   <button aria-label={t('actions.close')}>...
 *   ```
 *
 * **このファイル自体は audit-i18n-hardcode.sh の対象**: src/lib 配下なので集約しても hardcode count は減らない。
 * 既存 hardcode 文字列を **本 module 経由参照に置換した分だけ減る**。
 */

export const messages = {
	common: {
		loading: 'よみこみ中...',
		empty: '項目がありません',
	},
	actions: {
		close: '閉じる',
		cancel: 'キャンセル',
		save: '保存',
		delete: '削除',
		edit: '編集',
		add: '追加',
		undo: '元に戻す',
		retry: '再試行',
		open: '開く',
	},
	dialogs: {
		confirm_delete: '削除しますか? (元に戻せません)',
	},
	library: {
		landmark: 'ライブラリ',
		search_placeholder: 'ライブラリを検索',
		clear_search: '検索をクリア',
	},
	workspace: {
		undo_snackbar_close: 'snackbar を閉じる',
	},
} as const;
