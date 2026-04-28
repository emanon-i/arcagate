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
use crate::models::workspace::{UpdateWorkspaceWallpaperInput, Workspace};
use crate::repositories::workspace_repository;
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
    Ok(dest_path
        .to_str()
        .ok_or_else(|| AppError::InvalidInput("non-utf8 wallpaper path".into()))?
        .to_string())
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
}
