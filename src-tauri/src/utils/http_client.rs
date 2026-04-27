// HTTP client 共通基盤 (PH-469 batch-106)
//
// Telemetry (PH-465) / Crash 監視 (PH-466) / kill-switch fetch (PH-470) で共有。
// ureq + tls (rustls)。tokio runtime 不要、blocking、~500KB。
//
// 設計: docs/l3_phases/PH-20260427-469_http-client-shared.md

use crate::utils::error::AppError;
use serde_json::Value;
use std::time::Duration;

const USER_AGENT: &str = concat!("Arcagate/", env!("CARGO_PKG_VERSION"), " (Windows)");

fn build_agent(timeout: Duration) -> ureq::Agent {
    ureq::AgentBuilder::new()
        .user_agent(USER_AGENT)
        .timeout_connect(Duration::from_secs(3))
        .timeout(timeout)
        .build()
}

/// best-effort GET。失敗時は AppError::Http を返す (caller 側で握り潰し or warn log 判断)。
pub fn get_text(url: &str, timeout: Duration) -> Result<String, AppError> {
    let agent = build_agent(timeout);
    let resp = agent
        .get(url)
        .call()
        .map_err(|e| AppError::Http(format!("http get failed: {e}")))?;
    let status = resp.status();
    if !(200..300).contains(&status) {
        return Err(AppError::Http(format!("http get returned status {status}")));
    }
    resp.into_string()
        .map_err(|e| AppError::Http(format!("http get body read failed: {e}")))
}

/// best-effort POST JSON。Telemetry / Crash 用。
#[allow(dead_code)]
pub fn post_json(url: &str, payload: &Value, timeout: Duration) -> Result<(), AppError> {
    let agent = build_agent(timeout);
    let resp = agent
        .post(url)
        .send_json(payload.clone())
        .map_err(|e| AppError::Http(format!("http post failed: {e}")))?;
    let status = resp.status();
    if !(200..300).contains(&status) {
        return Err(AppError::Http(format!(
            "http post returned status {status}"
        )));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn user_agent_format() {
        assert!(USER_AGENT.starts_with("Arcagate/"));
        assert!(USER_AGENT.ends_with(" (Windows)"));
    }

    #[test]
    fn build_agent_constructs() {
        let _agent = build_agent(Duration::from_millis(100));
        // ureq::Agent は無条件に build 可能、エラーにならない
    }

    // 実際の HTTP 接続テストは E2E / integration テスト側で行う (offline でも動くよう unit は build のみ)
}
