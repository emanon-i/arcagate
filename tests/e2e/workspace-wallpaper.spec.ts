/**
 * PH-499: Workspace 背景壁紙 (Library default + per-workspace override)
 *
 * IPC レイヤーで wallpaper の DB column / config 駆動が正しく往復することを確認。
 * UI 側 (Tauri file dialog 経由) は CDP で開けないため、本テストでは IPC 経路のみ assert。
 */
import { expect, test } from '../fixtures/tauri.js';
import { waitForAppReady } from '../helpers/app-ready.js';
import { createWorkspace, deleteWorkspace, invoke, type Workspace } from '../helpers/ipc.js';

interface WallpaperSettings {
	path: string | null;
	opacity: number;
	blur: number;
}

test.describe('PH-499 workspace wallpaper IPC', () => {
	test('Library default + per-workspace override が round-trip する', async ({ page }) => {
		const ws = await createWorkspace(page, 'PH-499 wallpaper E2E WS');
		try {
			await page.reload();
			await page.waitForLoadState('domcontentloaded');
			await waitForAppReady(page);

			// 初期 Library default は path=null / opacity=0.7 / blur=0
			const defaults = await invoke<WallpaperSettings>(page, 'cmd_get_library_wallpaper');
			expect(defaults.path).toBeNull();
			expect(defaults.opacity).toBeCloseTo(0.7, 2);
			expect(defaults.blur).toBe(0);

			// Library default を更新 (path は仮想 path、wallpaper_service.save_wallpaper は通さず IPC 直叩き)
			await invoke<void>(page, 'cmd_set_library_wallpaper', {
				path: 'C:/fake/wallpapers/lib.png',
				opacity: 0.45,
				blur: 12,
			});
			const libUpdated = await invoke<WallpaperSettings>(page, 'cmd_get_library_wallpaper');
			expect(libUpdated.path).toBe('C:/fake/wallpapers/lib.png');
			expect(libUpdated.opacity).toBeCloseTo(0.45, 2);
			expect(libUpdated.blur).toBe(12);

			// Workspace 個別 override
			const overridden = await invoke<Workspace>(page, 'cmd_set_workspace_wallpaper', {
				workspaceId: ws.id,
				path: 'C:/fake/wallpapers/ws.png',
				opacity: 0.85,
				blur: 4,
			});
			expect(overridden.wallpaper_path).toBe('C:/fake/wallpapers/ws.png');
			expect(overridden.wallpaper_opacity).toBeCloseTo(0.85, 2);
			expect(overridden.wallpaper_blur).toBe(4);

			// Workspace の壁紙を clear (Library default に戻る)
			const cleared = await invoke<Workspace>(page, 'cmd_clear_workspace_wallpaper', {
				workspaceId: ws.id,
			});
			expect(cleared.wallpaper_path).toBeNull();

			// Library default を null に戻す
			await invoke<void>(page, 'cmd_set_library_wallpaper', {
				path: null,
				opacity: 0.7,
				blur: 0,
			});
			const libBack = await invoke<WallpaperSettings>(page, 'cmd_get_library_wallpaper');
			expect(libBack.path).toBeNull();
		} finally {
			await deleteWorkspace(page, ws.id);
		}
	});
});
