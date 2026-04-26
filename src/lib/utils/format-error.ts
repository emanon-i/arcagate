/**
 * Tauri IPC エラーから人間可読なメッセージを取り出す (PH-429)。
 *
 * AppError serialize 形式が `{ code, message }` object になったため、
 * `${String(e)}` だけでは `[object Object]` になる。本 helper で吸収する。
 */

export function getErrorMessage(error: unknown): string {
	if (typeof error === 'string') return error;
	if (typeof error === 'object' && error !== null) {
		const obj = error as { message?: unknown; toString?: () => string };
		if (typeof obj.message === 'string') return obj.message;
		// fallback: toString が default Object でなければ使う
		if (typeof obj.toString === 'function') {
			const s = obj.toString();
			if (s !== '[object Object]') return s;
		}
		return JSON.stringify(error);
	}
	return String(error);
}

export function getErrorCode(error: unknown): string | null {
	if (typeof error !== 'object' || error === null) return null;
	const obj = error as { code?: unknown };
	return typeof obj.code === 'string' ? obj.code : null;
}
