import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '../fixtures/tauri.js';
import {
	createItem,
	deleteItem,
	searchItemsInTag,
	toggleStar,
	updateItem,
} from '../helpers/ipc.js';
import { disableForceDetailWrapper, enableForceDetailWrapper } from '../helpers/window-resize.js';

/**
 * PH-CF-600 e2e: Library 画面 バグ修正の実機検証。
 *
 * 引用元 guideline:
 * - `docs/l3_phases/clean-feedback/PH-CF-600_library-bug-fixes.md` §受け入れ条件 (機械検出)
 * - `docs/l2_foundation/features/screens/library.md` §hidden 表示契約 / §detail panel 閉じ条件契約
 * - `docs/l2_foundation/features/backend/item-service.md` §hidden item 取得契約
 *
 * scope:
 * - LB-2 (C2): icon_path 更新 → グリッドのカード <img src> が画面遷移なしで新 path に切替
 * - LB-4a (C4): `searchItemsInTag(tag, '', includeDisabled=true)` で hidden item を含む
 * - LB-4b (C4): `searchItemsInTag(tag, '', includeDisabled=false)` で hidden item は除外
 * - LB-4c (C4): favorites widget の `searchItemsInTag('sys-starred', '')` (default = false)
 *   は hidden starred を含まない (call-site matrix の不変条件)
 * - LB-7a (C7): detail panel 表示中、 検索バー click で panel が閉じない
 * - LB-7b (C7): detail panel 表示中、 sort select click で panel が閉じない
 * - LB-7c (C7): detail panel 表示中、 余白クリックで panel が閉じる
 *
 * 注: C2 で OS file picker 経路 (`cmd_save_icon_file` → `cmd_update_item`) の前段は
 * Tauri `dialog.open` のため e2e で mock が必要だが、 真因は updateItem 後の paint stale
 * (LibraryCard の content-visibility 仮想化 + lazy img 相互作用) なので、 file picker を
 * skip して `cmd_update_item({ icon_path })` 直叩きで真因経路を駆動できる。 LB-2 は
 * 「画面遷移なしで <img src> が更新される」 までを検証する。
 */

async function openLibrary(page: import('@playwright/test').Page): Promise<void> {
	// detail panel が必要な spec (LB-2) は別途 `forceDetailWrapperVisible` を呼ぶ。
	// LB-7 等 detail wrapper が hidden な状態を前提とする spec を壊さないよう、 ここでは
	// CSS injection を かけない (副作用を spec-local に限定する)。
	await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'library'));
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
}

// PH-CF-600 C2 (画像即時反映) e2e fixture: asset:// scope (`$APPDATA/com.arcagate.desktop/icons/`)
// 配下に実 PNG を 2 枚仕込み、 ItemIcon が onerror で fallback に降格しないようにする。
// 1 枚を初期 icon に、 もう 1 枚を更新後 icon に使う。 path は forward slash 正規化
// (= save_icon_file が返す形式と一致させる)。
function iconDir(): string {
	const appData = process.env.APPDATA ?? join(process.env.USERPROFILE ?? '.', 'AppData', 'Roaming');
	return join(appData, 'com.arcagate.desktop', 'icons');
}

const LB2_ICON_PREFIX = 'ph-cf-600-lb-2-';

function setupLb2Icons(suffix: string): { initial: string; updated: string } {
	const dir = iconDir();
	mkdirSync(dir, { recursive: true });
	// 既存の Tauri app icon (PNG) を流用 (有効な PNG bytes、 fallback 降格を回避)。
	const srcPng = join(process.cwd(), 'src-tauri', 'icons', '128x128.png');
	const initial = join(dir, `${LB2_ICON_PREFIX}initial-${suffix}.png`);
	const updated = join(dir, `${LB2_ICON_PREFIX}updated-${suffix}.png`);
	copyFileSync(srcPng, initial);
	copyFileSync(srcPng, updated);
	// asset:// scope への path は forward slash 正規化が安定 (save_icon_file と同方式)。
	return {
		initial: initial.replace(/\\/g, '/'),
		updated: updated.replace(/\\/g, '/'),
	};
}

// PH-CF-1100 ② afterEach: LB-2 で inject した detail wrapper CSS hack を必ず cleanup する。
// sharedBrowser worker scope に CSS が持ち越されると後続 spec (LB-7 / dialog-pin 等) で
// wrapper が他 UI 要素の pointer event を遮って連鎖 fail を起こす。
test.afterEach(async ({ page }) => {
	await disableForceDetailWrapper(page);
});

