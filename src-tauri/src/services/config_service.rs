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
