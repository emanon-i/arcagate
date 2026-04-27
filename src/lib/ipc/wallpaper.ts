// PH-499 batch-109: Wallpaper IPC wrapper.
//
// 設定値 (path / opacity / blur) は config table 経由 (cmd_get_config / cmd_set_config)。
// 画像ファイル本体は wallpaper_service が <app_data_dir>/wallpapers/ にコピーする。

import { invoke } from '@tauri-apps/api/core';

/** ファイル選択時に Rust 側で `<app_data_dir>/wallpapers/<uuid>.<ext>` にコピーする。 */
export async function saveWallpaperFile(srcPath: string): Promise<string> {
	return invoke<string>('cmd_save_wallpaper_file', { srcPath });
}

/** 既存の壁紙ファイルを削除する (wallpapers/ 配下のみ許可)。 */
export async function deleteWallpaperFile(storedPath: string): Promise<void> {
	return invoke<void>('cmd_delete_wallpaper_file', { storedPath });
}
