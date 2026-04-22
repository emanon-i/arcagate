mod commands;
pub mod db;
mod launcher;
pub mod models;
#[allow(dead_code)]
mod plugin_api;
mod repositories;
pub mod services;
pub mod utils;
pub mod watcher;

use commands::config_commands::{
    cmd_get_autostart, cmd_get_config, cmd_get_hotkey, cmd_is_setup_complete,
    cmd_mark_setup_complete, cmd_set_autostart, cmd_set_config, cmd_set_hotkey,
};
use commands::export_commands::{cmd_export_json, cmd_import_json};
use commands::item_commands::{
    cmd_auto_register_folder_items, cmd_check_is_directory, cmd_count_hidden_items,
    cmd_create_item, cmd_create_tag, cmd_delete_item, cmd_delete_tag, cmd_extract_item_icon,
    cmd_get_item_tags, cmd_get_library_stats, cmd_get_tag_counts, cmd_get_tags, cmd_list_items,
    cmd_search_items, cmd_search_items_in_tag, cmd_update_item, cmd_update_tag,
    cmd_update_tag_prefix,
};
use commands::launch_commands::{
    cmd_get_item_stats, cmd_launch_item, cmd_list_frequent, cmd_list_recent,
};
use commands::theme_commands::{
    cmd_create_theme, cmd_delete_theme, cmd_export_theme_json, cmd_get_active_theme_mode,
    cmd_get_theme, cmd_import_theme_json, cmd_list_themes, cmd_set_active_theme_mode,
    cmd_update_theme,
};
use commands::watched_path_commands::{
    cmd_add_watched_path, cmd_get_watched_paths, cmd_remove_watched_path,
};
use commands::workspace_commands::{
    cmd_add_widget, cmd_create_workspace, cmd_delete_workspace, cmd_get_folder_items,
    cmd_get_frequent_items, cmd_get_recent_items, cmd_git_status, cmd_list_widgets,
    cmd_list_workspaces, cmd_remove_widget, cmd_update_widget_config, cmd_update_widget_position,
    cmd_update_workspace,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Listener, Manager, WindowEvent,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let main_visible = app
                            .get_webview_window("main")
                            .and_then(|w| w.is_visible().ok())
                            .unwrap_or(false);

                        if main_visible {
                            // メインウィンドウ表示中 → インラインパレットを開く
                            app.emit("hotkey-triggered", ()).ok();
                        } else if let Some(palette) = app.get_webview_window("palette") {
                            // メインウィンドウ非表示 → フローティングパレット
                            let is_visible = palette.is_visible().unwrap_or(false);
                            if is_visible {
                                let _ = palette.hide();
                            } else {
                                let _ = palette.show();
                                let _ = palette.set_focus();
                                palette.emit("palette-open", ()).ok();
                            }
                        }
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

            // E2E テスト時は ARCAGATE_DB_PATH 環境変数で DB パスを上書きできる
            let db_path = std::env::var("ARCAGATE_DB_PATH")
                .map(std::path::PathBuf::from)
                .unwrap_or_else(|_| app_data_dir.join("arcagate.db"));
            let db_state = db::initialize(
                db_path
                    .to_str()
                    .expect("database path contains non-UTF-8 characters"),
            )
            .expect("failed to initialize database");
            app.manage(db_state);

            // sys:starred など必須システムタグの初期化（べき等）
            {
                let db_state = app.state::<db::DbState>();
                let _ = services::item_service::ensure_system_tags(&db_state);
            }

            // ファイルシステム監視 (DB manage 後に起動)
            let watcher_state = watcher::start_watcher(app.handle());
            app.manage(watcher_state);

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

            // palette-close イベント: フロントエンドから palette ウィンドウを非表示にする
            let app_handle = app.handle().clone();
            app.listen("palette-close", move |_| {
                if let Some(palette) = app_handle.get_webview_window("palette") {
                    let _ = palette.hide();
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            let label = window.label();
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    // ウィンドウを閉じる代わりに非表示にしてトレイに残す
                    api.prevent_close();
                    let _ = window.hide();
                }
                WindowEvent::Focused(false) if label == "palette" => {
                    // パレットウィンドウのフォーカスアウト → 非表示
                    let _ = window.hide();
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            cmd_create_item,
            cmd_list_items,
            cmd_search_items,
            cmd_search_items_in_tag,
            cmd_update_item,
            cmd_delete_item,
            cmd_get_tags,
            cmd_create_tag,
            cmd_update_tag,
            cmd_update_tag_prefix,
            cmd_delete_tag,
            cmd_get_tag_counts,
            cmd_get_item_tags,
            cmd_check_is_directory,
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
            cmd_export_json,
            cmd_import_json,
            cmd_add_watched_path,
            cmd_get_watched_paths,
            cmd_remove_watched_path,
            cmd_create_workspace,
            cmd_list_workspaces,
            cmd_update_workspace,
            cmd_delete_workspace,
            cmd_add_widget,
            cmd_list_widgets,
            cmd_update_widget_position,
            cmd_update_widget_config,
            cmd_remove_widget,
            cmd_get_frequent_items,
            cmd_get_recent_items,
            cmd_get_folder_items,
            cmd_git_status,
            cmd_get_library_stats,
            cmd_count_hidden_items,
            cmd_auto_register_folder_items,
            cmd_get_item_stats,
            cmd_list_themes,
            cmd_get_theme,
            cmd_create_theme,
            cmd_update_theme,
            cmd_delete_theme,
            cmd_get_active_theme_mode,
            cmd_set_active_theme_mode,
            cmd_export_theme_json,
            cmd_import_theme_json,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
