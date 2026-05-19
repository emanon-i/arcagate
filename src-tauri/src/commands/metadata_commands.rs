use tauri::{AppHandle, Manager};

use crate::services::metadata_service::ItemMetadata;
use crate::services::AppServices;
use crate::utils::error::AppError;

/// 複数 item の metadata を一括取得 (LibraryCard 一覧の card 副情報)。
///
/// 1 item ごとに `fs::metadata` / folder の `read_dir` + 子要素 stat という blocking I/O を
/// 行うため、 item 数が多い + 低速 disk (HDD 等) では合計で数秒に達する。 sync command は
/// Tauri の main thread 上で実行されるため、 そのままだと UI を数秒 freeze させる。
/// `spawn_blocking` で runtime の worker thread に逃がす (`cmd_extract_item_icon` と同じ理由・
/// 同じ pattern)。 Library 遷移時の metadata warmup はこの経路を通る。
#[tauri::command]
pub async fn cmd_get_items_metadata_batch(
    app: AppHandle,
    ids: Vec<String>,
) -> Result<Vec<(String, ItemMetadata)>, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        let started = std::time::Instant::now();
        let n = ids.len();
        let services = app.state::<AppServices>();
        let r = services.metadata.get_items_metadata_batch(&ids);
        log::debug!(
            "[cmd-timing] cmd_get_items_metadata_batch {:.1}ms (ids={})",
            started.elapsed().as_secs_f64() * 1000.0,
            n
        );
        r
    })
    .await
    .map_err(|e| AppError::Io(std::io::Error::other(format!("spawn_blocking failed: {e}"))))?
}
