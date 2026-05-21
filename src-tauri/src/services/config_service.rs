use crate::db::DbState;
use crate::models::config;
use crate::repositories::config_repository;
use crate::utils::error::AppError;

pub fn get_hotkey(db: &DbState) -> Result<String, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    config_repository::get_or_default(&conn, config::KEY_HOTKEY, config::DEFAULT_HOTKEY)
}

/// PH-PQ-100 T4: 保存済み hotkey の構文を検証し、 壊れていれば default に縮退する。
///
/// 戻り値 `.1` (`recovered`) が `true` のとき、 config 破損を検知して default に
/// フォールバックしたことを示す (呼び出し側 = 起動経路は user に toast 通知する)。
///
/// 「破損」 の判定: 空文字 / 64 文字超 / 制御文字含み / `+` 区切りで空セグメントを含む。
/// 厳密な shortcut 構文検証 (修飾キー名の妥当性) は `global_shortcut().register()` に
/// 委ねる — register 失敗時の縮退は起動経路側で別途扱う。
pub fn get_hotkey_validated(db: &DbState) -> Result<(String, bool), AppError> {
    let stored = get_hotkey(db)?;
    if is_plausible_hotkey(&stored) {
        Ok((stored, false))
    } else {
        log::warn!(
            "stored hotkey is malformed (len={}), falling back to default",
            stored.len()
        );
        Ok((config::DEFAULT_HOTKEY.to_string(), true))
    }
}

/// hotkey 文字列が最低限まともな構文かどうか (T4 config 破損検出)。
fn is_plausible_hotkey(s: &str) -> bool {
    let trimmed = s.trim();
    if trimmed.is_empty() || trimmed.len() > 64 {
        return false;
    }
    if trimmed.chars().any(|c| c.is_control()) {
        return false;
    }
    // `+` 区切りの各セグメントが非空であること (例: "Ctrl++Space" や "+Space" を弾く)
    trimmed.split('+').all(|seg| !seg.trim().is_empty())
}

pub fn set_hotkey(db: &DbState, hotkey: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    config_repository::set(&conn, config::KEY_HOTKEY, hotkey)
}

pub fn get_autostart(db: &DbState) -> Result<bool, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let val = config_repository::get_or_default(&conn, config::KEY_AUTOSTART, "false")?;
    Ok(val == "true")
}

pub fn set_autostart(db: &DbState, enabled: bool) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    config_repository::set(
        &conn,
        config::KEY_AUTOSTART,
        if enabled { "true" } else { "false" },
    )
}

pub fn is_setup_complete(db: &DbState) -> Result<bool, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let val = config_repository::get_or_default(&conn, config::KEY_SETUP_COMPLETE, "false")?;
    Ok(val == "true")
}

pub fn mark_setup_complete(db: &DbState) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    config_repository::set(&conn, config::KEY_SETUP_COMPLETE, "true")
}

pub fn is_onboarding_complete(db: &DbState) -> Result<bool, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let val = config_repository::get_or_default(&conn, config::KEY_ONBOARDING_COMPLETE, "false")?;
    Ok(val == "true")
}

pub fn mark_onboarding_complete(db: &DbState) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    config_repository::set(&conn, config::KEY_ONBOARDING_COMPLETE, "true")
}

pub fn get_config(db: &DbState, key: &str) -> Result<Option<String>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    config_repository::get(&conn, key)
}

