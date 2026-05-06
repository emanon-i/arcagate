use tauri::{AppHandle, Manager, State};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

use crate::services::{crash_monitor_service, AppServices};
use crate::utils::error::AppError;

#[tauri::command]
pub fn cmd_get_config(
    services: State<AppServices>,
    key: String,
) -> Result<Option<String>, AppError> {
    services.config.get_config(&key)
}

#[tauri::command]
pub fn cmd_set_config(
    services: State<AppServices>,
    key: String,
    value: String,
) -> Result<(), AppError> {
    services.config.set_config(&key, &value)
}

#[tauri::command]
pub fn cmd_get_hotkey(services: State<AppServices>) -> Result<String, AppError> {
    services.config.get_hotkey()
}

#[tauri::command]
pub fn cmd_set_hotkey(
    app: tauri::AppHandle,
    services: State<AppServices>,
    hotkey: String,
) -> Result<(), AppError> {
    // Unregister old hotkey before saving (ignore failure — may not be registered)
    if let Ok(old) = services.config.get_hotkey() {
        let _ = app.global_shortcut().unregister(old.as_str());
    }
    services.config.set_hotkey(&hotkey)?;
    app.global_shortcut()
        .register(hotkey.as_str())
        .map_err(|e| AppError::InvalidInput(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub fn cmd_get_autostart(services: State<AppServices>) -> Result<bool, AppError> {
    services.config.get_autostart()
}

#[tauri::command]
pub fn cmd_set_autostart(services: State<AppServices>, enabled: bool) -> Result<(), AppError> {
    services.config.set_autostart(enabled)
}

#[tauri::command]
pub fn cmd_is_setup_complete(services: State<AppServices>) -> Result<bool, AppError> {
    services.config.is_setup_complete()
}

#[tauri::command]
pub fn cmd_mark_setup_complete(services: State<AppServices>) -> Result<(), AppError> {
    services.config.mark_setup_complete()
}

#[tauri::command]
pub fn cmd_is_onboarding_complete(services: State<AppServices>) -> Result<bool, AppError> {
    services.config.is_onboarding_complete()
}

#[tauri::command]
pub fn cmd_mark_onboarding_complete(services: State<AppServices>) -> Result<(), AppError> {
    services.config.mark_onboarding_complete()
}

// PH-465 / PH-466 batch-106: Telemetry / Crash 監視 Opt-in
#[tauri::command]
pub fn cmd_get_telemetry_opt_in(services: State<AppServices>) -> Result<bool, AppError> {
    services.config.get_telemetry_opt_in()
}

#[tauri::command]
pub fn cmd_set_telemetry_opt_in(
    services: State<AppServices>,
    enabled: bool,
) -> Result<(), AppError> {
    services.config.set_telemetry_opt_in(enabled)
}

#[tauri::command]
pub fn cmd_get_crash_report_opt_in(services: State<AppServices>) -> Result<bool, AppError> {
    services.config.get_crash_report_opt_in()
}

#[tauri::command]
pub fn cmd_set_crash_report_opt_in(
    services: State<AppServices>,
    enabled: bool,
) -> Result<(), AppError> {
    services.config.set_crash_report_opt_in(enabled)
}

/// R10-D E1: 直前 panic 情報を APPDATA/last-panic.json から read + 削除する。
/// 起動直後に frontend から呼び、未読の panic を user に提示する (toast)。
/// panic 無し → null、有り → JSON 文字列。
#[tauri::command]
pub fn cmd_consume_last_panic(app: AppHandle) -> Result<Option<String>, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Io(std::io::Error::other(e.to_string())))?;
    Ok(crash_monitor_service::consume_last_panic(&app_data_dir))
}
