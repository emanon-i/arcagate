import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

/**
 * Tauri プロセスツリー終了 + テスト DB cleanup。
 *
 * 引用元: .claude/skills/e2e-tauri-webview2 (globalTeardown pattern、Windows プロセスツリー対応)
 *
 * Windows: process.kill(pid) はサブプロセスツリーを残すため `taskkill /T /F` を使う。
 */
export default async function globalTeardown(): Promise<void> {
	const pid = process.env.ARCAGATE_TEST_PID;
	if (pid) {
		if (process.platform === 'win32') {
			try {
				execSync(`taskkill /PID ${pid} /T /F`);
			} catch {
				// already terminated
			}
		} else {
			try {
				process.kill(Number(pid));
			} catch {
				// already terminated
			}
		}
	}

	const dbPath = process.env.ARCAGATE_TEST_DB_PATH;
	if (dbPath) {
		for (const suffix of ['', '-wal', '-shm']) {
			try {
				rmSync(dbPath + suffix);
			} catch {
				// file may not exist
			}
		}
	}
}
