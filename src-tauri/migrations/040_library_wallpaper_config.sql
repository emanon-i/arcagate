-- PH-CF-700 C8: ライブラリ画面の背景壁紙 (グローバル設定)。
--
-- workspace 壁紙は per-workspace (workspaces 行の wallpaper_* 列、 migration 018) だが、
-- ライブラリ画面は「複数インスタンス」 概念が無い単一画面のため、 KV 形式の config table に
-- グローバル key として格納する (`save_wallpaper_file` は workspace 非依存で流用)。
--
-- 追加 key:
--   library_wallpaper_path     TEXT (NULL 相当 = 壁紙未設定)
--   library_wallpaper_opacity  REAL string "0.0"-"1.0", default "0.6"
--   library_wallpaper_blur     INT  string "0"-"40",    default "0"
--
-- 描画は LibraryLayout の z-0 layer (WorkspaceGrid と同型 background-image + opacity + blur)。
-- 値の clamp (opacity 0-1 / blur 0-40) は wallpaper_service::set_library_wallpaper で実施。
-- 本 migration は default の opacity / blur を INSERT OR IGNORE で seed する (path は未設定で
-- 空のままにし、 service 側の `get_or_default` で「未設定 = 壁紙なし」 を表す)。

INSERT OR IGNORE INTO config (key, value, updated_at)
VALUES ('library_wallpaper_opacity', '0.6', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));

INSERT OR IGNORE INTO config (key, value, updated_at)
VALUES ('library_wallpaper_blur', '0', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
