// Wallpaper service (PH-499 batch-109)
//
// 画像ファイルを `%LOCALAPPDATA%/com.arcagate.desktop/wallpapers/<uuid>.<ext>` にコピー保存。
// DB には保存後の絶対 path のみ記録。Tauri asset protocol で表示。

use crate::utils::error::AppError;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

const ALLOWED_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp"];

/// 画像を local app data の wallpapers/ にコピーして保存先 path を返す。
///
/// `wallpapers_dir` は `app_data_dir/wallpapers` を想定 (caller が解決して渡す)。
pub fn save_wallpaper(src_path: &Path, wallpapers_dir: &Path) -> Result<PathBuf, AppError> {
    let ext = src_path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .ok_or_else(|| AppError::InvalidInput("wallpaper file has no extension".into()))?;

    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return Err(AppError::InvalidInput(format!(
            "unsupported wallpaper extension: {ext} (allowed: png/jpg/jpeg/webp)"
        )));
    }

    fs::create_dir_all(wallpapers_dir)?;

    let id = Uuid::now_v7();
    let dest = wallpapers_dir.join(format!("{id}.{ext}"));

    fs::copy(src_path, &dest)?;
    Ok(dest)
}

/// 保存済み壁紙ファイルを削除 (best-effort、失敗してもアプリは続行)。
pub fn delete_wallpaper(path: &Path) {
    if path.exists() {
        let _ = fs::remove_file(path);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn save_wallpaper_rejects_unknown_ext() {
        let tempdir = std::env::temp_dir().join(format!("ag-wallpaper-test-{}", Uuid::now_v7()));
        let src = tempdir.join("foo.bmp");
        fs::create_dir_all(&tempdir).unwrap();
        fs::write(&src, b"fake").unwrap();

        let result = save_wallpaper(&src, &tempdir);
        assert!(result.is_err());

        // cleanup
        let _ = fs::remove_dir_all(&tempdir);
    }

    #[test]
    fn save_wallpaper_copies_with_uuid_filename() {
        let tempdir = std::env::temp_dir().join(format!("ag-wallpaper-test-{}", Uuid::now_v7()));
        let src = tempdir.join("source.png");
        let dest_dir = tempdir.join("wallpapers");
        fs::create_dir_all(&tempdir).unwrap();
        fs::write(&src, b"fake png content").unwrap();

        let dest = save_wallpaper(&src, &dest_dir).unwrap();
        assert!(dest.exists());
        assert!(dest.starts_with(&dest_dir));
        assert!(dest.extension().and_then(|e| e.to_str()) == Some("png"));

        // cleanup
        let _ = fs::remove_dir_all(&tempdir);
    }

    #[test]
    fn save_wallpaper_rejects_no_extension() {
        let tempdir = std::env::temp_dir().join(format!("ag-wallpaper-test-{}", Uuid::now_v7()));
        let src = tempdir.join("noext");
        fs::create_dir_all(&tempdir).unwrap();
        fs::write(&src, b"fake").unwrap();

        let result = save_wallpaper(&src, &tempdir);
        assert!(result.is_err());

        let _ = fs::remove_dir_all(&tempdir);
    }
}
