// audit 2026-05-13 F4: 層 violation 修正用 service wrapper。
// 旧 widget_item_hides_commands.rs が repository を直呼びしていた (= service skip = 設計 rule
// commands → services → repositories 違反)。 本 service を経由させる。

use crate::db::DbState;
use crate::repositories::widget_item_hides_repository;
use crate::utils::error::AppError;
use std::sync::Arc;

pub struct WidgetItemHidesService {
    pub db: Arc<DbState>,
}

impl WidgetItemHidesService {
    pub fn new(db: Arc<DbState>) -> Self {
        Self { db }
    }

    pub fn add(&self, widget_id: &str, item_target: &str) -> Result<(), AppError> {
        let conn = self.db.0.lock().map_err(|_| AppError::DbLock)?;
        widget_item_hides_repository::add(&conn, widget_id, item_target)
    }

    pub fn remove(&self, widget_id: &str, item_target: &str) -> Result<(), AppError> {
        let conn = self.db.0.lock().map_err(|_| AppError::DbLock)?;
        widget_item_hides_repository::remove(&conn, widget_id, item_target)
    }

    pub fn list_by_widget(&self, widget_id: &str) -> Result<Vec<String>, AppError> {
        let conn = self.db.0.lock().map_err(|_| AppError::DbLock)?;
        widget_item_hides_repository::list_by_widget(&conn, widget_id)
    }
}
