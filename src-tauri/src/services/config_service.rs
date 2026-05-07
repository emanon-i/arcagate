use crate::db::DbState;
use crate::models::config;
use crate::repositories::config_repository;
use crate::utils::error::AppError;

pub fn get_hotkey(db: &DbState) -> Result<String, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    config_repository::get_or_default(&conn, config::KEY_HOTKEY, config::DEFAULT_HOTKEY)
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
