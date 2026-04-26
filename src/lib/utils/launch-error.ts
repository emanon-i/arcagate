/**
 * Rust 側 AppError variants から launch エラーの原因を分類し、ユーザ向けメッセージに整形する。
 *
 * Nielsen H9 (Help users recognize, diagnose, and recover from errors) 対応。
 * 「原因 + 次の操作」フォーマットで、ユーザが何をすべきか提示する。
 *
 * PH-429 で AppError serialize 形式が `{ code, message }` object になったため、
 * primary は errorCode field 判定、fallback で string contains。
 */

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
	const target = label || 'アイテム';
	const obj = asAppErrorObject(error);
	const code = obj?.code ?? '';
	const msg = obj?.message ?? String(error);

	if (code === 'launch.file_not_found' || msg.includes('File not found:')) {
		return `「${target}」が見つかりません — パスが移動 / 削除された可能性があります。アイテム編集で確認してください。`;
	}
	if (code === 'launch.permission_denied' || msg.includes('Permission denied:')) {
		return `「${target}」の起動権限がありません — 管理者として実行を試すか、ファイルのアクセス権を確認してください。`;
	}
	if (code === 'launch.not_executable' || msg.includes('Not executable:')) {
		return `「${target}」は実行可能ファイルではありません — アイテム種別 (Exe / Script / Folder 等) を確認してください。`;
	}
	return `「${target}」の起動に失敗しました — ${msg}`;
}
