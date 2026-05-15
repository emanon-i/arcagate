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

use commands::bookmark_commands::cmd_parse_bookmark_file;
use commands::config_commands::{
    cmd_get_autostart, cmd_get_config, cmd_get_hotkey, cmd_is_onboarding_complete,
    cmd_is_setup_complete, cmd_mark_onboarding_complete, cmd_mark_setup_complete,
    cmd_set_autostart, cmd_set_config, cmd_set_hotkey,
};
use commands::exe_scanner_commands::cmd_scan_exe_folders;
use commands::export_commands::{cmd_export_json, cmd_import_json};
use commands::file_preview_commands::cmd_read_file_preview;
use commands::file_search_commands::{cmd_cancel_file_search, cmd_list_files, cmd_open_path};
use commands::image_scrap_commands::cmd_save_image_scrap;
use commands::item_commands::{
    cmd_auto_register_folder_items, cmd_bulk_add_tag, cmd_bulk_delete_items, cmd_bulk_remove_tag,
    cmd_check_is_directory, cmd_count_hidden_items, cmd_count_item_references, cmd_create_item,
    cmd_create_tag, cmd_delete_item, cmd_delete_tag, cmd_extract_item_icon, cmd_get_item_tags,
    cmd_get_library_stats, cmd_get_tag_counts, cmd_get_tags, cmd_list_items, cmd_register_exe_item,
    cmd_register_exe_items_bulk, cmd_search_items, cmd_search_items_in_tag, cmd_toggle_star,
    cmd_update_item, cmd_update_tag, cmd_update_tag_prefix,
};
use commands::kill_switch_commands::cmd_check_kill_switch;
use commands::launch_commands::{
    cmd_get_item_stats, cmd_launch_item, cmd_list_frequent, cmd_list_recent, cmd_reveal_in_explorer,
};
use commands::metadata_commands::{cmd_get_item_metadata, cmd_get_items_metadata_batch};
use commands::opener_commands::{
    cmd_delete_opener, cmd_launch_with_opener, cmd_list_openers, cmd_save_opener,
};
use commands::system_monitor_commands::{
    cmd_get_disk_stats, cmd_get_network_stats, cmd_get_system_stats,
};
use commands::theme_commands::{
    cmd_create_theme, cmd_delete_theme, cmd_export_theme_json, cmd_get_active_theme_mode,
    cmd_get_theme, cmd_import_theme_json, cmd_list_themes, cmd_set_active_theme_mode,
    cmd_update_theme,
};
use commands::url_commands::cmd_fetch_url_title;
use commands::watched_path_commands::{
    cmd_add_watched_path, cmd_get_watched_paths, cmd_remove_watched_path,
};
use commands::widget_item_hides_commands::{
    cmd_add_widget_item_hide, cmd_list_widget_item_hides, cmd_remove_widget_item_hide,
};
use commands::workspace_commands::{
    cmd_add_widget, cmd_create_workspace, cmd_delete_workspace, cmd_get_folder_items,
    cmd_get_frecency_items, cmd_get_frequent_items, cmd_get_git_statuses_batch,
    cmd_get_recent_items, cmd_git_status, cmd_list_widgets, cmd_list_workspaces, cmd_remove_widget,
    cmd_save_wallpaper_file, cmd_set_workspace_wallpaper, cmd_update_widget_config,
    cmd_update_widget_position, cmd_update_workspace,
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
                        // 常にフローティングパレットウィンドウを使用（main 表示状態に依存しない）
                        if let Some(palette) = app.get_webview_window("palette") {
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
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            // audit 2026-05-13 Q10: production observability runtime knob。
            // ARCAGATE_LOG_LEVEL 環境変数で Info → Debug / Trace 切替可能
            // (デフォルト Info 維持、 trouble shooting 時のみ debug 起動)。
            let log_level = std::env::var("ARCAGATE_LOG_LEVEL")
                .ok()
                .and_then(|s| match s.to_lowercase().as_str() {
                    "trace" => Some(log::LevelFilter::Trace),
                    "debug" => Some(log::LevelFilter::Debug),
                    "info" => Some(log::LevelFilter::Info),
                    "warn" => Some(log::LevelFilter::Warn),
                    "error" => Some(log::LevelFilter::Error),
                    _ => None,
                })
                .unwrap_or(log::LevelFilter::Info);
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log_level)
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

            // K-7 fix (2026-05-16): tauri.conf.json の static assetProtocol scope
            // (`$APPDATA/icons/**` 等) は app_data_dir が起動時に未作成の場合や
            // `$APPDATA` 展開と canonicalize_parent walk-up の組合せで Windows 上で
            // `\\?\` 付き canonical path への glob match が抜ける既知の問題があり、
            // 結果 wallpaper / image-scrap widget で 403 (`asset protocol not
            // configured to allow the path`) を起こしていた (user 報告 K-7)。
            //
            // 修正: 必須 subdir を起動直後に必ず作成し、 `asset_protocol_scope().
            // allow_directory(<dir>, true)` で **canonical 後の絶対 path** をその場で
            // pattern に追加する。 これは dir 存在前提なので canonicalize が確実に成功し、
            // glob match が漏れない (static scope の保険として併用)。
            for sub in ["icons", "wallpapers", "image-scraps"] {
                let dir = app_data_dir.join(sub);
                if let Err(e) = std::fs::create_dir_all(&dir) {
                    log::warn!("failed to ensure {} dir: {}", sub, e);
                    continue;
                }
                if let Err(e) = app.asset_protocol_scope().allow_directory(&dir, true) {
                    log::warn!(
                        "failed to register asset protocol scope for {:?}: {}",
                        dir,
                        e
                    );
                }
            }

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
            let db_arc = std::sync::Arc::new(db_state);
            app.manage(services::AppServices::new(db_arc.clone()));

            // sys:starred など必須システムタグの初期化（べき等）
            {
                let services = app.state::<services::AppServices>();
                let _ = services.item.ensure_system_tags();
            }

            // ファイルシステム監視 (DB manage 後に起動)
            let watcher_state = watcher::start_watcher(app.handle());
            app.manage(watcher_state);

            // FileSearch cancel state (PH-420 / Nielsen H3)
            app.manage(services::file_search_state::FileSearchState::default());

            // グローバルショートカット登録
            let hotkey_str = {
                let services = app.state::<services::AppServices>();
                services
                    .config
                    .get_hotkey()
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
            cmd_count_item_references,
            cmd_bulk_add_tag,
            cmd_bulk_remove_tag,
            cmd_bulk_delete_items,
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
            cmd_reveal_in_explorer,
            cmd_get_config,
            cmd_set_config,
            cmd_get_hotkey,
            cmd_set_hotkey,
            cmd_get_autostart,
            cmd_set_autostart,
            cmd_is_setup_complete,
            cmd_mark_setup_complete,
            cmd_is_onboarding_complete,
            cmd_mark_onboarding_complete,
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
            cmd_get_frecency_items,
            cmd_get_folder_items,
            cmd_git_status,
            cmd_get_git_statuses_batch,
            cmd_save_wallpaper_file,
            cmd_set_workspace_wallpaper,
            cmd_get_library_stats,
            cmd_count_hidden_items,
            cmd_toggle_star,
            cmd_auto_register_folder_items,
            cmd_register_exe_item,
            cmd_register_exe_items_bulk,
            cmd_fetch_url_title,
            cmd_parse_bookmark_file,
            cmd_save_image_scrap,
            cmd_read_file_preview,
            cmd_add_widget_item_hide,
            cmd_remove_widget_item_hide,
            cmd_list_widget_item_hides,
            cmd_get_item_stats,
            cmd_get_item_metadata,
            cmd_get_items_metadata_batch,
            cmd_scan_exe_folders,
            cmd_list_files,
            cmd_cancel_file_search,
            cmd_open_path,
            cmd_get_system_stats,
            cmd_get_disk_stats,
            cmd_get_network_stats,
            cmd_list_themes,
            cmd_get_theme,
            cmd_create_theme,
            cmd_update_theme,
            cmd_delete_theme,
            cmd_get_active_theme_mode,
            cmd_set_active_theme_mode,
            cmd_export_theme_json,
            cmd_import_theme_json,
            cmd_check_kill_switch,
            cmd_list_openers,
            cmd_save_opener,
            cmd_delete_opener,
            cmd_launch_with_opener,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
