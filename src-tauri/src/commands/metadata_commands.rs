use tauri::State;

use crate::db::DbState;
use crate::services::metadata_service::{self, ItemMetadata};
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_get_item_metadata(
    db: State<DbState>,
    item_id: String,
) -> Result<ItemMetadata, AppError> {
    metadata_service::get_item_metadata(&db, &item_id)
}
