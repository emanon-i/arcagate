-- PH-499: Workspace 別 + Library 共通 背景壁紙
-- workspaces table に wallpaper_path / opacity / blur 列を追加
-- Library 共通 default は config table に格納:
--   library_wallpaper_path / library_wallpaper_opacity / library_wallpaper_blur

ALTER TABLE workspaces ADD COLUMN wallpaper_path TEXT;
ALTER TABLE workspaces ADD COLUMN wallpaper_opacity REAL NOT NULL DEFAULT 0.7;
ALTER TABLE workspaces ADD COLUMN wallpaper_blur INTEGER NOT NULL DEFAULT 0;
