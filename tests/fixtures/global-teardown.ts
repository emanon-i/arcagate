import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

export default async function globalTeardown(): Promise<void> {
	// Tauri プロセスを終了
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

	// テスト用 DB を削除
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
