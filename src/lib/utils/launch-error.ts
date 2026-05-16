/**
 * Rust 側 AppError variants から launch エラーの原因を分類し、ユーザ向けメッセージに整形する。
 *
 * Nielsen H9 (Help users recognize, diagnose, and recover from errors) 対応。
 * 「原因 + 次の操作」フォーマットで、ユーザが何をすべきか提示する。
 *
 * PH-429 で AppError serialize 形式が `{ code, message }` object になったため、
 * primary は errorCode field 判定、fallback で string contains。
 */

import { t } from '$lib/i18n.svelte';

export interface AppErrorObject {
	code: string;
	message: string;
}

function asAppErrorObject(error: unknown): AppErrorObject | null {
	if (typeof error !== 'object' || error === null) return null;
	const obj = error as { code?: unknown; message?: unknown };
	if (typeof obj.code === 'string' && typeof obj.message === 'string') {
		return { code: obj.code, message: obj.message };
	}
	return null;
}

export function formatLaunchError(label: string, error: unknown): string {
	const target = label || t('widgets.widget_label.item');
	const obj = asAppErrorObject(error);
	const code = obj?.code ?? '';
	const msg = obj?.message ?? String(error);

	if (code === 'launch.file_not_found' || msg.includes('File not found:')) {
		return t('error.launch.file_not_found', { target });
	}
	if (code === 'launch.permission_denied' || msg.includes('Permission denied:')) {
		return t('error.launch.permission_denied', { target });
	}
	if (code === 'launch.not_executable' || msg.includes('Not executable:')) {
		return t('error.launch.not_executable', { target });
	}
	return t('error.launch.generic', { target, msg });
}
