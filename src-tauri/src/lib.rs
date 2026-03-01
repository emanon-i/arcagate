mod commands;
pub mod db;
mod launcher;
pub mod models;
#[allow(dead_code)]
mod plugin_api;
mod repositories;
pub mod services;
pub mod utils;
#[allow(dead_code)]
mod watcher;

use commands::config_commands::{
    cmd_get_autostart, cmd_get_config, cmd_get_hotkey, cmd_is_setup_complete,
    cmd_mark_setup_complete, cmd_set_autostart, cmd_set_config, cmd_set_hidden_password,
    cmd_set_hotkey, cmd_verify_hidden_password,
};
use commands::export_commands::{cmd_export_json, cmd_import_json};
use commands::item_commands::{
    cmd_create_category, cmd_create_item, cmd_create_tag, cmd_delete_category, cmd_delete_item,
    cmd_delete_tag, cmd_extract_item_icon, cmd_get_categories, cmd_get_tags, cmd_list_items,
    cmd_search_items, cmd_search_items_in_category, cmd_update_category, cmd_update_item,
    cmd_update_tag,
};
use commands::launch_commands::{cmd_launch_item, cmd_list_frequent, cmd_list_recent};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                        app.emit("hotkey-triggered", ()).ok();
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let mut log_targets = vec![tauri_plugin_log::Target::new(
                tauri_plugin_log::TargetKind::LogDir {
                    file_name: Some("arcagate".into()),
                },
            )];
            if cfg!(debug_assertions) {
                log_targets.push(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ));
            }
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(7))
                    .max_file_size(5 * 1024 * 1024)
                    .targets(log_targets)
                    .build(),
            )?;

            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&app_data_dir)?;

            let db_path = app_data_dir.join("arcagate.db");
            let db_state =
                db::initialize(db_path.to_str().unwrap()).expect("failed to initialize database");
            app.manage(db_state);

            // グローバルショートカット登録
            let hotkey_str = {
                let db_state = app.state::<db::DbState>();
                services::config_service::get_hotkey(&db_state)
                    .unwrap_or_else(|_| models::config::DEFAULT_HOTKEY.to_string())
            };
            app.global_shortcut().register(hotkey_str.as_str())?;

            // システムトレイの設定
            let show_item = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // ウィンドウを閉じる代わりに非表示にしてトレイに残す
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            cmd_create_item,
            cmd_list_items,
            cmd_search_items,
            cmd_search_items_in_category,
            cmd_update_item,
            cmd_delete_item,
            cmd_get_categories,
            cmd_create_category,
            cmd_update_category,
            cmd_delete_category,
            cmd_get_tags,
            cmd_create_tag,
            cmd_update_tag,
            cmd_delete_tag,
            cmd_extract_item_icon,
            cmd_launch_item,
            cmd_list_recent,
            cmd_list_frequent,
            cmd_get_config,
            cmd_set_config,
            cmd_get_hotkey,
            cmd_set_hotkey,
            cmd_get_autostart,
            cmd_set_autostart,
            cmd_is_setup_complete,
            cmd_mark_setup_complete,
            cmd_set_hidden_password,
            cmd_verify_hidden_password,
            cmd_export_json,
            cmd_import_json,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
