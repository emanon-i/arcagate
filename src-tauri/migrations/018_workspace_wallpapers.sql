-- Migration 018: Workspace per-workspace 背景壁紙 + Library 共通設定 (PH-499)
--
-- 各 Workspace に背景壁紙 (path / opacity / blur) を設定可能にする。
-- 未設定の Workspace は library_wallpaper_* (config 経由) を継承する。
-- 画像本体は %LOCALAPPDATA%/Arcagate/wallpapers/<uuid>.<ext> に保存、DB は path のみ保持。

ALTER TABLE workspaces ADD COLUMN wallpaper_path TEXT;
ALTER TABLE workspaces ADD COLUMN wallpaper_opacity REAL NOT NULL DEFAULT 1.0;
ALTER TABLE workspaces ADD COLUMN wallpaper_blur INTEGER NOT NULL DEFAULT 0;

-- Library / global default wallpaper (config table 経由、widget も継承)
INSERT OR IGNORE INTO config (key, value) VALUES ('library_wallpaper_path', '');
INSERT OR IGNORE INTO config (key, value) VALUES ('library_wallpaper_opacity', '0.7');
INSERT OR IGNORE INTO config (key, value) VALUES ('library_wallpaper_blur', '12');
