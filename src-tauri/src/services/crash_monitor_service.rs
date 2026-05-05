// Crash 監視 service (PH-466 batch-106)
//
// 設計: docs/l3_phases/archive/PH-20260427-461_crash-monitor-design.md
// プライバシー: PRIVACY.md と一致 (DB 内容 / 設定値 / 操作内容は送信しない)
//
// SDK (sentry-rust / @sentry/svelte) は exe 20MB cap のため不使用。
// Sentry envelope endpoint に http_client::post_json で直接 POST。
//
// 構造:
// - panic_hook で std::panic::set_hook → CrashReport を assemble
// - report_panic() で envelope を Sentry endpoint に POST (Opt-in 確認は呼び元責任)
// - file path redact: `C:/Users/<user>/AppData/...` → `<APPDATA>/...`

use crate::utils::error::AppError;
use crate::utils::http_client;
use serde_json::json;
use std::time::Duration;

#[allow(dead_code)]
const CRASH_REPORT_TIMEOUT_SECS: u64 = 10;

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct PanicReport {
    pub message: String,
    pub location: String,
    pub backtrace: String,
    pub app_version: String,
}

/// path 抽象化 (`C:/Users/<user>/AppData/...` → `<APPDATA>/...` 等)
///
/// 単純な substring 置換、複数 user 環境を想定して USERPROFILE / APPDATA 配下を redact。
pub fn redact_path(path: &str) -> String {
    let appdata = std::env::var("APPDATA").unwrap_or_default();
    let userprofile = std::env::var("USERPROFILE").unwrap_or_default();
    let local_appdata = std::env::var("LOCALAPPDATA").unwrap_or_default();
    let mut redacted = path.to_string();
    if !appdata.is_empty() {
        redacted = redacted.replace(&appdata, "<APPDATA>");
    }
    if !local_appdata.is_empty() {
        redacted = redacted.replace(&local_appdata, "<LOCALAPPDATA>");
    }
    if !userprofile.is_empty() {
        redacted = redacted.replace(&userprofile, "<USERPROFILE>");
    }
    redacted
}

/// Sentry envelope endpoint への POST (Opt-in 確認は呼び元責任)
///
/// envelope_url は config から取得 (DSN: https://<key>@<host>/<project_id>)。
/// 形式: https://<host>/api/<project>/envelope/?sentry_key=<key>&sentry_version=7
///
/// 送信フィールド (PRIVACY.md と一致):
/// - message / location / backtrace (redact 後)
/// - app_version / os / arch
///
/// 送信外: DB 内容 / 設定値 / 操作内容
#[allow(dead_code)]
pub fn report_panic(report: &PanicReport, envelope_url: &str) -> Result<(), AppError> {
    let payload = json!({
        "event_id": format!("anon-{}", std::process::id()),
        "platform": "native",
        "level": "fatal",
        "message": redact_path(&report.message),
        "exception": {
            "values": [{
                "type": "panic",
                "value": redact_path(&report.message),
                "stacktrace": {
                    "frames": [{
                        "filename": redact_path(&report.location),
                    }],
                },
            }],
        },
        "release": &report.app_version,
        "tags": {
            "os": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
        },
        "extra": {
            "backtrace": redact_path(&report.backtrace),
        },
    });
    http_client::post_json(
        envelope_url,
        &payload,
        Duration::from_secs(CRASH_REPORT_TIMEOUT_SECS),
    )
}

/// R10-D E1: panic 発生時に APPDATA/last-panic.json へ記録する hook。
///
/// 次回起動時に frontend が `cmd_consume_last_panic` で読み取り、
/// 「予期しないエラーで前回終了しました」 toast を出すための local 記録。
/// (Sentry envelope への自動送信は telemetry opt-in 時のみ、本 hook では行わない)。
///
/// `app_data_dir`: APPDATA 直下の app data dir (Tauri が初期化済の path)。
/// 本関数は `setup` callback で 1 度だけ呼ぶ (idempotent: chain した hook を上書きはせず、
/// 旧 hook を保持して連鎖呼出する)。
pub fn install_panic_hook(app_data_dir: std::path::PathBuf) {
    let prev = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        // panic message + location 抽出 (redact 済)
        let payload = info.payload();
        let message = payload
            .downcast_ref::<&str>()
            .map(|s| (*s).to_string())
            .or_else(|| payload.downcast_ref::<String>().cloned())
            .unwrap_or_else(|| "unknown panic".to_string());
        let location = info
            .location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "<unknown>".to_string());
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let report = serde_json::json!({
            "message": redact_path(&message),
            "location": redact_path(&location),
            "timestamp_unix_secs": timestamp,
            "app_version": env!("CARGO_PKG_VERSION"),
        });
        // 失敗しても panic 中なので静かに log (再 panic 防止)。
        let path = app_data_dir.join("last-panic.json");
        if let Ok(s) = serde_json::to_string_pretty(&report) {
            let _ = std::fs::write(&path, s);
        }
        log::error!("[panic_hook] {}: {}", location, redact_path(&message));
        prev(info);
    }));
}

/// 直前 panic 情報を APPDATA/last-panic.json から read + 削除する。
/// 起動直後に frontend から呼び、未読の panic を user に提示する。
pub fn consume_last_panic(app_data_dir: &std::path::Path) -> Option<String> {
    let path = app_data_dir.join("last-panic.json");
    if !path.exists() {
        return None;
    }
    let content = std::fs::read_to_string(&path).ok()?;
    let _ = std::fs::remove_file(&path);
    Some(content)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redact_path_replaces_appdata() {
        // 環境依存テスト (CI Windows runner で APPDATA が定義されている前提)
        let appdata = std::env::var("APPDATA").unwrap_or_default();
        if !appdata.is_empty() {
            let path = format!("{}/arcagate/logs/foo.log", appdata);
            let redacted = redact_path(&path);
            assert!(redacted.contains("<APPDATA>"));
            assert!(!redacted.contains(&appdata));
        }
    }

    #[test]
    fn redact_path_passthrough_for_unknown_paths() {
        let path = "C:/SomeUnknown/Path/foo.log";
        let redacted = redact_path(path);
        // USERPROFILE / APPDATA / LOCALAPPDATA に含まれない場合はそのまま
        assert!(redacted.contains("SomeUnknown") || !redacted.contains("<"));
    }

    #[test]
    fn redact_path_no_panic_on_empty_envs() {
        // env が空でも panic しない
        let path = "C:/Test/foo.log";
        let _ = redact_path(path);
    }
}
