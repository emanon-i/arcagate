// PH-499 batch-109: Wallpaper image storage service.
//
// Library / Workspace 用の壁紙画像を `<app_data_dir>/wallpapers/<uuid>.<ext>`
// にコピーして保存する。DB には絶対パス文字列のみを格納し、画像本体はファイルシステム上で管理。
//
// 削除時の安全策: `wallpapers/` 配下以外の path は削除拒否する。

use std::fs;
use std::path::Path;

use uuid::Uuid;

use crate::utils::error::AppError;

const ALLOWED_EXTS: [&str; 4] = ["png", "jpg", "jpeg", "webp"];

/// 壁紙画像を `<app_data_dir>/wallpapers/<uuid>.<ext>` にコピーし、保存先の絶対パスを返す。
///
/// 拡張子は png/jpg/jpeg/webp に限定（Tauri webview の asset protocol で確実に表示できるもの）。
pub fn save_wallpaper_file(app_data_dir: &Path, src_path: &str) -> Result<String, AppError> {
    let src = Path::new(src_path);
    if !src.exists() || !src.is_file() {
        return Err(AppError::NotFound(format!("wallpaper source: {src_path}")));
    }

    let ext = src
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_default();
    if !ALLOWED_EXTS.contains(&ext.as_str()) {
        return Err(AppError::InvalidInput(format!(
            "unsupported wallpaper format: '.{ext}' (allowed: png, jpg, jpeg, webp)"
        )));
    }

    let wallpapers_dir = app_data_dir.join("wallpapers");
    fs::create_dir_all(&wallpapers_dir)?;

    let id = Uuid::now_v7().to_string();
    let dest = wallpapers_dir.join(format!("{id}.{ext}"));
    fs::copy(src, &dest)?;

    Ok(dest.to_string_lossy().to_string())
}

/// 保存済み壁紙ファイルを削除する。安全のため `wallpapers/` 配下のみ許可。
pub fn delete_wallpaper_file(stored_path: &str) -> Result<(), AppError> {
    let p = Path::new(stored_path);
    let parent_name = p
        .parent()
        .and_then(Path::file_name)
        .and_then(|n| n.to_str());
    if parent_name != Some("wallpapers") {
        return Err(AppError::InvalidInput(format!(
            "refused to delete wallpaper outside wallpapers/: {stored_path}"
        )));
    }
    if p.exists() {
        fs::remove_file(p)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn make_image(dir: &Path, name: &str) -> String {
        let p = dir.join(name);
        let mut f = fs::File::create(&p).unwrap();
        f.write_all(b"fake-png-data").unwrap();
        p.to_string_lossy().to_string()
    }

    #[test]
    fn test_save_wallpaper_copies_with_uuid_name() {
        let tmp = tempfile::tempdir().unwrap();
        let src = make_image(tmp.path(), "src.png");
        let stored = save_wallpaper_file(tmp.path(), &src).unwrap();
        assert!(stored.contains("wallpapers"));
        assert!(stored.ends_with(".png"));
        assert!(Path::new(&stored).exists());
    }

    #[test]
    fn test_save_wallpaper_rejects_unsupported_ext() {
        let tmp = tempfile::tempdir().unwrap();
        let src = make_image(tmp.path(), "src.bmp");
        let result = save_wallpaper_file(tmp.path(), &src);
        assert!(result.is_err());
    }

    #[test]
    fn test_save_wallpaper_rejects_missing_source() {
        let tmp = tempfile::tempdir().unwrap();
        let result = save_wallpaper_file(tmp.path(), "C:/__nonexistent_wallpaper__.png");
        assert!(result.is_err());
    }

    #[test]
    fn test_delete_wallpaper_inside_wallpapers_dir() {
        let tmp = tempfile::tempdir().unwrap();
        let src = make_image(tmp.path(), "src.jpg");
        let stored = save_wallpaper_file(tmp.path(), &src).unwrap();
        assert!(Path::new(&stored).exists());
        delete_wallpaper_file(&stored).unwrap();
        assert!(!Path::new(&stored).exists());
    }

    #[test]
    fn test_delete_wallpaper_refuses_outside_wallpapers_dir() {
        let tmp = tempfile::tempdir().unwrap();
        let outside = make_image(tmp.path(), "outside.png");
        let result = delete_wallpaper_file(&outside);
        assert!(result.is_err());
        assert!(Path::new(&outside).exists()); // not deleted
    }

    #[test]
    fn test_delete_wallpaper_silent_when_already_gone() {
        let tmp = tempfile::tempdir().unwrap();
        let wallpapers = tmp.path().join("wallpapers");
        fs::create_dir_all(&wallpapers).unwrap();
        let phantom = wallpapers.join("ghost.png");
        // not created — verify silent OK
        delete_wallpaper_file(&phantom.to_string_lossy()).unwrap();
    }
}
