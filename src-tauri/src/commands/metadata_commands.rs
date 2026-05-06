use tauri::State;

use crate::services::metadata_service::ItemMetadata;
use crate::services::AppServices;
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_get_item_metadata(
    services: State<AppServices>,
    item_id: String,
) -> Result<ItemMetadata, AppError> {
    services.metadata.get_item_metadata(&item_id)
}

#[tauri::command]
pub fn cmd_get_items_metadata_batch(
    services: State<AppServices>,
    ids: Vec<String>,
) -> Result<Vec<(String, ItemMetadata)>, AppError> {
    services.metadata.get_items_metadata_batch(&ids)
}