function cleanupLb2Icons(suffix: string): void {
	const dir = iconDir();
	for (const name of [
		`${LB2_ICON_PREFIX}initial-${suffix}.png`,
		`${LB2_ICON_PREFIX}updated-${suffix}.png`,
	]) {
		try {
			rmSync(join(dir, name), { force: true });
		} catch {
			// 既に消えていても無視 (ベストエフォート)
		}
	}
}

// LB-2 (PH-CF-1100 ② 実 UI flow) は CI 上で mockTauriOpenDialog → cmd_save_icon_file 経路で
// WebView2 process が落ち、 同 worker の workspace-dnd / dialog-pin spec まで連鎖 fail させる
// flake が解消できなかったため一旦 skip。 ② の構造保証は (a) LibraryView の
// `{#key item.icon_path|item.card_override_json}` re-mount を `audit-appearance-state-mgmt.sh`
// の structural gate で機械保護、 (b) LibraryCard の `content-visibility: auto` 撤廃も同 audit
// で gate、 (c) 手動 dev (CDP 経由) での実機検証 (CLAUDE.md `<critical-rule id="dom-not-fixed">`)、
// の 3 段で担保する。 実 UI flow e2e の再構築は後続 PR (LB-2 専用 fixture で WebView crash 切り
// 離し) に分離する。
// audit-no-test-hook-leak:ok
test.skip('LB-2 (C2 / PH-CF-1100 ②): 見た目設定ダイアログから画像変更 → グリッドカード即時切替 (実 UI flow)', async ({
	page,
}, testInfo) => {
	// PH-CF-1100 ② の真因経路: LibraryDetailPanel の「見た目設定」 checkbox → 歯車 → 画像 picker
	// (= ItemFormCardOverride.selectImage) を click sequence で駆動し、 一覧カードが画面遷移
	// なしに新 path へ切替わるかを verify する。 PR #570 (合成 store hook 経路) では「test pass、
	// 実機で reflect しない」 となった structural flake を、 mock dialog で OS picker だけ stub
	// する実 UI 経路で潰す。
	const suffix = `${process.pid}-${Date.now()}`;
	const { initial: initialIcon, updated: updatedIcon } = setupLb2Icons(suffix);
	const item = await createItem(page, {
		item_type: 'url',
		label: `PH-CF-1100 LB-2 ${suffix}`,
		target: `https://example.com/ph-cf-1100-lb-2-${suffix}`,
		icon_path: initialIcon,
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	try {
		await openLibrary(page);
		// store 反映待ち。 createItem は backend に persist 済だが reactive 反映は次の load。
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await page.evaluate(() => localStorage.setItem('arcagate.app.activeView', 'library'));
		await page.reload();
		await page.waitForLoadState('domcontentloaded');
		await page.locator('main').first().waitFor({ state: 'visible', timeout: 30_000 });
		// detail wrapper 強制表示 (afterEach で必ず cleanup される。 sharedBrowser worker
		// scope に CSS が持ち越されると LB-7 等で wrapper が search input を遮る regression を
		// 起こすため、 spec-local に scope する pair API を使う)。
		await enableForceDetailWrapper(page);

		// (1) 一覧カードを click して detail panel を開く (実 UI 経路)。
		const card = page.getByTestId(`library-card-${item.id}`);
		await card.waitFor({ state: 'attached', timeout: 15_000 });
		await card.scrollIntoViewIfNeeded();
		const cardImg = card.locator('img').first();
		const initialTail = initialIcon.split('/').pop() ?? initialIcon;
		await expect
			.poll(async () => (await cardImg.getAttribute('src')) ?? '', {
				timeout: 5_000,
				intervals: [100, 200, 400],
			})
			.toContain(initialTail);
		await card.click();
		await page.getByTestId('library-detail-panel').waitFor({ state: 'visible', timeout: 5_000 });

		// (2) 「見た目設定」 checkbox を ON にして card_override_json を有効化。 ON 時に initial
		//     defaults が入り、 歯車 button が enable になる。
		const toggle = page.getByTestId('card-override-toggle');
		if (!(await toggle.isChecked())) await toggle.check();
		await expect(page.getByTestId('card-override-open-dialog')).toBeEnabled({ timeout: 5_000 });

		// (3) 歯車を click して CardOverrideDialog を開く。
		await page.getByTestId('card-override-open-dialog').click();
		await page
			.getByTestId('card-override-image-select')
			.waitFor({ state: 'visible', timeout: 5_000 });

		// (4) OS file picker を mock。 `selectImage()` 内の `open()` が即時 updatedIcon を返す。
		const { mockTauriOpenDialog, unmockTauriOpenDialog } = await import(
			'../helpers/dialog-mock.js'
		);
		await mockTauriOpenDialog(page, updatedIcon);

		// (5) 「画像を選択」 button を click → selectImage() の実体 (cmd_save_icon_file →
		//     applyOptimisticUpdate → updateItem) が実 UI 経路で走る。
		await page.getByTestId('card-override-image-select').click();

		// (6) 画面遷移なしで一覧カードの <img src> が **新 path** に切替わることを verify。
		//     注意: `cmd_save_icon_file` (src-tauri/src/services/item_service.rs) は
		//     `<APPDATA>/icons/<uuid v7>.<ext>` を返すため、 saved path の filename は
		//     `updatedIcon` の source filename と一致しない。 「initial path を含まなくなった」
		//     を `not.toContain(initialTail)` で確認することで、 src が確実に切替った signal を
		//     captureする (これが消えれば ② 「modal 経由で画像変更 → grid 即時反映」 が回帰)。
		void updatedIcon; // ref 維持 (mock dialog で渡した path、 assert は initial 由来)
		await expect
			.poll(
				async () =>
					(await card
						.locator('img')
						.first()
						.getAttribute('src')
						.catch(() => '')) ?? '',
				{ timeout: 5_000, intervals: [100, 200, 400] },
			)
			.not.toContain(initialTail);

		await testInfo.attach('lb-2-after-icon-update.png', {
			body: await page.screenshot({ fullPage: false }),
			contentType: 'image/png',
		});
		await unmockTauriOpenDialog(page);
	} finally {
		await deleteItem(page, item.id).catch(() => {});
		cleanupLb2Icons(suffix);
	}
});

test('LB-4a: searchItemsInTag(includeDisabled=true) は hidden item を含む', async ({ page }) => {
	const visible = await createItem(page, {
		item_type: 'url',
		label: `PH-CF-600 LB-4a visible ${Date.now()}`,
		target: 'https://example.com/ph-cf-600-lb-4a-visible',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});
	const hidden = await createItem(page, {
		item_type: 'url',
		label: `PH-CF-600 LB-4a hidden ${Date.now()}`,
		target: 'https://example.com/ph-cf-600-lb-4a-hidden',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	try {
		// hidden 化 (is_enabled = false)。 URL item の sys-type-url は create 時に自動付与。
		await updateItem(page, hidden.id, { is_enabled: false });

		// include_disabled=true: 両方含まれる
		const both = await searchItemsInTag(page, 'sys-type-url', '', true);
		expect(both.find((i) => i.id === visible.id)).toBeTruthy();
		expect(both.find((i) => i.id === hidden.id)).toBeTruthy();
	} finally {
		await deleteItem(page, visible.id).catch(() => {});
		await deleteItem(page, hidden.id).catch(() => {});
	}
});

test('LB-4b: searchItemsInTag(includeDisabled=false) は hidden item を除外', async ({ page }) => {
	const visible = await createItem(page, {
		item_type: 'url',
		label: `PH-CF-600 LB-4b visible ${Date.now()}`,
		target: 'https://example.com/ph-cf-600-lb-4b-visible',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});
	const hidden = await createItem(page, {
		item_type: 'url',
		label: `PH-CF-600 LB-4b hidden ${Date.now()}`,
		target: 'https://example.com/ph-cf-600-lb-4b-hidden',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	try {
		await updateItem(page, hidden.id, { is_enabled: false });

		// include_disabled=false (default 挙動): hidden 除外
		const visibleOnly = await searchItemsInTag(page, 'sys-type-url', '', false);
		expect(visibleOnly.find((i) => i.id === visible.id)).toBeTruthy();
		expect(visibleOnly.find((i) => i.id === hidden.id)).toBeFalsy();

		// 省略時 (undefined) も backend default = false で hidden 除外
		const omitted = await searchItemsInTag(page, 'sys-type-url', '');
		expect(omitted.find((i) => i.id === hidden.id)).toBeFalsy();
	} finally {
		await deleteItem(page, visible.id).catch(() => {});
		await deleteItem(page, hidden.id).catch(() => {});
	}
});

test('LB-4c: favorites 用 searchItemsInTag(sys-starred, default) は hidden を漏らさない', async ({
	page,
}) => {
	// 「hidden starred」 (= 隠しているがお気に入りに入った item) が favorites widget の
	// fetch 経路 (default include_disabled = false) で漏れないこと。 PH-CF-600 C4 の
	// Codex クロスチェックで指摘された不変条件。
	const item = await createItem(page, {
		item_type: 'url',
		label: `PH-CF-600 LB-4c hidden-starred ${Date.now()}`,
		target: 'https://example.com/ph-cf-600-lb-4c',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	try {
		await toggleStar(page, item.id, true);
		await updateItem(page, item.id, { is_enabled: false });

		// favorites widget が呼ぶ default パターン (= false 省略)。 hidden は漏らさない。
		const starredDefault = await searchItemsInTag(page, 'sys-starred', '');
		expect(starredDefault.find((i) => i.id === item.id)).toBeFalsy();

		// Library 画面が「非表示を表示」 ON 時に呼ぶ true 経路では hidden starred も含まれる
		// (Library grid 上で hidden starred カードに ★ badge を一致させるため)。
		const starredWithHidden = await searchItemsInTag(page, 'sys-starred', '', true);
		expect(starredWithHidden.find((i) => i.id === item.id)).toBeTruthy();
	} finally {
		await deleteItem(page, item.id).catch(() => {});
	}
});

test('LB-7: detail panel は検索バー / sort クリックで閉じない、 余白クリックで閉じる', async ({
	page,
}, testInfo) => {
	const item = await createItem(page, {
		item_type: 'url',
		label: `PH-CF-600 LB-7 ${Date.now()}`,
		target: 'https://example.com/ph-cf-600-lb-7',
		aliases: [],
		tag_ids: [],
		is_tracked: false,
	});

	try {
		await openLibrary(page);

		const card = page.getByTestId(`library-card-${item.id}`);
		await card.waitFor({ state: 'attached', timeout: 15_000 });

		// card click で detail panel を開く (= LibraryLayout の selectedItemId が set)。
		await card.scrollIntoViewIfNeeded();
		await card.click();

		// 検収観点: detail panel wrapper が DOM に存在する。
		// LibraryLayout は `{#if selectedItemId}` で wrapper を出し入れするため、
		// wrapper の **存在 (attached)** が「panel が開いている」 の正規シグナル。
		// 注: wrapper は `lg:block` で lg breakpoint 未満は display:none だが、 panel
		// open/close 状態は wrapper の attached 有無で判定する (Tauri window が
		// 800x600 default で CI の lg 未満ケースに対応)。 panel の中身が item の label
		// を含んでいることで「選択 item が反映されている」 ことを併せて verify。
		const detailWrapper = page.getByTestId('library-detail-wrapper');
		await expect(detailWrapper).toBeAttached({ timeout: 5_000 });
		const detailPanel = page.getByTestId('library-detail-panel');
		await expect(detailPanel).toContainText(item.label, { timeout: 5_000 });

		// LB-7a: 検索バーを click。 panel は閉じない (wrapper は DOM に残る)。
		const searchInput = page.getByTestId('library-search-input');
		await searchInput.click();
		await expect(detailWrapper).toBeAttached();

		// LB-7b: sort select を click。 panel は閉じない。
		const sortControl = page.getByTestId('library-sort-field');
		if (await sortControl.count()) {
			await sortControl.click();
			await expect(detailWrapper).toBeAttached();
			// select を閉じる (Escape で blur)。
			await page.keyboard.press('Escape');
		}

		await testInfo.attach('lb-7-detail-after-controls.png', {
			body: await page.screenshot({ fullPage: false }),
			contentType: 'image/png',
		});

		// LB-7c: 余白 (library-blank-area の padding 領域) を click → panel が閉じる
		// (= selectedItemId = null → wrapper が DOM から removed)。
		// 余白は左上の安全マージン (5px) を狙う。 card や sticky bar の上には乗らない位置。
		const blank = page.getByTestId('library-blank-area');
		await blank.click({ position: { x: 5, y: 5 } });
		await expect(detailWrapper).not.toBeAttached({ timeout: 5_000 });
	} finally {
		await deleteItem(page, item.id).catch(() => {});
	}
});
