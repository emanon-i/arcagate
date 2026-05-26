import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
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
 * PH-CF-1210 ⑨ e2e: launcher の spawn 葉を build flag (`test-launch-seam`) 経由で差し替え、
 * 「click 経路と右クリック『デフォルトで開く』 が同じ opener + 同じ target で launch 要求を
 * 出した」 ことを実 UI 経路で機械検証するための log file。 binary がこの env var を見て
 * 実 spawn を skip し、 `{ what, program, args, cwd }` の JSON 行を append する。
 * 各 spec は読み取り前に file を truncate するため共有 path で OK。
 */
const LAUNCH_SEAM_LOG = join(DB_DIR, `launch-seam-${Date.now()}.log`);

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
	// PH-CF-1210 ⑨: launch seam log path を spec 側に渡す (helpers/launch-seam.ts が読む)。
	process.env.ARCAGATE_TEST_LAUNCH_SEAM_LOG = LAUNCH_SEAM_LOG;

	// SPAWN_HORIZONTAL_PATHEXT_SEAM_2026-05-26 audit: bare name + PATHEXT 解決を e2e で検証する
	// 専用 .cmd shim を作って Tauri プロセスの PATH に prepend する。 Playwright 自身の
	// process.env.PATH は **書き換えない** (node を別の `.cmd` で shadow してテストランナーを
	// 壊さないため)。 spec は `ARCAGATE_TEST_PATHEXT_SHIM_NAME` を使って bare name で
	// item.target を設定 → PATHEXT 経由で resolve され、 seam log に絶対 path が記録される。
	const SHIM_DIR = join(DB_DIR, `pathext-shim-${Date.now()}`);
	const SHIM_NAME = 'arcagate_e2e_pathext_probe';
	mkdirSync(SHIM_DIR, { recursive: true });
	writeFileSync(join(SHIM_DIR, `${SHIM_NAME}.cmd`), '@echo off\r\nexit /b 0\r\n');
	process.env.ARCAGATE_TEST_PATHEXT_SHIM_NAME = SHIM_NAME;
	process.env.ARCAGATE_TEST_PATHEXT_SHIM_DIR = SHIM_DIR;
	const tauriPath = `${SHIM_DIR};${process.env.PATH ?? ''}`;

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
			// PH-CF-1210 ⑨: launcher::try_spawn_cmd が見る env var。 binary が
			// `--features test-launch-seam` 付きで build されていれば、 実 spawn を skip して
			// この path に JSON 行を append する。 build flag 無しなら無視 (普通の spawn)。
			ARCAGATE_TEST_LAUNCH_SEAM_LOG: LAUNCH_SEAM_LOG,
			// SPAWN_HORIZONTAL_PATHEXT_SEAM_2026-05-26: Tauri プロセスのみ PATH を上書きして
			// e2e 用 .cmd shim を bare name 解決対象にする。 Playwright の node は影響を受けない。
			PATH: tauriPath,
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
		// 連鎖 fail を起こす regression。 test 環境では localStorage 経由で locale 強制 = +layout の
		// resolveInitialLocale が最優先で参照する key (= arcagate.test.force_locale)。
		//
		// PH-PQ-700 T7: ARCAGATE_E2E_LOCALE で ja / en を切替可能に。 未指定なら 'ja' (既定)。
		// en mode は tests/e2e/locale-en/ の spec が EN release を検証する。
		const e2eLocale = process.env.ARCAGATE_E2E_LOCALE === 'en' ? 'en' : 'ja';
		await page.evaluate((locale) => {
			localStorage.setItem('arcagate.test.force_locale', locale);
		}, e2eLocale);

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
