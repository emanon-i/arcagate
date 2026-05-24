/// PH-issue-009: Workspace 壁紙画像のローカル保存 + per-workspace 設定の永続化。
///
/// 引用元 guideline:
/// - docs/l1_requirements/design_system_architecture.md §4-3 壁紙設定の要件
/// - docs/l0_ideas/arcagate-engineering-principles.md §3 (静かに失敗しない、I/O は明示エラー)
/// - docs/desktop_ui_ux_agent_rules.md P11 (装飾は対象を邪魔しない)
///
/// 仕様:
/// - 画像形式: png / jpg / jpeg / webp (extension で validation)
/// - 保存先: `<app_data_dir>/wallpapers/<uuid>.<ext>`
/// - workspace.wallpaper_path には保存後の絶対パスを格納
/// - asset protocol (`convertFileSrc`) で WebView2 から読込
use std::fs;
use std::path::{Path, PathBuf};

use uuid::Uuid;

use crate::db::DbState;
use crate::models::config;
use crate::models::workspace::{
    LibraryWallpaper, UpdateLibraryWallpaperInput, UpdateWorkspaceWallpaperInput, Workspace,
};
use crate::repositories::{config_repository, workspace_repository};
use crate::utils::error::AppError;

const ALLOWED_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp"];
const MAX_OPACITY: f64 = 1.0;
const MIN_OPACITY: f64 = 0.0;
const MAX_BLUR: i64 = 40;
const MIN_BLUR: i64 = 0;

/// 拡張子を抽出 (lowercase) し、許可リストにあるかを確認。
fn validate_extension(source: &Path) -> Result<String, AppError> {
    let ext = source
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .ok_or_else(|| AppError::InvalidInput("wallpaper file has no extension".into()))?;
    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return Err(AppError::InvalidInput(format!(
            "unsupported wallpaper format: {}. allowed: {}",
            ext,
            ALLOWED_EXTENSIONS.join(", ")
        )));
    }
    Ok(ext)
}

/// 画像ファイルを `<app_data_dir>/wallpapers/<uuid>.<ext>` にコピーし、保存先パスを返す。
pub fn save_wallpaper_file(app_data_dir: &Path, source_path: &str) -> Result<String, AppError> {
    let source = Path::new(source_path);
    if !source.exists() {
        return Err(AppError::InvalidInput(format!(
            "wallpaper source not found: {}",
            source_path
        )));
    }
    let ext = validate_extension(source)?;
    let wallpapers_dir: PathBuf = app_data_dir.join("wallpapers");
    fs::create_dir_all(&wallpapers_dir)?;
    let dest_name = format!("{}.{}", Uuid::now_v7(), ext);
    let dest_path = wallpapers_dir.join(&dest_name);
    fs::copy(source, &dest_path)?;
    // audit batch (2026-05-13) #4: Windows backslash path での asset:// protocol
    // load 失敗対策で forward slash に正規化。 image-scrap と同 pattern。
    Ok(dest_path
        .to_str()
        .ok_or_else(|| AppError::InvalidInput("non-utf8 wallpaper path".into()))?
        .replace('\\', "/"))
}

/// PH-issue-009: Workspace の壁紙設定を更新 (path / opacity / blur)。
///
/// `path = None` で壁紙クリア、それ以外は path 文字列をそのまま保存 (前段の
/// `save_wallpaper_file` で copy 済の絶対パスを呼び出し側が渡す想定)。
pub fn set_workspace_wallpaper(
    db: &DbState,
    input: UpdateWorkspaceWallpaperInput,
) -> Result<Workspace, AppError> {
    let opacity = input.opacity.clamp(MIN_OPACITY, MAX_OPACITY);
    let blur = input.blur.clamp(MIN_BLUR, MAX_BLUR);
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    workspace_repository::update_workspace_wallpaper(
        &conn,
        &input.workspace_id,
        input.path.as_deref(),
        opacity,
        blur,
    )
}

/// PH-CF-700 C8: ライブラリ画面の壁紙設定 (グローバル単一値) を取得する。
///
/// 格納先は config table の `library_wallpaper_path` / `_opacity` / `_blur`。
/// path 未設定 (NULL or 空文字) は `None`、 opacity / blur は parse 失敗 / 範囲外を
/// default + clamp で正規化 (config 破損時の defensive、 hotkey の T4 と同方針)。
pub fn get_library_wallpaper(db: &DbState) -> Result<LibraryWallpaper, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let path = config_repository::get(&conn, config::KEY_LIBRARY_WALLPAPER_PATH)?
        .filter(|s| !s.is_empty());
    let opacity = config_repository::get(&conn, config::KEY_LIBRARY_WALLPAPER_OPACITY)?
        .as_deref()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(config::DEFAULT_LIBRARY_WALLPAPER_OPACITY)
        .clamp(MIN_OPACITY, MAX_OPACITY);
    let blur = config_repository::get(&conn, config::KEY_LIBRARY_WALLPAPER_BLUR)?
        .as_deref()
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(config::DEFAULT_LIBRARY_WALLPAPER_BLUR)
        .clamp(MIN_BLUR, MAX_BLUR);
    Ok(LibraryWallpaper {
        path,
        opacity,
        blur,
    })
}

