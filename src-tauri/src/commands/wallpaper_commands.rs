// PH-499: Workspace 別 + Library 共通 背景壁紙 IPC commands
use tauri::{AppHandle, Manager, State};

use crate::db::DbState;
use crate::models::config;
use crate::models::workspace::{WallpaperSettings, Workspace};
use crate::services::{config_service, wallpaper_service, workspace_service};
use crate::utils::error::AppError;

const KEY_LIBRARY_WALLPAPER_PATH: &str = "library_wallpaper_path";
const KEY_LIBRARY_WALLPAPER_OPACITY: &str = "library_wallpaper_opacity";
const KEY_LIBRARY_WALLPAPER_BLUR: &str = "library_wallpaper_blur";

fn parse_f64(s: &str, fallback: f64) -> f64 {
    s.parse().unwrap_or(fallback)
}

fn parse_i64(s: &str, fallback: i64) -> i64 {
    s.parse().unwrap_or(fallback)
}

/// app_data_dir を取得 (PH-499: wallpaper コピー先確定用)
fn app_data_path(app: &AppHandle) -> Result<std::path::PathBuf, AppError> {
    app.path()
        .app_data_dir()
        .map_err(|e| AppError::InvalidInput(format!("app_data_dir lookup failed: {e}")))
}

/// PH-499: ユーザ選択画像を保存し、その絶対 path を返す。
/// 戻り値は 「stored absolute path」、フロント側はこれをそのまま
/// `cmd_set_workspace_wallpaper` / `cmd_set_library_wallpaper` に渡す。
#[tauri::command]
pub fn cmd_save_wallpaper(app: AppHandle, src_path: String) -> Result<String, AppError> {
    let app_dir = app_data_path(&app)?;
    wallpaper_service::save_wallpaper(&app_dir, &src_path)
}

/// PH-499: Workspace 別の壁紙設定 (path = None で「未設定 = global default 継承」)
#[tauri::command]
pub fn cmd_set_workspace_wallpaper(
    db: State<DbState>,
    workspace_id: String,
    path: Option<String>,
    opacity: f64,
    blur: i64,
) -> Result<Workspace, AppError> {
    workspace_service::set_workspace_wallpaper(
        &db,
        &workspace_id,
        WallpaperSettings {
            path,
            opacity,
            blur,
        },
    )
}

/// PH-499: Workspace 壁紙クリア (None 設定の便宜上の専用 IPC)
#[tauri::command]
pub fn cmd_clear_workspace_wallpaper(
    db: State<DbState>,
    workspace_id: String,
) -> Result<Workspace, AppError> {
    workspace_service::set_workspace_wallpaper(
        &db,
        &workspace_id,
        WallpaperSettings {
            path: None,
            opacity: 0.7,
            blur: 0,
        },
    )
}

/// PH-499: Library 共通 default 壁紙設定 (config table に格納)
#[tauri::command]
pub fn cmd_set_library_wallpaper(
    db: State<DbState>,
    path: Option<String>,
    opacity: f64,
    blur: i64,
) -> Result<(), AppError> {
    let opacity = opacity.clamp(0.0, 1.0);
    let blur = blur.clamp(0, 40);
    if let Some(p) = path.as_deref() {
        config_service::set_config(&db, KEY_LIBRARY_WALLPAPER_PATH, p)?;
    } else {
        config_service::set_config(&db, KEY_LIBRARY_WALLPAPER_PATH, "")?;
    }
    config_service::set_config(&db, KEY_LIBRARY_WALLPAPER_OPACITY, &opacity.to_string())?;
    config_service::set_config(&db, KEY_LIBRARY_WALLPAPER_BLUR, &blur.to_string())?;
    Ok(())
}

/// PH-499: Library 共通 default 壁紙取得
#[tauri::command]
pub fn cmd_get_library_wallpaper(db: State<DbState>) -> Result<WallpaperSettings, AppError> {
    let path =
        config_service::get_config(&db, KEY_LIBRARY_WALLPAPER_PATH)?.filter(|s| !s.is_empty());
    let opacity = config_service::get_config(&db, KEY_LIBRARY_WALLPAPER_OPACITY)?
        .map(|s| parse_f64(&s, 0.7))
        .unwrap_or(0.7);
    let blur = config_service::get_config(&db, KEY_LIBRARY_WALLPAPER_BLUR)?
        .map(|s| parse_i64(&s, 0))
        .unwrap_or(0);
    Ok(WallpaperSettings {
        path,
        opacity,
        blur,
    })
}

// `config` import の dead-code 警告抑制 (KEY 定数が `models::config` を参照する future use を見越した形)
#[allow(dead_code)]
fn _ensure_config_models_imported() {
    let _ = config::KEY_HOTKEY;
}