pub fn set_config(db: &DbState, key: &str, value: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    config_repository::set(&conn, key, value)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    #[test]
    fn test_get_hotkey_returns_default() {
        let db = initialize_in_memory();
        let hotkey = get_hotkey(&db).unwrap();
        assert_eq!(hotkey, "Ctrl+Shift+Space");
    }

    #[test]
    fn test_set_and_get_hotkey() {
        let db = initialize_in_memory();
        set_hotkey(&db, "Alt+Space").unwrap();
        let hotkey = get_hotkey(&db).unwrap();
        assert_eq!(hotkey, "Alt+Space");
    }

    #[test]
    fn test_autostart_defaults_to_false() {
        let db = initialize_in_memory();
        let enabled = get_autostart(&db).unwrap();
        assert!(!enabled);
    }

    #[test]
    fn test_set_autostart() {
        let db = initialize_in_memory();
        set_autostart(&db, true).unwrap();
        assert!(get_autostart(&db).unwrap());
        set_autostart(&db, false).unwrap();
        assert!(!get_autostart(&db).unwrap());
    }

    #[test]
    fn test_setup_complete_defaults_to_false() {
        let db = initialize_in_memory();
        assert!(!is_setup_complete(&db).unwrap());
    }

    #[test]
    fn test_mark_setup_complete() {
        let db = initialize_in_memory();
        mark_setup_complete(&db).unwrap();
        assert!(is_setup_complete(&db).unwrap());
    }

    #[test]
    fn test_get_config_returns_none_for_missing_key() {
        let db = initialize_in_memory();
        let result = get_config(&db, "nonexistent").unwrap();
        assert_eq!(result, None);
    }

    #[test]
    fn test_set_and_get_config() {
        let db = initialize_in_memory();
        set_config(&db, "custom_key", "custom_value").unwrap();
        let result = get_config(&db, "custom_key").unwrap();
        assert_eq!(result, Some("custom_value".to_string()));
    }

    // --- PH-PQ-100 T4: config 破損 recovery ---

    #[test]
    fn test_plausible_hotkey_accepts_valid() {
        assert!(is_plausible_hotkey("Ctrl+Shift+Space"));
        assert!(is_plausible_hotkey("Alt+Space"));
        assert!(is_plausible_hotkey("F12"));
    }

    #[test]
    fn test_plausible_hotkey_rejects_corrupt() {
        assert!(!is_plausible_hotkey(""));
        assert!(!is_plausible_hotkey("   "));
        assert!(!is_plausible_hotkey("Ctrl++Space")); // 空セグメント
        assert!(!is_plausible_hotkey("+Space")); // 先頭空
        assert!(!is_plausible_hotkey("Ctrl+\u{0}Space")); // 制御文字
        assert!(!is_plausible_hotkey(&"X".repeat(65))); // 長すぎ
    }

    #[test]
    fn test_get_hotkey_validated_healthy() {
        let db = initialize_in_memory();
        set_hotkey(&db, "Alt+Space").unwrap();
        let (hotkey, recovered) = get_hotkey_validated(&db).unwrap();
        assert_eq!(hotkey, "Alt+Space");
        assert!(!recovered);
    }

    #[test]
    fn test_get_hotkey_validated_recovers_corrupt() {
        // T4 受入: 破損 config column を pre-populate → default 縮退 + recovered=true
        let db = initialize_in_memory();
        set_hotkey(&db, "Ctrl++\u{0}garbage").unwrap();
        let (hotkey, recovered) = get_hotkey_validated(&db).unwrap();
        assert_eq!(hotkey, config::DEFAULT_HOTKEY);
        assert!(recovered, "corrupt hotkey should trigger recovery flag");
    }
}

/// V1 解消 (A3 PR-A): AppServices 集約パターン用の service struct。
/// 各 method は同 module の free function に delegate (scope 限定のため既存実装は維持)。
pub struct ConfigService {
    db: std::sync::Arc<crate::db::DbState>,
}

impl ConfigService {
    pub fn new(db: std::sync::Arc<crate::db::DbState>) -> Self {
        Self { db }
    }

    pub fn get_hotkey(&self) -> Result<String, AppError> {
        get_hotkey(&self.db)
    }

    /// PH-PQ-100 T4: hotkey 検証付き取得。 戻り値 `.1` が `true` なら default 縮退済み。
    pub fn get_hotkey_validated(&self) -> Result<(String, bool), AppError> {
        get_hotkey_validated(&self.db)
    }

    pub fn set_hotkey(&self, hotkey: &str) -> Result<(), AppError> {
        set_hotkey(&self.db, hotkey)
    }

    pub fn get_autostart(&self) -> Result<bool, AppError> {
        get_autostart(&self.db)
    }

    pub fn set_autostart(&self, enabled: bool) -> Result<(), AppError> {
        set_autostart(&self.db, enabled)
    }

    pub fn is_setup_complete(&self) -> Result<bool, AppError> {
        is_setup_complete(&self.db)
    }

    pub fn mark_setup_complete(&self) -> Result<(), AppError> {
        mark_setup_complete(&self.db)
    }

    pub fn is_onboarding_complete(&self) -> Result<bool, AppError> {
        is_onboarding_complete(&self.db)
    }

    pub fn mark_onboarding_complete(&self) -> Result<(), AppError> {
        mark_onboarding_complete(&self.db)
    }

    pub fn get_config(&self, key: &str) -> Result<Option<String>, AppError> {
        get_config(&self.db, key)
    }

    pub fn set_config(&self, key: &str, value: &str) -> Result<(), AppError> {
        set_config(&self.db, key, value)
    }
}
