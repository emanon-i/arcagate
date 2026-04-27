// kill-switch service (PH-468 batch-105)
//
// 起動時に `disabled.json` を fetch して、現在 version が disabled なら起動阻止。
// 設計: docs/l3_phases/archive/PH-20260427-462_kill-switch-design.md (A 方式 GitHub Releases)。
//
// 失敗時は best-effort で無視 (offline / fetch error でアプリを止めない)。
// pubkey 検証は別 plan (Updater pubkey と統合、batch-106 以降)。

use serde::{Deserialize, Serialize};

// batch-106 で HTTP client 実装時に参照する定数
#[allow(dead_code)]
const DISABLED_JSON_URL: &str =
    "https://github.com/emanon-i/arcagate/releases/latest/download/disabled.json";
#[allow(dead_code)]
const FETCH_TIMEOUT_SECS: u64 = 5;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DisabledJson {
    #[serde(default)]
    pub disabled_versions: Vec<String>,
    #[serde(default)]
    pub min_supported_version: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct KillSwitchResult {
    pub disabled: bool,
    pub message: Option<String>,
    pub current_version: String,
}

/// 起動時 kill-switch チェック。
///
/// 失敗時 (offline / parse error) は disabled=false を返す (best-effort)。
pub fn check(current_version: &str) -> KillSwitchResult {
    let disabled = fetch_disabled_json()
        .map(|j| is_version_disabled(current_version, &j))
        .unwrap_or(false);

    let message = if disabled {
        fetch_disabled_json().ok().and_then(|j| j.message)
    } else {
        None
    };

    KillSwitchResult {
        disabled,
        message,
        current_version: current_version.to_string(),
    }
}

fn fetch_disabled_json() -> Result<DisabledJson, Box<dyn std::error::Error>> {
    // ureq は std + small footprint、tokio runtime 不要
    // ただし依存追加は別 plan、本実装では std のみで HTTP しない
    // → fetch は別 plan (PH-465 Telemetry / PH-466 Crash 監視と同じ HTTP client を共有予定)
    Err("kill-switch fetch is stub; HTTP client integration in batch-106".into())
}

fn is_version_disabled(current: &str, json: &DisabledJson) -> bool {
    if json.disabled_versions.iter().any(|v| v == current) {
        return true;
    }
    if let Some(min) = &json.min_supported_version {
        if version_lt(current, min) {
            return true;
        }
    }
    false
}

/// 簡素な semver 比較 (major.minor.patch、0.x.y 対応)
fn version_lt(a: &str, b: &str) -> bool {
    let parse = |s: &str| -> (u32, u32, u32) {
        let parts: Vec<&str> = s.split('.').collect();
        let pn = |i: usize| parts.get(i).and_then(|s| s.parse().ok()).unwrap_or(0);
        (pn(0), pn(1), pn(2))
    };
    parse(a) < parse(b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_disabled_in_list() {
        let json = DisabledJson {
            disabled_versions: vec!["0.2.0".into()],
            ..Default::default()
        };
        assert!(is_version_disabled("0.2.0", &json));
        assert!(!is_version_disabled("0.2.1", &json));
    }

    #[test]
    fn version_below_min_supported() {
        let json = DisabledJson {
            min_supported_version: Some("0.2.0".into()),
            ..Default::default()
        };
        assert!(is_version_disabled("0.1.5", &json));
        assert!(is_version_disabled("0.1.99", &json));
        assert!(!is_version_disabled("0.2.0", &json));
        assert!(!is_version_disabled("0.2.1", &json));
    }

    #[test]
    fn version_lt_basic() {
        assert!(version_lt("0.1.5", "0.2.0"));
        assert!(version_lt("0.2.0", "0.2.1"));
        assert!(version_lt("0.2.0", "1.0.0"));
        assert!(!version_lt("0.2.0", "0.2.0"));
        assert!(!version_lt("0.2.1", "0.2.0"));
    }

    #[test]
    fn check_offline_returns_not_disabled() {
        // fetch_disabled_json が常に Err を返す stub なので、disabled=false
        let r = check("0.1.0");
        assert!(!r.disabled);
        assert_eq!(r.current_version, "0.1.0");
    }
}
