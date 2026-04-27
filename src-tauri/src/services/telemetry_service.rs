// Telemetry service (PH-465 batch-106)
//
// 設計: docs/l3_phases/archive/PH-20260427-460_telemetry-design.md (PostHog 直接 POST、SDK 不使用)
// プライバシー: PRIVACY.md と一致 (ユーザ識別子なし、個別アイテム名・path・クエリ送信なし)
//
// 構造:
// - In-memory event counter (Mutex<HashMap<String, u64>>) で操作カウント保持
// - flush() で PostHog `/i/v0/e/` endpoint に集計値を一括 POST
// - record_event() は cheap (lock + increment)、send は別タイミング
// - Opt-in 確認は呼び元の責任 (config_service::get_telemetry_opt_in を先にチェック)

use crate::utils::error::AppError;
use crate::utils::http_client;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

/// PostHog SaaS Free tier endpoint (US region、設定駆動にする場合は将来 config 化)
#[allow(dead_code)]
const TELEMETRY_ENDPOINT: &str = "https://us.i.posthog.com/i/v0/e/";
#[allow(dead_code)]
const FLUSH_TIMEOUT_SECS: u64 = 10;

#[derive(Debug, Default)]
pub struct TelemetryBuffer {
    /// event 名 → 累計カウント
    counts: Mutex<HashMap<String, u64>>,
    /// AppError code 別カウント
    error_counts: Mutex<HashMap<String, u64>>,
}

impl TelemetryBuffer {
    pub fn new() -> Self {
        Self {
            counts: Mutex::new(HashMap::new()),
            error_counts: Mutex::new(HashMap::new()),
        }
    }

    /// 操作カウント記録 (例: `record_event("launch")`、`record_event("palette_open")`)
    pub fn record_event(&self, name: &str) {
        if let Ok(mut counts) = self.counts.lock() {
            *counts.entry(name.to_string()).or_insert(0) += 1;
        }
    }

    /// AppError code 記録 (例: `record_error("launch.file_not_found")`)
    #[allow(dead_code)]
    pub fn record_error(&self, code: &str) {
        if let Ok(mut errors) = self.error_counts.lock() {
            *errors.entry(code.to_string()).or_insert(0) += 1;
        }
    }

    /// buffer の中身を取得して clear (flush の前段階)
    pub fn drain(&self) -> (HashMap<String, u64>, HashMap<String, u64>) {
        let counts = self
            .counts
            .lock()
            .ok()
            .map(|mut c| std::mem::take(&mut *c))
            .unwrap_or_default();
        let errors = self
            .error_counts
            .lock()
            .ok()
            .map(|mut e| std::mem::take(&mut *e))
            .unwrap_or_default();
        (counts, errors)
    }
}

/// PostHog endpoint に POST する。Opt-in 確認は呼び元の責任。
///
/// 送信内容 (PRIVACY.md と一致):
/// - app_version / os / arch / webview_version (props として)
/// - event_count, error_count (各 event 名・code 名のカウント)
///
/// 送信外: 個別アイテム名 / path / クエリ / UUID / IP
#[allow(dead_code)]
pub fn flush(
    buffer: &TelemetryBuffer,
    app_version: &str,
    posthog_api_key: &str,
) -> Result<(), AppError> {
    let (counts, errors) = buffer.drain();
    if counts.is_empty() && errors.is_empty() {
        return Ok(()); // 送るものがない
    }
    let payload = json!({
        "api_key": posthog_api_key,
        "event": "arcagate_session_summary",
        // distinct_id は session id ベース、UUID 永続化なし (匿名)
        "distinct_id": format!("anon-session-{}", std::process::id()),
        "properties": {
            "app_version": app_version,
            "os": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
            "event_counts": counts,
            "error_counts": errors,
        },
    });
    http_client::post_json(
        TELEMETRY_ENDPOINT,
        &payload,
        Duration::from_secs(FLUSH_TIMEOUT_SECS),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn record_event_increments_counter() {
        let buf = TelemetryBuffer::new();
        buf.record_event("launch");
        buf.record_event("launch");
        buf.record_event("palette_open");
        let (counts, _) = buf.drain();
        assert_eq!(counts.get("launch"), Some(&2));
        assert_eq!(counts.get("palette_open"), Some(&1));
    }

    #[test]
    fn record_error_increments_counter() {
        let buf = TelemetryBuffer::new();
        buf.record_error("launch.file_not_found");
        buf.record_error("launch.file_not_found");
        buf.record_error("watch.failed");
        let (_, errors) = buf.drain();
        assert_eq!(errors.get("launch.file_not_found"), Some(&2));
        assert_eq!(errors.get("watch.failed"), Some(&1));
    }

    #[test]
    fn drain_clears_buffer() {
        let buf = TelemetryBuffer::new();
        buf.record_event("test");
        let (counts1, _) = buf.drain();
        assert_eq!(counts1.get("test"), Some(&1));
        let (counts2, _) = buf.drain();
        assert!(counts2.is_empty());
    }
}
