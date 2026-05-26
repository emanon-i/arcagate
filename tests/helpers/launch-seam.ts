/**
 * PH-CF-1210 ⑨ e2e: launcher::try_spawn_cmd の build-flag シームが書き出す JSON 行を読む helper。
 *
 * 設計: spec 開始時に `clearSeamLog()` で truncate → UI 操作 (click / 右クリック) を発火 →
 * `pollSeamRecords(min: 1)` で append された 1 行以上を JSON parse して返す。 spec が
 * 個別行を assert する。
 *
 * 実 UI 経路:
 *   spec が click → Svelte handler → launchItemWithCascade → cmd_launch_with_opener →
 *   opener_service::launch_with → launcher::launch_argv → try_spawn_cmd → seam log append。
 *
 * 合成 hook で UI を bypass しない (PR #570 教訓 / dom-not-fixed rule)。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface SeamRecord {
	what: string;
	program: string;
	args: string[];
	cwd?: string;
}

function seamLogPath(): string {
	const p = process.env.ARCAGATE_TEST_LAUNCH_SEAM_LOG;
	if (!p) {
		throw new Error(
			'ARCAGATE_TEST_LAUNCH_SEAM_LOG env not set — global-setup.ts must define it before tests run',
		);
	}
	return p;
}

/** spec の各操作前に呼んで、 過去 spec / 過去操作の log を破棄する。 */
export function clearSeamLog(): void {
	const p = seamLogPath();
	mkdirSync(dirname(p), { recursive: true });
	writeFileSync(p, '');
}

function readAll(): SeamRecord[] {
	const p = seamLogPath();
	let raw = '';
	try {
		raw = readFileSync(p, 'utf8');
	} catch (e) {
		const msg = (e as { code?: string }).code;
		if (msg === 'ENOENT') return [];
		throw e;
	}
	const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
	return lines.map((l) => JSON.parse(l) as SeamRecord);
}

/** append された行数が `min` 以上になるまで polling。 timeout で throw。 */
export async function pollSeamRecords(min: number, timeoutMs = 8_000): Promise<SeamRecord[]> {
	const start = Date.now();
	let last: SeamRecord[] = [];
	while (Date.now() - start < timeoutMs) {
		last = readAll();
		if (last.length >= min) return last;
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error(
		`launch seam log did not receive >= ${min} records within ${timeoutMs}ms (got ${last.length}). ` +
			`Check (a) binary was built with --features test-launch-seam, (b) the UI handler actually ` +
			`reached launcher::try_spawn_cmd, (c) ARCAGATE_TEST_LAUNCH_SEAM_LOG path is writable.`,
	);
}

/** 「seam log が空のまま」 を保証する (= spawn 要求が一切出ていない negative assert)。 */
export async function expectNoSeamRecords(idleMs = 1_000): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < idleMs) {
		const rs = readAll();
		if (rs.length > 0) {
			throw new Error(`expected no seam records but got ${rs.length}: ${JSON.stringify(rs)}`);
		}
		await new Promise((r) => setTimeout(r, 50));
	}
}
