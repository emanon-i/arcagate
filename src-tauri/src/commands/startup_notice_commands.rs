use tauri::State;

use crate::services::startup_notice::StartupNotices;

/// PH-PQ-100 T4: 起動時 self-recovery 通知を取得してクリアする。
///
/// frontend は mount 直後に 1 度だけ呼び、 返ってきた notice code ごとに toast を出す。
/// 失敗しても起動を止めないよう Result ではなく `Vec<String>` を直接返す。
#[tauri::command]
pub fn cmd_take_startup_notices(notices: State<StartupNotices>) -> Vec<String> {
    notices.take()
}
