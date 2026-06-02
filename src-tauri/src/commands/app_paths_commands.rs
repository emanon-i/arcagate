//! PH-CF-1300: データ透明化 — app data / log / DB の絶対 path を frontend に返す。
//!
//! 設定 → About → Data location section + 各 path の「Explorer で開く」 button
//! が呼ぶ。 個人 PC 上の絶対 path を表示するだけで file 書き込みはしない (read-only)。
//!
//! 表示用途のみ、 file system 操作には呼び出し側 (Tauri / Rust) が直接 absolute
//! path を扱う既存経路を使う (= 本 command の返り値は user 表示 + reveal-in-explorer
//! 用の絶対 path)。

use serde::Serialize;
use tauri::{AppHandle, Manager, Runtime};

use crate::utils::error::AppError;

/// 設定画面 About section が表示する path の集合。
///
/// 各 path は **Windows 標準の絶対 path** (`%APPDATA%\com.arcagate.desktop\
/// arcagate.db` 等を OS が展開した形)。 user の home dir が含まれるため、 commit /
/// log / PR description にコピペしないこと (`PERSONAL_PATH_LEAK_AUDIT_2026-05-28.md`
/// 参照)。
#[derive(Debug, Serialize)]
pub struct AppPaths {
    /// SQLite DB file の絶対 path。
    pub db: String,
    /// App data dir (DB / icons / wallpapers / image-scraps の親) の絶対 path。
    pub app_data_dir: String,
    /// Log dir (tauri-plugin-log 出力先) の絶対 path。
    pub log_dir: String,
}

#[tauri::command]
pub fn cmd_get_app_paths<R: Runtime>(app: AppHandle<R>) -> Result<AppPaths, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::InvalidInput(format!("failed to resolve app data dir: {e}")))?;
    let log_dir = app
        .path()
        .app_log_dir()
        .map_err(|e| AppError::InvalidInput(format!("failed to resolve app log dir: {e}")))?;

    // DB path は環境変数 override (e2e 用 `ARCAGATE_DB_PATH`) と同じロジックを再現する。
    // `lib.rs:192-194` と整合させる: env 優先、 default は app_data_dir.join("arcagate.db")。
    let db_path = std::env::var("ARCAGATE_DB_PATH")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|_| app_data_dir.join("arcagate.db"));

    Ok(AppPaths {
        db: db_path.to_string_lossy().into_owned(),
        app_data_dir: app_data_dir.to_string_lossy().into_owned(),
        log_dir: log_dir.to_string_lossy().into_owned(),
    })
}
