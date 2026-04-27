// PH-499: Workspace 背景壁紙 service
// 役割: ユーザ選択画像を `<app_data_dir>/wallpapers/<uuid>.<ext>` にコピーして
// stable な path を返す。DB には stored path のみ保存する。

use crate::utils::error::AppError;
use std::path::{Path, PathBuf};
use uuid::Uuid;

const WALLPAPERS_DIR: &str = "wallpapers";
const ALLOWED_EXTS: &[&str] = &["png", "jpg", "jpeg", "webp"];

/// 入力画像 path の拡張子を validate して lower-case で返す
fn validate_extension(src: &Path) -> Result<String, AppError> {
    let ext = src
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase())
        .ok_or_else(|| AppError::InvalidInput("wallpaper file has no extension".to_string()))?;
    if !ALLOWED_EXTS.contains(&ext.as_str()) {
        return Err(AppError::InvalidInput(format!(
            "unsupported wallpaper extension: .{} (allowed: {})",
            ext,
            ALLOWED_EXTS.join(", ")
        )));
    }
    Ok(ext)
}

/// ユーザ選択画像を app_data_dir/wallpapers/<uuid>.<ext> にコピー
/// 戻り値は保存後の絶対 path (DB / 表示用)
pub fn save_wallpaper(app_data_dir: &Path, src_path: &str) -> Result<String, AppError> {
    let src = Path::new(src_path);
    if !src.is_file() {
        return Err(AppError::InvalidInput(format!(
            "wallpaper source not found: {src_path}"
        )));
    }
    let ext = validate_extension(src)?;
    let wallpapers_dir = app_data_dir.join(WALLPAPERS_DIR);
    std::fs::create_dir_all(&wallpapers_dir)?;
    let dest_name = format!("{}.{}", Uuid::now_v7(), ext);
    let dest_path = wallpapers_dir.join(&dest_name);
    std::fs::copy(src, &dest_path)?;
    Ok(dest_path.to_string_lossy().into_owned())
}

/// 保存済 wallpaper を物理削除 (best effort、見つからない場合 warn のみ)
pub fn try_delete_stored_wallpaper(stored_path: &str) -> Result<(), AppError> {
    let p = PathBuf::from(stored_path);
    if !p.is_file() {
        return Ok(());
    }
    // 安全策: app_data_dir/wallpapers/ 配下のファイルだけ削除許可するため
    // ファイル名に `wallpapers` segment が含まれていることを確認
    if !p.components().any(
        |c| matches!(c, std::path::Component::Normal(n) if n.eq_ignore_ascii_case(WALLPAPERS_DIR)),
    ) {
        return Err(AppError::InvalidInput(
            "stored wallpaper path is outside wallpapers/ — refusing to delete".to_string(),
        ));
    }
    std::fs::remove_file(p)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn mk_test_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("arcagate-wallpaper-{name}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write_image(parent: &Path, ext: &str) -> PathBuf {
        let p = parent.join(format!("source.{ext}"));
        let mut f = std::fs::File::create(&p).unwrap();
        f.write_all(&[0u8; 16]).unwrap();
        p
    }

    #[test]
    fn test_validate_extension_png() {
        let dir = mk_test_dir("validate-png");
        let p = write_image(&dir, "png");
        assert_eq!(validate_extension(&p).unwrap(), "png");
    }

    #[test]
    fn test_validate_extension_jpeg_lowercased() {
        let dir = mk_test_dir("validate-jpeg");
        let p = write_image(&dir, "JPEG");
        assert_eq!(validate_extension(&p).unwrap(), "jpeg");
    }

    #[test]
    fn test_validate_extension_unsupported() {
        let dir = mk_test_dir("validate-bmp");
        let p = write_image(&dir, "bmp");
        assert!(validate_extension(&p).is_err());
    }

    #[test]
    fn test_save_wallpaper_roundtrip() {
        let app_dir = mk_test_dir("save-roundtrip");
        let src_dir = mk_test_dir("save-roundtrip-src");
        let src = write_image(&src_dir, "png");
        let stored = save_wallpaper(&app_dir, src.to_str().unwrap()).unwrap();
        let stored_p = PathBuf::from(&stored);
        assert!(stored_p.is_file());
        assert!(stored.ends_with(".png"));
        assert!(stored.contains("wallpapers"));
    }

    #[test]
    fn test_save_wallpaper_missing_source() {
        let app_dir = mk_test_dir("save-missing");
        let result = save_wallpaper(&app_dir, "Z:/__nonexistent_wp__.png");
        assert!(result.is_err());
    }

    #[test]
    fn test_try_delete_stored_wallpaper_inside_wallpapers_dir() {
        let app_dir = mk_test_dir("delete-inside");
        let src_dir = mk_test_dir("delete-inside-src");
        let src = write_image(&src_dir, "png");
        let stored = save_wallpaper(&app_dir, src.to_str().unwrap()).unwrap();
        try_delete_stored_wallpaper(&stored).unwrap();
        assert!(!PathBuf::from(stored).is_file());
    }

    #[test]
    fn test_try_delete_refuses_outside_path() {
        let src_dir = mk_test_dir("delete-outside");
        let src = write_image(&src_dir, "png");
        let result = try_delete_stored_wallpaper(src.to_str().unwrap());
        assert!(result.is_err());
    }

    #[test]
    fn test_try_delete_missing_path_is_ok() {
        let app_dir = mk_test_dir("delete-missing");
        let fake = app_dir.join("wallpapers").join("missing.png");
        let result = try_delete_stored_wallpaper(fake.to_str().unwrap());
        assert!(result.is_ok());
    }
}
