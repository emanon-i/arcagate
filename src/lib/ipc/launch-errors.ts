/**
 * audit F15 (2026-05-18): launch IPC のエラー判定 (rune 非依存の純粋ロジック)。
 *
 * `launch.ts` は `$lib/state/script-confirm.svelte` (rune) に依存するため node 環境の
 * unit test から import できない。 確認要求の判定だけを本 module に切り出して
 * 単体テスト可能にする。
 */

/** backend が未確認 Command / Script 起動に返す AppError code。 */
export const CONFIRMATION_REQUIRED_CODE = 'launch.confirmation_required';

/** AppError ( `{ code, message }` ) が初回起動確認要求かを判定する。 */
export function isConfirmationRequired(e: unknown): e is { code: string; message: string } {
	return (
		typeof e === 'object' &&
		e !== null &&
		(e as { code?: unknown }).code === CONFIRMATION_REQUIRED_CODE
	);
}
