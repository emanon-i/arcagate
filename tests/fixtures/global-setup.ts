import { execFile } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';
import { markOnboardingComplete, markSetupComplete } from '../helpers/ipc.js';

/**
 * Tauri debug binary を起動して CDP attach + SetupWizard / Onboarding skip。
 *
 * 引用元: .claude/skills/e2e-tauri-webview2 (globalSetup pattern)
 *
 * minimal T1 phase 版: 旧版 (PR-Z 削除済) から複雑な app-ready helper を除き、
 * Tauri 起動 + waitForCdp + IPC で setup/onboarding mark のみ。
 */
const CDP_PORT = 9515;
// PH-PQ-400 T1: perf.yml は release binary (frontendDist 埋込) で計測するため
// ARCAGATE_TEST_EXE で binary path を上書きできる。 未指定なら debug binary (e2e 既定)。
const TAURI_EXE = process.env.ARCAGATE_TEST_EXE
	? isAbsolute(process.env.ARCAGATE_TEST_EXE)
		? process.env.ARCAGATE_TEST_EXE
		: resolve(process.cwd(), process.env.ARCAGATE_TEST_EXE)
	: join(process.cwd(), 'src-tauri', 'target', 'debug', 'arcagate.exe');
const DB_DIR = join(process.cwd(), 'tmp');
const DB_PATH = join(DB_DIR, `test-${Date.now()}.db`);

/**
 * Windows runner で WebView2 cold start が 30s 内に CDP を開けない flake が頻発
 * (2026-05-15 #471-#475 全 5 PR で再現)。 timeout を 60s に延長して infra flake を吸収。
 *
 * 引用元: .claude/skills/e2e-tauri-webview2 「CI で Vite 起動タイムアウト → webServer.timeout
 * を 60_000 に延長」 と同方針 (CDP 側も同じく cold start 緩衝が必要)。
 */
async function waitForCdp(port: number, maxRetries = 120): Promise<void> {
	const timeoutSec = (maxRetries * 500) / 1000;
	for (let i = 0; i < maxRetries; i++) {
		try {
			const res = await fetch(`http://localhost:${port}/json/version`);
			if (res.ok) return;
		} catch {
			// not ready yet
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error(`CDP port ${port} did not become available within ${timeoutSec}s`);
}

export default async function globalSetup(): Promise<void> {
	mkdirSync(DB_DIR, { recursive: true });

	process.env.ARCAGATE_TEST_DB_PATH = DB_PATH;
	process.env.ARCAGATE_TEST_CDP_PORT = String(CDP_PORT);

	// user dev / 既存 webview2 instance と user-data-folder を共有しないよう e2e 専用 path に隔離。
	// 共有すると既存 instance に被って --remote-debugging-port が新規 instance に伝わらず
	// CDP が 60s 内に開かない flake になる。
	const WV2_DIR = join(DB_DIR, `wv2-e2e-${Date.now()}`);
	mkdirSync(WV2_DIR, { recursive: true });

	const tauriProcess = execFile(TAURI_EXE, [], {
		env: {
			...process.env,
			ARCAGATE_DB_PATH: DB_PATH,
			// e2e は user dev と同 OS で同 hotkey を奪い合うので skip (lib.rs 側で env 認識)
			ARCAGATE_SKIP_HOTKEY: '1',
			WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}`,
			WEBVIEW2_USER_DATA_FOLDER: WV2_DIR,
		},
	});

	if (!tauriProcess.pid) {
		throw new Error('Failed to start Tauri process');
	}

	process.env.ARCAGATE_TEST_PID = String(tauriProcess.pid);

	tauriProcess.stderr?.on('data', (data: Buffer) => {
		process.stderr.write(`[tauri] ${data}`);
	});

	await waitForCdp(CDP_PORT);

	// CDP 接続して SetupWizard / Onboarding をスキップ
	const browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
	try {
		const ctx = browser.contexts()[0];
		// T2-1 fix #2: CI cold start で WebView2 page event が default 30s 内に来ない
		// 場合があるため、明示 60s に延長 (T1 phase で flaky だった対処の継続)。
		// 2026-05-19: Tauri は main window (/) と palette window (/palette) の 2 webview を
		// 持つ。 ctx.pages()[0] は palette を掴むことがあり main 用 waitForURL が timeout する
		// flake になっていた。 全 page を polling して main (/) を明示選択する。
		// PH-PQ-400 T1: debug は devUrl (localhost:PORT)、 release binary は
		// frontendDist 埋込で http://tauri.localhost/。 両方の main window を拾う。
		const mainUrlRe = /^https?:\/\/(localhost:\d+|tauri\.localhost)\/?(\?.*)?$/;
		let page = ctx.pages().find((p) => mainUrlRe.test(p.url()));
		for (let i = 0; !page && i < 120; i++) {
			await new Promise((r) => setTimeout(r, 500));
			page = ctx.pages().find((p) => mainUrlRe.test(p.url()));
		}
		if (!page) throw new Error('main window (/) page did not appear within 60s');
		// WebView2 が about:blank から devUrl に遷移するまで待機
		await page.waitForURL(mainUrlRe, { timeout: 30_000 });
		await page.waitForLoadState('domcontentloaded');

		// 2026-05-15 i18n e2e fix: localStorage に test 強制 locale を pre-inject。
		// Windows runner の navigator.language='en-US' で OS auto-detect が 'en' を選択し、
		// messages_en.json 翻訳完備後に t() が en value を返す → e2e の ja-hardcode selector
		// (getByPlaceholder('ライブラリを検索') 等) と不一致 → element not found → page closed
		// 連鎖 fail を起こす regression。 test 環境では localStorage 経由で ja 強制 = +layout の
		// resolveInitialLocale が最優先で参照する key (= arcagate.test.force_locale)。
		await page.evaluate(() => {
			localStorage.setItem('arcagate.test.force_locale', 'ja');
		});

		try {
			await markSetupComplete(page);
		} catch {
			// 既に完了済みの場合は無視
		}
		try {
			await markOnboardingComplete(page);
		} catch {
			// 既に完了済みの場合は無視
		}
		// reload で SetupWizard / OnboardingTour overlay を確実に dismiss + localStorage の
		// force_locale が +layout の onMount で適用される。
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
	} finally {
		await browser.close();
	}
}
