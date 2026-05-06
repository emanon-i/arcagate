import { execFile } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
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

	// CDP 接続して SetupWizard / Onboarding をスキップ
	const browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
	try {
		const ctx = browser.contexts()[0];
		const page = ctx.pages()[0] ?? (await ctx.waitForEvent('page'));
		// WebView2 が about:blank から devUrl に遷移するまで待機
		await page.waitForURL(/^http:\/\/localhost:\d+\/?(\?.*)?$/, { timeout: 30_000 });
		await page.waitForLoadState('domcontentloaded');

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
		// reload で SetupWizard / OnboardingTour overlay を確実に dismiss
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
	} finally {
		await browser.close();
	}
}
