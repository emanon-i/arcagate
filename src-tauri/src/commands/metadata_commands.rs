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
    let started = std::time::Instant::now();
    let n = ids.len();
    let r = services.metadata.get_items_metadata_batch(&ids);
    log::debug!(
        "[cmd-timing] cmd_get_items_metadata_batch {:.1}ms (ids={})",
        started.elapsed().as_secs_f64() * 1000.0,
        n
    );
    r
}
