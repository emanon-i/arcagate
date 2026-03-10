import { execFile } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { findMainPage } from '../helpers/app-ready.js';
import { markSetupComplete } from '../helpers/ipc.js';

const CDP_PORT = 9515;
const TAURI_EXE = join(process.cwd(), 'src-tauri', 'target', 'debug', 'arcagate.exe');
const DB_DIR = join(process.cwd(), 'tmp');
const DB_PATH = join(DB_DIR, `test-${Date.now()}.db`);

async function waitForCdp(port: number, maxRetries = 60): Promise<void> {
	for (let i = 0; i < maxRetries; i++) {
		try {
			const res = await fetch(`http://localhost:${port}/json/version`);
			if (res.ok) return;
		} catch {
			// not ready yet
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error(`CDP port ${port} did not become available within 30s`);
}

export default async function globalSetup(): Promise<void> {
	mkdirSync(DB_DIR, { recursive: true });

	process.env.ARCAGATE_TEST_DB_PATH = DB_PATH;
	process.env.ARCAGATE_TEST_CDP_PORT = String(CDP_PORT);

	const tauriProcess = execFile(TAURI_EXE, [], {
		env: {
			...process.env,
			ARCAGATE_DB_PATH: DB_PATH,
			WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}`,
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

	// CDP 接続して SetupWizard をスキップ
	const browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
	try {
		const ctx = browser.contexts()[0];
		// メインウィンドウを URL で特定（パレットウィンドウ /palette を除外）
		let page = findMainPage(ctx);
		if (!page) {
			page = ctx.pages()[0] ?? (await ctx.waitForEvent('page'));
		}
		// WebView2 が about:blank から devUrl に遷移するまで待機
		// waitForCdp が成功しても devUrl ロード前の場合があるため
		await page.waitForURL(/^http:\/\/localhost:\d+\/?(\?.*)?$/, { timeout: 30_000 });
		await page.waitForLoadState('domcontentloaded');

		// SetupWizard スキップ
		try {
			await markSetupComplete(page);
		} catch {
			// 既に完了済みの場合は無視
		}

		// ページをリロードして SetupWizard をバイパスした状態にする
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
	} finally {
		await browser.close();
	}
}
