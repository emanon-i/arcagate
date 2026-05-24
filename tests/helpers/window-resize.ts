import type { Page } from '@playwright/test';

/**
 * Tauri default window (800x600) は Tailwind `lg:` breakpoint (1024px) 未満のため、
 * `LibraryLayout` の detail wrapper (`class="hidden ... lg:block"`) が display:none に
 * なり panel 内要素を click できない。
 *
 * 経緯:
 * 1. v1: Tauri internal IPC `plugin:window|set_size` で window を 1280x800 に resize
 *    → CI で Tauri window が不安定化し「Target page, context or browser has been
 *    closed」 が 30+ spec で連鎖 fail。
 * 2. v2: `<style>` head inject で `library-detail-wrapper` を `display:block !important`
 *    に強制表示 → CSS が sharedBrowser worker scope の page に永続化し、 後続 spec
 *    (LB-7 / dialog-pin 等) で wrapper が search input 等を覆い pointer events を
 *    intercept、 やはり連鎖 fail。
 * 3. v3 (本実装): CSS hack は維持しつつ、 caller が **afterEach で必ず cleanup** する
 *    pair API に変更。 `enableForceDetailWrapper(page) / disableForceDetailWrapper(page)`
 *    で明示 scope 化する。 旧 caller (resizeMainWindow / forceDetailWrapperVisible) は
 *    no-op に倒し、 周辺 spec を破壊しないようにする。
 */

const STYLE_ID = 'arcagate-e2e-force-detail-wrapper';
const CSS_RULE =
	'[data-testid="library-detail-wrapper"]{display:block !important;position:fixed !important;right:0 !important;top:40px !important;bottom:0 !important;width:360px !important;z-index:40 !important;}';

/**
 * 本 test 内だけ `library-detail-wrapper` を強制的に表示する。 必ず `afterEach` で
 * `disableForceDetailWrapper` を呼んで cleanup すること。 position fixed で右端に
 * overlay 化し、 grid layout を壊さない (= 後続 spec の click 経路に影響しない)。
 */
export async function enableForceDetailWrapper(page: Page): Promise<void> {
	await page.evaluate(
		({ id, css }) => {
			if (document.getElementById(id)) return;
			const style = document.createElement('style');
			style.id = id;
			style.textContent = css;
			document.head.appendChild(style);
		},
		{ id: STYLE_ID, css: CSS_RULE },
	);
}

/** `enableForceDetailWrapper` で inject した <style> を取り除く。 afterEach で必ず呼ぶこと。 */
export async function disableForceDetailWrapper(page: Page): Promise<void> {
	await page.evaluate((id) => {
		const el = document.getElementById(id);
		if (el) el.remove();
	}, STYLE_ID);
}

/**
 * 後方互換 no-op (sharedBrowser worker scope に CSS が残ると後続 spec を壊すため、
 * 旧 caller は即時 no-op に倒す)。 新しい test は `enableForceDetailWrapper` +
 * `afterEach(disableForceDetailWrapper)` の pair API を使うこと。
 */
export async function forceDetailWrapperVisible(_page: Page): Promise<void> {
	// no-op: CSS の永続化で周辺 spec を壊す回帰を防ぐため。 個別 spec は新 API を使う。
}

/**
 * 後方互換 no-op (resize は v1 で不安定化、 CSS hack は v2 で連鎖 fail を起こした経緯あり)。
 * 新しい test は `enableForceDetailWrapper` + `afterEach(disableForceDetailWrapper)` を使う。
 */
export async function resizeMainWindow(
	_page: Page,
	_width: number,
	_height: number,
): Promise<void> {
	// no-op: 経緯は本 file 冒頭コメント参照。
}
