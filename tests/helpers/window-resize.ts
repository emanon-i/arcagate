import type { Page } from '@playwright/test';

/**
 * Tauri default window (800x600) は Tailwind `lg:` breakpoint (1024px) 未満のため、
 * `LibraryLayout` の detail wrapper (`class="hidden ... lg:block"`) が display:none に
 * なり panel 内要素を click できない。
 *
 * 当初 Tauri internal IPC `plugin:window|set_size` で window を 1280x800 にリサイズする
 * helper を作ったが、 CI run 26372482935 (job 77626989503) で「Target page, context or
 * browser has been closed」 が 30+ spec で連鎖発生し全 e2e が落ちる回帰を起こした。
 * payload 形式 (`{ type, data }` / `{ value: { Logical } }`) のいずれでも Tauri window が
 * 不安定化したため、 e2e からの window resize 自体を放棄する。
 *
 * 代替: `<style>` を head に inject して `library-detail-wrapper` を `display:block !important`
 * で強制表示する。 Tauri window のサイズは変えないので panic risk なし。 CSS-only な hack なので
 * production code への影響もない (e2e セッション内に閉じる)。
 */
export async function forceDetailWrapperVisible(page: Page): Promise<void> {
	await page.evaluate(() => {
		const styleId = 'arcagate-e2e-force-detail-wrapper';
		if (document.getElementById(styleId)) return;
		const style = document.createElement('style');
		style.id = styleId;
		style.textContent =
			'[data-testid="library-detail-wrapper"]{display:block !important;min-width:360px;}';
		document.head.appendChild(style);
	});
}

/**
 * 旧 `resizeMainWindow` API は名前を残しつつ実装は `forceDetailWrapperVisible` へ移譲。
 * window resize を止めて CSS-only hack に変えた経緯は本 file 冒頭コメントを参照。 引数の
 * width / height は無視する (interface 互換のため引数を残す)。
 */
export async function resizeMainWindow(page: Page, _width: number, _height: number): Promise<void> {
	await forceDetailWrapperVisible(page);
}
