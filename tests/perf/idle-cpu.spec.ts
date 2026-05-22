import { expect, test } from '../fixtures/tauri';
import { logicalCpuCount, processTreeCpuSeconds, reportBudget } from './_helpers';

/**
 * D6: idle CPU ≤ 1% (常時アニメーション / poll が無いこと)。
 *
 * Tauri process + WebView2 子プロセス tree の合計 CPU 秒を idle 区間の前後で測り、
 * 経過 wall 時間と論理 CPU 数で正規化して CPU% を出す。 idle 区間は ARCAGATE_PERF_IDLE_SEC
 * で短縮可能 (default 30s)。
 */
const IDLE_SEC = Number.parseInt(process.env.ARCAGATE_PERF_IDLE_SEC ?? '30', 10);

test('D6 idle CPU', async ({ page }) => {
	test.setTimeout((IDLE_SEC + 120) * 1000);

	const pid = Number.parseInt(process.env.ARCAGATE_TEST_PID ?? '0', 10);
	expect(pid, 'ARCAGATE_TEST_PID must be set by global-setup').toBeGreaterThan(0);

	// 静的画面 (Library) に置いてから idle 計測 — UI 操作はここで止める。
	await page.getByRole('button', { name: 'Library', exact: true }).first().click();
	await page.waitForTimeout(1500);

	const cpu0 = await processTreeCpuSeconds(pid);
	const wall0 = Date.now();
	await page.waitForTimeout(IDLE_SEC * 1000);
	const cpu1 = await processTreeCpuSeconds(pid);
	const wallSec = (Date.now() - wall0) / 1000;

	const cores = logicalCpuCount();
	const cpuPercent = ((cpu1 - cpu0) / wallSec / cores) * 100;
	console.log(
		`[perf] D6 idle CPU: cpuDelta=${(cpu1 - cpu0).toFixed(2)}s wall=${wallSec.toFixed(1)}s ` +
			`cores=${cores} -> ${cpuPercent.toFixed(2)}%`,
	);
	reportBudget({
		budget: 'D6',
		name: 'idle-cpu',
		metric: 'cpu-percent',
		value: Math.max(0, cpuPercent),
		unit: '%',
		threshold: 1,
		comparator: 'lte',
	});
});
