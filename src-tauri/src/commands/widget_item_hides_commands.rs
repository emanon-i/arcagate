// Phase 2 (2026-05-12): per-widget hide IPC。
// audit 2026-05-13 F4: 旧実装は repository を直呼びしていた (= 層 violation)。
// commands → services → repositories の一方向 rule に従い、 service 経由へ修正。

use crate::services::AppServices;
use crate::utils::error::AppError;
use tauri::State;

#[tauri::command]
pub fn cmd_add_widget_item_hide(
    services: State<AppServices>,
    widget_id: String,
    item_target: String,
) -> Result<(), AppError> {
    services.widget_item_hides.add(&widget_id, &item_target)
}

#[tauri::command]
pub fn cmd_remove_widget_item_hide(
    services: State<AppServices>,
    widget_id: String,
    item_target: String,
) -> Result<(), AppError> {
    services.widget_item_hides.remove(&widget_id, &item_target)
}

#[tauri::command]
pub fn cmd_list_widget_item_hides(
    services: State<AppServices>,
    widget_id: String,
) -> Result<Vec<String>, AppError> {
    services.widget_item_hides.list_by_widget(&widget_id)
}
