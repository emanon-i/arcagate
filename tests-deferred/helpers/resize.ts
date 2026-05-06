import type { Page } from '@playwright/test';

export async function resizeWindow(page: Page, width: number, height: number): Promise<void> {
	// page.evaluate 内では bare module specifier (@tauri-apps/api/...) が解決できないため
	// __TAURI_INTERNALS__.invoke を直接呼ぶ（Tauri v2 の内部 IPC）
	await page.evaluate(
		async ([w, h]) => {
			await (
				window as unknown as {
					__TAURI_INTERNALS__: { invoke: (cmd: string, args?: unknown) => Promise<unknown> };
				}
			).__TAURI_INTERNALS__.invoke('plugin:window|set_size', {
				label: 'main',
				value: { Logical: { width: w, height: h } },
			});
		},
		[width, height] as [number, number],
	);
	// リサイズ後に CSS レイアウトが安定するのを待つ
	await page.waitForTimeout(300);
}
