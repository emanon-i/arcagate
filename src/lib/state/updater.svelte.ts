/**
 * Updater 自動チェック (PH-456 batch-103)。
 *
 * - 起動時 1 回チェック (configStore.setupComplete 後)
 * - 24h 間隔の interval チェック
 * - 利用可能なら toast 通知 (1 日 1 回まで、dismiss 後は 24h 抑制)
 * - localStorage に lastCheckedAt / lastDismissedVersion 保存
 *
 * pubkey が placeholder のうちは check() が成功しない可能性 → silent fail で OK。
 * 本番鍵設定 (PH-455) 後に動作する。
 */

import { check } from '@tauri-apps/plugin-updater';
import { toastStore } from './toast.svelte';

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const KEY_LAST_CHECKED = 'arcagate.updater.lastCheckedAt';
const KEY_LAST_DISMISSED = 'arcagate.updater.lastDismissedVersion';

let initialized = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

/** 起動時 + 24h interval 開始 (idempotent: 多重呼び出し OK) */
export function startUpdaterAutoCheck(): void {
	if (initialized) return;
	initialized = true;

	// 起動時 1 回 (5 秒遅延でアプリ準備完了を待つ)
	setTimeout(() => {
		void runCheck('startup');
	}, 5_000);

	// 24h 間隔
	intervalId = setInterval(() => {
		void runCheck('interval');
	}, CHECK_INTERVAL_MS);
}

export function stopUpdaterAutoCheck(): void {
	initialized = false;
	if (intervalId !== null) {
		clearInterval(intervalId);
		intervalId = null;
	}
}

/** 内部: 1 回チェック実行 + toast 判定 */
async function runCheck(_trigger: 'startup' | 'interval'): Promise<void> {
	try {
		const update = await check();
		setItem(KEY_LAST_CHECKED, new Date().toISOString());

		if (!update) return;

		// 同 version を既に dismiss していたら skip
		const dismissed = getItem(KEY_LAST_DISMISSED);
		if (dismissed === update.version) return;

		// 通知
		toastStore.add(
			`新バージョン v${update.version} が利用可能 — Settings > 一般 > アップデート で適用`,
			'info',
		);
		// 1 度通知したら dismiss 扱いで再通知抑制 (ユーザが Settings で適用 or 手動 dismiss する想定)
		setItem(KEY_LAST_DISMISSED, update.version);
	} catch (_err) {
		// pubkey 未設定 / network 失敗 等は silent (auto-check の信頼性を下げない)
	}
}

function getItem(key: string): string | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function setItem(key: string, value: string): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(key, value);
	} catch {
		// quota exceeded / private browsing 等は無視
	}
}
