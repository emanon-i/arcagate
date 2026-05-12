// Image scrap service — Workspace に配置する画像 widget の保存 logic (U-5)。
//
// spec: docs/l0_ideas/screens-and-flows.md Workspace §
//   「画像をドラックアンドドロップで配置できてスクラップできる」
//
// 保存先: `<app_data_dir>/image-scraps/<uuid>.<ext>` (wallpaper と同 pattern)。
// asset protocol scope は `$APPDATA/image-scraps/**` で許可。

use std::fs;
use std::path::{Path, PathBuf};

use uuid::Uuid;

use crate::utils::error::AppError;

const ALLOWED_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"];

/// 画像ファイルを `<app_data_dir>/image-scraps/<uuid>.<ext>` にコピーし、保存先 path を返す。
/// extension 不正 / source 不在 / 拡張子 not in ALLOWED → AppError。
pub fn save_image_scrap(app_data_dir: &Path, source_path: &str) -> Result<String, AppError> {
    let source = Path::new(source_path);
    if !source.exists() {
        return Err(AppError::InvalidInput(format!(
            "image source not found: {}",
            source_path
        )));
    }
    let ext = source
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .ok_or_else(|| AppError::InvalidInput("image file has no extension".into()))?;
    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return Err(AppError::InvalidInput(format!(
            "unsupported image format: {}. allowed: {}",
            ext,
            ALLOWED_EXTENSIONS.join(", ")
        )));
    }
    let dir: PathBuf = app_data_dir.join("image-scraps");
    fs::create_dir_all(&dir)?;
    let dest_name = format!("{}.{}", Uuid::now_v7(), ext);
    let dest_path = dir.join(&dest_name);
    fs::copy(source, &dest_path)?;
    // audit batch (2026-05-13) #1.1: Tauri v2 asset:// protocol が
    // Windows backslash path で intermittent に load 失敗するケース対策、
    // forward slash に正規化して返す (Tauri は両 separator を受け入れ)。
    Ok(dest_path.to_string_lossy().into_owned().replace('\\', "/"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn mk_temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("arcagate-image-scrap-{}", name));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write_file(path: &Path, content: &[u8]) {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        let mut f = fs::File::create(path).unwrap();
        f.write_all(content).unwrap();
    }

    #[test]
    fn save_copies_to_app_data_dir() {
        let app_data = mk_temp_dir("save");
        let src = app_data.join("src.png");
        write_file(&src, b"\x89PNG\r\n\x1a\n");
        let dest = save_image_scrap(&app_data, src.to_str().unwrap()).unwrap();
        assert!(dest.contains("image-scraps"));
        assert!(dest.ends_with(".png"));
        assert!(Path::new(&dest).exists());
        fs::remove_dir_all(&app_data).ok();
    }

    #[test]
    fn save_rejects_missing_source() {
        let app_data = mk_temp_dir("missing");
        let result = save_image_scrap(&app_data, "Z:/__never_exists__/x.png");
        assert!(result.is_err());
        fs::remove_dir_all(&app_data).ok();
    }

    #[test]
    fn save_rejects_unsupported_extension() {
        let app_data = mk_temp_dir("ext");
        let src = app_data.join("doc.pdf");
        write_file(&src, b"%PDF");
        let result = save_image_scrap(&app_data, src.to_str().unwrap());
        assert!(result.is_err());
        fs::remove_dir_all(&app_data).ok();
    }

    #[test]
    fn save_handles_gif_webp_svg() {
        let app_data = mk_temp_dir("multi-ext");
        for ext in &["gif", "webp", "svg", "bmp"] {
            let src = app_data.join(format!("img.{}", ext));
            write_file(&src, b"fake content");
            let dest = save_image_scrap(&app_data, src.to_str().unwrap()).unwrap();
            assert!(dest.ends_with(&format!(".{}", ext)));
        }
        fs::remove_dir_all(&app_data).ok();
    }
}
