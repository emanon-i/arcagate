/**
 * Rust 側 AppError variants から launch エラーの原因を分類し、ユーザ向けメッセージに整形する。
 *
 * Nielsen H9 (Help users recognize, diagnose, and recover from errors) 対応。
 * 「原因 + 次の操作」フォーマットで、ユーザが何をすべきか提示する。
 *
 * 対応 variant: LaunchFileNotFound / LaunchPermissionDenied / LaunchNotExecutable / LaunchFailed
 */
export function formatLaunchError(label: string, error: unknown): string {
	const msg = String(error);
	const target = label || 'アイテム';

	if (msg.includes('File not found:')) {
		return `「${target}」が見つかりません — パスが移動 / 削除された可能性があります。アイテム編集で確認してください。`;
	}
	if (msg.includes('Permission denied:')) {
		return `「${target}」の起動権限がありません — 管理者として実行を試すか、ファイルのアクセス権を確認してください。`;
	}
	if (msg.includes('Not executable:')) {
		return `「${target}」は実行可能ファイルではありません — アイテム種別 (Exe / Script / Folder 等) を確認してください。`;
	}
	return `「${target}」の起動に失敗しました — ${msg}`;
}
