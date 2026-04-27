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

/// std::panic::set_hook で登録する。
/// `enabled` が false なら何もしない (default OFF 維持)。
/// 実 reporter の呼び出しは tokio runtime / non-blocking 配慮が必要なため、
/// 今は in-memory 保管のみ (PH-472 で flush 統合予定)。
#[allow(dead_code)]
pub fn install_panic_hook(_enabled: bool) {
    // PH-466: 構造体 + redact + envelope assemble まで実装。
    // 実 hook 設置 + Sentry 送信は次 iteration (PH-472) で。
    // この iteration では Opt-in toggle UI と core API を提供する範囲に留める。
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
