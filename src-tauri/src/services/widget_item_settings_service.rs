// PH-504: Per-item settings persistence — service layer
use crate::db::DbState;
use crate::models::widget_item_settings::{UpsertWidgetItemSettingsInput, WidgetItemSettings};
use crate::repositories::widget_item_settings_repository as repo;
use crate::utils::error::AppError;

pub fn get_settings(
    db: &DbState,
    widget_id: &str,
    item_key: &str,
) -> Result<Option<WidgetItemSettings>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::find(&conn, widget_id, item_key)
}

pub fn list_settings_by_widget(
    db: &DbState,
    widget_id: &str,
) -> Result<Vec<WidgetItemSettings>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::list_by_widget(&conn, widget_id)
}

pub fn upsert_settings(
    db: &DbState,
    input: UpsertWidgetItemSettingsInput,
) -> Result<WidgetItemSettings, AppError> {
    if input.widget_id.trim().is_empty() {
        return Err(AppError::InvalidInput(
            "widget_id must not be empty".to_string(),
        ));
    }
    if input.item_key.trim().is_empty() {
        return Err(AppError::InvalidInput(
            "item_key must not be empty".to_string(),
        ));
    }
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::upsert(&conn, &input)
}

pub fn delete_settings(db: &DbState, widget_id: &str, item_key: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::delete(&conn, widget_id, item_key)
}

pub fn delete_all_for_widget(db: &DbState, widget_id: &str) -> Result<usize, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::delete_all_for_widget(&conn, widget_id)
}

pub fn prune_orphans(db: &DbState, widget_id: &str, expiry_days: i64) -> Result<usize, AppError> {
    if expiry_days <= 0 {
        return Err(AppError::InvalidInput(
            "expiry_days must be positive".to_string(),
        ));
    }
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let cutoff = now.saturating_sub(expiry_days * 86_400);
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::prune_orphans(&conn, widget_id, cutoff)
}

pub fn touch_last_seen(
    db: &DbState,
    widget_id: &str,
    item_keys: Vec<String>,
) -> Result<(), AppError> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::touch_last_seen(&conn, widget_id, &item_keys, now)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    fn input(widget: &str, key: &str) -> UpsertWidgetItemSettingsInput {
        UpsertWidgetItemSettingsInput {
            widget_id: widget.to_string(),
            item_key: key.to_string(),
            ..Default::default()
        }
    }

    #[test]
    fn upsert_validates_widget_id() {
        let db = initialize_in_memory();
        let result = upsert_settings(&db, input("", "k"));
        assert!(result.is_err());
    }

    #[test]
    fn upsert_validates_item_key() {
        let db = initialize_in_memory();
        let result = upsert_settings(&db, input("w", ""));
        assert!(result.is_err());
    }

    #[test]
    fn full_lifecycle() {
        let db = initialize_in_memory();
        let mut i = input("w1", "key1");
        i.favorite = Some(true);
        let s = upsert_settings(&db, i).unwrap();
        assert!(s.favorite);
        let listed = list_settings_by_widget(&db, "w1").unwrap();
        assert_eq!(listed.len(), 1);
        let removed = delete_all_for_widget(&db, "w1").unwrap();
        assert_eq!(removed, 1);
    }

    #[test]
    fn prune_orphans_validates_positive_expiry() {
        let db = initialize_in_memory();
        let result = prune_orphans(&db, "w1", 0);
        assert!(result.is_err());
    }
}
