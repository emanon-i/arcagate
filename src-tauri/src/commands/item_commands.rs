use tauri::{AppHandle, Manager, State};

use crate::models::item::{CreateItemInput, Item, LibraryStats, UpdateItemInput};
use crate::models::tag::{CreateTagInput, Tag, TagWithCount};
use crate::services::AppServices;
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_create_item(
    services: State<AppServices>,
    input: CreateItemInput,
) -> Result<Item, AppError> {
    services.item.create_item(input)
}

#[tauri::command]
pub fn cmd_list_items(services: State<AppServices>) -> Result<Vec<Item>, AppError> {
    services.item.list_items()
}

#[tauri::command]
pub fn cmd_search_items(
    services: State<AppServices>,
    query: String,
) -> Result<Vec<Item>, AppError> {
    services.item.search_items(&query)
}

#[tauri::command]
pub fn cmd_update_item(
    services: State<AppServices>,
    id: String,
    input: UpdateItemInput,
) -> Result<Item, AppError> {
    services.item.update_item(&id, input)
}

#[tauri::command]
pub fn cmd_delete_item(services: State<AppServices>, id: String) -> Result<(), AppError> {
    services.item.delete_item(&id)
}

/// PH-issue-006: 削除確認 dialog 用 — 該当 item を参照する widget 数。
#[tauri::command]
pub fn cmd_count_item_references(
    services: State<AppServices>,
    id: String,
) -> Result<usize, AppError> {
    services.item.count_item_references(&id)
}

// PH-436 / Nielsen H7: 一括操作 (transaction、最大 1000 件)
#[tauri::command]
pub fn cmd_bulk_add_tag(
    services: State<AppServices>,
    item_ids: Vec<String>,
    tag_id: String,
) -> Result<usize, AppError> {
    services.item.bulk_add_tag(item_ids, tag_id)
}

#[tauri::command]
pub fn cmd_bulk_remove_tag(
    services: State<AppServices>,
    item_ids: Vec<String>,
    tag_id: String,
) -> Result<usize, AppError> {
    services.item.bulk_remove_tag(item_ids, tag_id)
}

#[tauri::command]
pub fn cmd_bulk_delete_items(
    services: State<AppServices>,
    item_ids: Vec<String>,
) -> Result<usize, AppError> {
    services.item.bulk_delete_items(item_ids)
}

#[tauri::command]
pub fn cmd_get_tags(services: State<AppServices>) -> Result<Vec<Tag>, AppError> {
    services.item.get_tags()
}

#[tauri::command]
pub fn cmd_create_tag(
    services: State<AppServices>,
    input: CreateTagInput,
) -> Result<Tag, AppError> {
    services.item.create_tag(input)
}

#[tauri::command]
pub fn cmd_update_tag(
    services: State<AppServices>,
    id: String,
    name: String,
    is_hidden: bool,
) -> Result<(), AppError> {
    services.item.update_tag(&id, &name, is_hidden)
}

#[tauri::command]
pub fn cmd_update_tag_prefix(
    services: State<AppServices>,
    id: String,
    prefix: Option<String>,
) -> Result<(), AppError> {
    services.item.update_tag_prefix(&id, prefix.as_deref())
}

#[tauri::command]
pub fn cmd_delete_tag(services: State<AppServices>, id: String) -> Result<(), AppError> {
    services.item.delete_tag(&id)
}

#[tauri::command]
pub fn cmd_get_library_stats(services: State<AppServices>) -> Result<LibraryStats, AppError> {
    services.item.get_library_stats()
}

#[tauri::command]
pub fn cmd_get_tag_counts(services: State<AppServices>) -> Result<Vec<TagWithCount>, AppError> {
    services.item.get_tag_counts()
}

#[tauri::command]
pub fn cmd_get_item_tags(
    services: State<AppServices>,
    item_id: String,
) -> Result<Vec<Tag>, AppError> {
    services.item.get_item_tags(&item_id)
}

#[tauri::command]
pub fn cmd_search_items_in_tag(
    services: State<AppServices>,
    tag_id: String,
    query: String,
) -> Result<Vec<Item>, AppError> {
    services.item.search_items_in_tag(&tag_id, &query)
}

#[tauri::command]
pub fn cmd_count_hidden_items(services: State<AppServices>) -> Result<i64, AppError> {
    services.item.count_hidden_items()
}

#[tauri::command]
pub fn cmd_toggle_star(
    services: State<AppServices>,
    item_id: String,
    starred: bool,
) -> Result<Item, AppError> {
    services.item.toggle_star(&item_id, starred)
}

#[tauri::command]
pub fn cmd_auto_register_folder_items(
    services: State<AppServices>,
    root_path: String,
    workspace_id: Option<String>,
) -> Result<Vec<Item>, AppError> {
    services
        .item
        .auto_register_folder_items(&root_path, workspace_id.as_deref())
}

/// 5/01 user 検収 (C2): EXE ファイルを Library に Item として登録。
/// U-7: workspace_id 指定時、 sys-ws-<id> tag も自動付与 (widget 経由登録時用)。
#[tauri::command]
pub fn cmd_register_exe_item(
    services: State<AppServices>,
    path: String,
    label: Option<String>,
    workspace_id: Option<String>,
) -> Result<Item, AppError> {
    services
        .item
        .register_exe_item(&path, label, workspace_id.as_deref())
}

/// 5/01 user 検収 (C2): 複数 EXE を一括 Library 登録 (ExeFolderWatchWidget の "全部追加" button 用)。
/// U-7: workspace_id 指定時、 各 item に sys-ws-<id> tag も自動付与。
#[tauri::command]
pub fn cmd_register_exe_items_bulk(
    services: State<AppServices>,
    paths: Vec<String>,
    workspace_id: Option<String>,
) -> Result<Vec<Item>, AppError> {
    services
        .item
        .register_exe_items_bulk(paths, workspace_id.as_deref())
}

#[tauri::command]
pub fn cmd_check_is_directory(path: String) -> bool {
    std::path::Path::new(&path).is_dir()
}

#[tauri::command]
pub async fn cmd_extract_item_icon(app: AppHandle, exe_path: String) -> Result<String, AppError> {
    // R9-B: icon_cache 経由で同 exe の重複 PowerShell 起動を回避。
    // PowerShell 経由の icon 抽出は 100-200ms blocking。Tauri runtime の worker thread を
    // 占有しないよう spawn_blocking で逃がす (drop-shadow + per-card 並列で UI 固まり対策、I3)。
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Io(std::io::Error::other(e.to_string())))?;
    let app_for_state = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let services = app_for_state.state::<AppServices>();
        services
            .item
            .extract_item_icon_cached(&app_data_dir, &exe_path)
    })
    .await
    .map_err(|e| AppError::Io(std::io::Error::other(format!("spawn_blocking failed: {e}"))))?
}
