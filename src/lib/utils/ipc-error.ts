/**
 * IPC エラー全般の「原因 + 次の操作」フォーマット (PH-426 / Codex Q4 推奨 #3)。
 *
 * formatLaunchError は launch 専用、本 helper は launch 以外の汎用 IPC catch 用。
 * AppError::code() ベースで分類し、操作名 + 復旧導線を組み合わせる。
 */

import { getErrorCode, getErrorMessage } from './format-error';

interface FormatOptions {
	/** 操作の人間語名 ("アイテム作成" / "テーマ保存" 等) */
	operation: string;
}

/**
 * IPC エラーをユーザ向けフォーマットに変換。
 *
 * 例: formatIpcError({ operation: 'アイテム作成' }, err)
 *   → "アイテム作成に失敗しました — 不正な入力: ..."
 */
export function formatIpcError(opts: FormatOptions, error: unknown): string {
	const code = getErrorCode(error);
	const msg = getErrorMessage(error);
	const op = opts.operation;

	switch (code) {
		case 'db.lock':
			return `${op}に失敗しました — DB アクセスが競合しています。少し待って再試行してください。`;
		case 'not_found':
			return `${op}に失敗しました — 対象が見つかりません。一覧を再読み込みしてください。`;
		case 'invalid_input':
			return `${op}に失敗しました — 入力内容を確認してください: ${msg}`;
		case 'validation':
			return `${op}に失敗しました — 入力検証エラー: ${msg}`;
		case 'permission':
			return `${op}に失敗しました — 権限がありません。アクセス権を確認してください。`;
		case 'cancelled':
			return `${op}を中止しました。`;
		case 'watch.failed':
			return `${op}に失敗しました — フォルダ監視を開始できませんでした: ${msg}`;
		case 'zip':
			return `${op}に失敗しました — ZIP 処理エラー: ${msg}`;
		case 'db.error':
			return `${op}に失敗しました — DB エラーが発生しました: ${msg}`;
		case 'io.error':
			return `${op}に失敗しました — ファイル I/O エラー: ${msg}`;
		default:
			return `${op}に失敗しました — ${msg}`;
	}
}
