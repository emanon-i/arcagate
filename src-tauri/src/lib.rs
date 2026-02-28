mod commands;
mod db;
mod launcher;
mod models;
#[allow(dead_code)]
mod plugin_api;
mod repositories;
mod services;
#[allow(dead_code)]
mod utils;
#[allow(dead_code)]
mod watcher;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&app_data_dir)?;

            let db_path = app_data_dir.join("arcagate.db");
            let db_state =
                db::initialize(db_path.to_str().unwrap()).expect("failed to initialize database");
            app.manage(db_state);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
