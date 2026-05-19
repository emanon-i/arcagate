/**
 * W-10 (2026-05-19): Projects widget の git poll 間隔を spec 契約範囲に clamp する。
 *
 * projects.md「poll 間隔を短くしすぎない (最小 10 秒)」/ config schema
 * `git_poll_interval_sec` (10-600)。Settings UI (ProjectsSettings.svelte) でも入力を
 * clamp するが、import / 旧 config / 手動編集 JSON 経由で契約下限を破る値が widget
 * config に入りうるため、`setInterval` に渡す実行直前でも clamp する。
 */

export const MIN_GIT_POLL_INTERVAL_SEC = 10;
export const MAX_GIT_POLL_INTERVAL_SEC = 600;
export const DEFAULT_GIT_POLL_INTERVAL_SEC = 60;

/** config 値を [MIN, MAX] 秒に clamp。非数値 / 非有限値は default にフォールバック。 */
export function clampGitPollIntervalSec(value: unknown): number {
	const sec = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(sec)) return DEFAULT_GIT_POLL_INTERVAL_SEC;
	return Math.min(MAX_GIT_POLL_INTERVAL_SEC, Math.max(MIN_GIT_POLL_INTERVAL_SEC, sec));
}
