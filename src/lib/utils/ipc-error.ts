/**
 * IPC エラー全般の「原因 + 次の操作」フォーマット (PH-426 / Codex Q4 推奨 #3)。
 *
 * formatLaunchError は launch 専用、本 helper は launch 以外の汎用 IPC catch 用。
 * AppError::code() ベースで分類し、操作名 + 復旧導線を組み合わせる。
 */

import { t } from '$lib/i18n.svelte';
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
			return t('error.ipc.db_lock', { op });
		case 'not_found':
			return t('error.ipc.not_found', { op });
		case 'invalid_input':
			return t('error.ipc.invalid_input', { op, msg });
		case 'validation':
			return t('error.ipc.validation', { op, msg });
		case 'permission':
			return t('error.ipc.permission', { op });
		case 'cancelled':
			return t('error.ipc.cancelled', { op });
		case 'watch.failed':
			return t('error.ipc.watch_failed', { op, msg });
		case 'zip':
			return t('error.ipc.zip', { op, msg });
		case 'db.error':
			return t('error.ipc.db_error', { op, msg });
		case 'io.error':
			return t('error.ipc.io_error', { op, msg });
		default:
			return t('error.ipc.generic', { op, msg });
	}
}
