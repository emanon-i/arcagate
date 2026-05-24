// Config key constants and defaults

pub const KEY_HOTKEY: &str = "hotkey";
pub const KEY_AUTOSTART: &str = "autostart";
pub const KEY_SETUP_COMPLETE: &str = "setup_complete";
pub const KEY_ONBOARDING_COMPLETE: &str = "onboarding_complete";
pub const KEY_THEME_MODE: &str = "theme_mode";

// PH-CF-700 C8: Library 画面の壁紙はグローバル単一値のため config table に格納する
// (workspaces 行の wallpaper_* は per-workspace、 ライブラリは「複数インスタンス」 概念無し)。
pub const KEY_LIBRARY_WALLPAPER_PATH: &str = "library_wallpaper_path";
pub const KEY_LIBRARY_WALLPAPER_OPACITY: &str = "library_wallpaper_opacity";
pub const KEY_LIBRARY_WALLPAPER_BLUR: &str = "library_wallpaper_blur";

pub const DEFAULT_HOTKEY: &str = "Ctrl+Shift+Space";
// #7: builtin テーマは Dark / Light の 2 本のみ。初回起動は Dark。
pub const DEFAULT_THEME_MODE: &str = "dark";
// PH-CF-700 C8: Library 壁紙の default (workspace 壁紙 PH-issue-009 と整合)。
pub const DEFAULT_LIBRARY_WALLPAPER_OPACITY: f64 = 0.6;
pub const DEFAULT_LIBRARY_WALLPAPER_BLUR: i64 = 0;
