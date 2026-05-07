import { toastStore } from './toast.svelte';

/**
 * Frontend silent fail 検知 (R4-A B-2 / audit C8)。
 *
 * 旧実装: `window.addEventListener('unhandledrejection')` も `window.onerror` も
 * registered されておらず、Svelte の `<svelte:boundary>` で catch できない非同期エラー
 * (Promise rejection / setTimeout / event handler 内 throw) が **silent fail** していた。
 *
 * 本 module:
 * - `unhandledrejection` event を捕捉、message を console.error + toast (level=error) で表示
 * - `error` event (window-level、bubble してくる thrown error) を同様に処理
 * - 連発抑止: 同 message が 5 秒以内に再発生したら toast を suppress (console.error は維持)
 * - `installErrorMonitor()` は `+layout.svelte` mount 時に 1 回だけ呼ぶ。idempotent。
 */

const RECENT_TTL_MS = 5_000;
const MAX_RECENT = 16;
const recent: Map<string, number> = new Map();

function shouldSuppress(key: string): boolean {
	const now = Date.now();
	const last = recent.get(key);
	if (last !== undefined && now - last < RECENT_TTL_MS) {
		recent.set(key, now);
		return true;
	}
	recent.set(key, now);
	if (recent.size > MAX_RECENT) {
		// LRU-ish eviction: oldest entry を削除
		const oldestKey = recent.keys().next().value;
		if (oldestKey !== undefined) recent.delete(oldestKey);
	}
	return false;
}

function formatReason(reason: unknown): string {
	if (reason instanceof Error) {
		return reason.message || reason.name || 'Error';
	}
	if (typeof reason === 'string') return reason;
	if (reason && typeof reason === 'object') {
		try {
			return JSON.stringify(reason);
		} catch {
			return String(reason);
		}
	}
	return String(reason);
}

function handleUnhandledRejection(ev: PromiseRejectionEvent): void {
	const message = formatReason(ev.reason);
	console.error('[error-monitor] unhandledrejection', ev.reason);
	if (!shouldSuppress(`reject:${message}`)) {
		toastStore.add(`予期しないエラー: ${message}`, 'error');
	}
}

function handleWindowError(ev: ErrorEvent): void {
	const message = ev.message || formatReason(ev.error);
	console.error('[error-monitor] window error', ev.error ?? ev.message);
	if (!shouldSuppress(`error:${message}`)) {
		toastStore.add(`予期しないエラー: ${message}`, 'error');
	}
}

let installed = false;

export function installErrorMonitor(): () => void {
	if (typeof window === 'undefined') return () => {};
	if (installed) return uninstallErrorMonitor;
	window.addEventListener('unhandledrejection', handleUnhandledRejection);
	window.addEventListener('error', handleWindowError);
	installed = true;
	return uninstallErrorMonitor;
}

export function uninstallErrorMonitor(): void {
	if (typeof window === 'undefined') return;
	window.removeEventListener('unhandledrejection', handleUnhandledRejection);
	window.removeEventListener('error', handleWindowError);
	installed = false;
	recent.clear();
}

/**
 * test 用: suppression cache を reset。
 */
export function __resetForTest(): void {
	recent.clear();
}
