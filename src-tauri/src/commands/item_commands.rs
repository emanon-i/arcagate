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
    // perf observability (prototype): command 入口→出口の所要を log 出力。
    let started = std::time::Instant::now();
    let r = services.item.list_items();
    log::debug!(
        "[cmd-timing] cmd_list_items {:.1}ms (n={})",
        started.elapsed().as_secs_f64() * 1000.0,
        r.as_ref().map(Vec::len).unwrap_or(0)
    );
    r
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

/// アイテムライフサイクル契約 U-5: 「Library に残しつつ当該 workspace から外す」 操作。
/// 削除 (`cmd_delete_item`) と意図的に区別する。
#[tauri::command]
pub fn cmd_remove_item_from_workspace(
    services: State<AppServices>,
    workspace_id: String,
    item_id: String,
) -> Result<(), AppError> {
    services
        .item
        .remove_item_from_workspace(&workspace_id, &item_id)
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
    let started = std::time::Instant::now();
    let r = services.item.get_library_stats();
    log::debug!(
        "[cmd-timing] cmd_get_library_stats {:.1}ms",
        started.elapsed().as_secs_f64() * 1000.0
    );
    r
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

/// PH-CF-600 C4: `include_disabled` で hidden item を結果に含めるかを明示する。
///
/// frontend で省略 (None) → 従来挙動 (= `false`、 hidden 除外) を維持。 既存 call-site の
/// 後方互換と「launcher 用途は hidden 除外」 の default を兼ねる。 Library 画面の
/// `loadItemsByTag` が `libraryShowHidden` ON 時にだけ true を渡す。
#[tauri::command]
pub fn cmd_search_items_in_tag(
    services: State<AppServices>,
    tag_id: String,
    query: String,
    include_disabled: Option<bool>,
) -> Result<Vec<Item>, AppError> {
    let started = std::time::Instant::now();
    let r = services
        .item
        .search_items_in_tag(&tag_id, &query, include_disabled.unwrap_or(false));
    log::debug!(
        "[cmd-timing] cmd_search_items_in_tag(tag={}, include_disabled={}) {:.1}ms (n={})",
        tag_id,
        include_disabled.unwrap_or(false),
        started.elapsed().as_secs_f64() * 1000.0,
        r.as_ref().map(Vec::len).unwrap_or(0)
    );
    r
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

/// W-2 (2026-05-19): 監視フォルダ配下の dir walk + DB 一括登録は main thread を
/// block するため `spawn_blocking` で worker thread に逃がす。
///
/// PH-CF-100: `source_widget_id` は監視自動登録経路の back-link。 Some を渡すと
/// `(source_widget_id, source_entry_key)` 重複判定 + `widget_item_hides` skip が効く
/// (= user 削除した entry は復活しない)。 None なら従来の find_by_target (user 直接経路)。
#[tauri::command]
pub async fn cmd_auto_register_folder_items(
    app: AppHandle,
    root_path: String,
    workspace_id: Option<String>,
    source_widget_id: Option<String>,
) -> Result<Vec<Item>, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        app.state::<AppServices>().item.auto_register_folder_items(
            &root_path,
            workspace_id.as_deref(),
            source_widget_id.as_deref(),
        )
    })
    .await
    .map_err(AppError::from_join_error)?
}

/// 5/01 user 検収 (C2): 複数 EXE を一括 Library 登録 (ExeFolderWatchWidget の "全部追加" button 用)。
/// U-7: workspace_id 指定時、 各 item に sys-ws-<id> tag も自動付与。
///
/// PH-CF-100 / PH-CF-400: `source_widget_id` Some なら exe-folder 監視 widget 由来 →
/// 各 path に対応する **第1階層フォルダ** (= scan entry の `folder_path`) を `entry_keys`
/// で渡し、 source_entry_key に埋める。 `entry_keys` が None / 長さ不一致なら exe path の
/// parent folder で fallback (= 旧挙動)。 hide 記録があれば skip。
/// source_widget_id None は user 直接経路 (entry_keys は無視)。
#[tauri::command]
pub fn cmd_register_exe_items_bulk(
    services: State<AppServices>,
    paths: Vec<String>,
    entry_keys: Option<Vec<String>>,
    workspace_id: Option<String>,
    source_widget_id: Option<String>,
) -> Result<Vec<Item>, AppError> {
    services.item.register_exe_items_bulk(
        paths,
        entry_keys,
        workspace_id.as_deref(),
        source_widget_id.as_deref(),
    )
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

/// 見た目設定で選んだアイコン画像を `$APPDATA/icons/` に copy し保存先 path を返す。
/// 生の picker path は asset protocol scope 外で webview が読めないため必須
/// (cmd_save_image_scrap と同 pattern、file copy は worker thread に逃がす)。
#[tauri::command]
pub async fn cmd_save_icon_file(app: AppHandle, source_path: String) -> Result<String, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Io(std::io::Error::other(e.to_string())))?;
    tauri::async_runtime::spawn_blocking(move || {
        crate::services::item_service::save_icon_file(&app_data_dir, &source_path)
    })
    .await
    .map_err(|e| AppError::Io(std::io::Error::other(format!("spawn_blocking failed: {e}"))))?
}