/// PH-CF-700 C8: ライブラリ画面の壁紙設定 (グローバル単一値) を更新する。
///
/// `path = None` で壁紙クリア (空文字を保存して `get_library_wallpaper` で `None` に正規化)、
/// それ以外は path 文字列をそのまま保存 (前段の `save_wallpaper_file` で copy 済の絶対
/// パスを呼び出し側が渡す想定)。 opacity / blur は範囲 clamp 後の値を保存。
///
/// `workspaces` 行の wallpaper_* と挙動を揃えるため、 戻り値は **clamp 済の正規化済**
/// `LibraryWallpaper` (frontend は `setLibraryWallpaper` レスポンスを store に書き戻す)。
pub fn set_library_wallpaper(
    db: &DbState,
    input: UpdateLibraryWallpaperInput,
) -> Result<LibraryWallpaper, AppError> {
    let opacity = input.opacity.clamp(MIN_OPACITY, MAX_OPACITY);
    let blur = input.blur.clamp(MIN_BLUR, MAX_BLUR);
    let path_value: String = input.path.clone().unwrap_or_default();
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    config_repository::set(&conn, config::KEY_LIBRARY_WALLPAPER_PATH, &path_value)?;
    config_repository::set(
        &conn,
        config::KEY_LIBRARY_WALLPAPER_OPACITY,
        &opacity.to_string(),
    )?;
    config_repository::set(&conn, config::KEY_LIBRARY_WALLPAPER_BLUR, &blur.to_string())?;
    Ok(LibraryWallpaper {
        path: input.path.filter(|s| !s.is_empty()),
        opacity,
        blur,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_extension_accepts_png() {
        let path = Path::new("foo.png");
        assert_eq!(validate_extension(path).unwrap(), "png");
    }

    #[test]
    fn test_validate_extension_accepts_jpg_uppercase() {
        let path = Path::new("FOO.JPG");
        assert_eq!(validate_extension(path).unwrap(), "jpg");
    }

    #[test]
    fn test_validate_extension_accepts_webp() {
        let path = Path::new("foo.webp");
        assert_eq!(validate_extension(path).unwrap(), "webp");
    }

    #[test]
    fn test_validate_extension_rejects_gif() {
        let path = Path::new("foo.gif");
        assert!(validate_extension(path).is_err());
    }

    #[test]
    fn test_validate_extension_rejects_no_ext() {
        let path = Path::new("foo");
        assert!(validate_extension(path).is_err());
    }

    #[test]
    fn test_save_wallpaper_file_rejects_missing_source() {
        // 存在しない source path は早期 error。app_data_dir は temp dir でも実 dir でもない
        // (validate_extension の前段で source 存在 check に失敗)。
        let result = save_wallpaper_file(
            Path::new("X:/no-such-app-data-dir"),
            "C:/nonexistent/foo.png",
        );
        assert!(result.is_err());
    }

    // --- PH-CF-700 C8: Library wallpaper (グローバル設定) の clamp / IO test ---

    #[test]
    fn test_get_library_wallpaper_defaults_to_seed() {
        let db = crate::db::initialize_in_memory();
        let wp = get_library_wallpaper(&db).unwrap();
        // migration 040 で seed された default (opacity 0.6 / blur 0、 path は未設定 = None)。
        assert_eq!(wp.path, None);
        assert!((wp.opacity - 0.6).abs() < 1e-9);
        assert_eq!(wp.blur, 0);
    }

    #[test]
    fn test_set_library_wallpaper_clamps_opacity_and_blur() {
        let db = crate::db::initialize_in_memory();
        let updated = set_library_wallpaper(
            &db,
            UpdateLibraryWallpaperInput {
                path: Some("/tmp/wp.png".to_string()),
                opacity: 5.0, // 上限超え → 1.0 に clamp
                blur: 999,    // 上限超え → 40 に clamp
            },
        )
        .unwrap();
        assert!((updated.opacity - 1.0).abs() < 1e-9);
        assert_eq!(updated.blur, 40);
        // 再取得しても clamp 済の値で帰ること (設定がレイテンシ無しに consistent)。
        let reread = get_library_wallpaper(&db).unwrap();
        assert!((reread.opacity - 1.0).abs() < 1e-9);
        assert_eq!(reread.blur, 40);
        assert_eq!(reread.path.as_deref(), Some("/tmp/wp.png"));
    }

    #[test]
    fn test_set_library_wallpaper_clamps_negative() {
        let db = crate::db::initialize_in_memory();
        let updated = set_library_wallpaper(
            &db,
            UpdateLibraryWallpaperInput {
                path: None,
                opacity: -0.5, // 下限未満 → 0.0
                blur: -10,     // 下限未満 → 0
            },
        )
        .unwrap();
        assert!((updated.opacity - 0.0).abs() < 1e-9);
        assert_eq!(updated.blur, 0);
        assert_eq!(updated.path, None);
    }

    #[test]
    fn test_set_library_wallpaper_path_none_clears() {
        let db = crate::db::initialize_in_memory();
        // 1) set path
        set_library_wallpaper(
            &db,
            UpdateLibraryWallpaperInput {
                path: Some("/tmp/wp.png".to_string()),
                opacity: 0.8,
                blur: 10,
            },
        )
        .unwrap();
        assert_eq!(
            get_library_wallpaper(&db).unwrap().path.as_deref(),
            Some("/tmp/wp.png")
        );
        // 2) clear with path=None
        set_library_wallpaper(
            &db,
            UpdateLibraryWallpaperInput {
                path: None,
                opacity: 0.8,
                blur: 10,
            },
        )
        .unwrap();
        assert_eq!(get_library_wallpaper(&db).unwrap().path, None);
    }
}
