mod server;
pub mod tools;

use crate::db::DbState;
use crate::utils::error::AppError;

/// stdio JSON-RPC 2.0 ループを起動する
pub fn run_mcp_server(db: &DbState) {
    eprintln!("[arcagate mcp] starting server (stdio JSON-RPC 2.0)");
    server::run_loop(db);
    eprintln!("[arcagate mcp] server stopped");
}

/// Claude Desktop と Claude Code の設定ファイルを更新する
pub fn setup_config() -> Result<(), AppError> {
    let exe = std::env::current_exe()?;
    let exe_path = exe.to_string_lossy().to_string();

    // Windows: %APPDATA%\Claude\claude_desktop_config.json
    if let Ok(appdata) = std::env::var("APPDATA") {
        let config_dir = std::path::PathBuf::from(&appdata).join("Claude");
        std::fs::create_dir_all(&config_dir)?;
        let config_path = config_dir.join("claude_desktop_config.json");
        update_mcp_config(&config_path, &exe_path)?;
    }

    // Claude Code: ~/.claude.json (USERPROFILE on Windows)
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());
    let claude_code_path = std::path::PathBuf::from(&home).join(".claude.json");
    update_mcp_config(&claude_code_path, &exe_path)?;

    Ok(())
}

fn update_mcp_config(config_path: &std::path::Path, exe_path: &str) -> Result<(), AppError> {
    // TOCTOU 回避: exists() チェックなしで直接読み込み。NotFound なら空 JSON として扱う
    let mut config: serde_json::Value = match std::fs::read_to_string(config_path) {
        Ok(content) => serde_json::from_str(&content).map_err(|e| {
            eprintln!("[setup] failed to parse {}: {}", config_path.display(), e);
            AppError::InvalidInput(e.to_string())
        })?,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => serde_json::json!({}),
        Err(e) => return Err(AppError::Io(e)),
    };

    // バックアップ作成（NotFound は無視: ファイルが新規作成の場合）
    let bak_path = config_path.with_extension("json.bak");
    match std::fs::copy(config_path, &bak_path) {
        Ok(_) => eprintln!("[setup] backup created: {}", bak_path.display()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
        Err(e) => return Err(AppError::Io(e)),
    }

    // mcpServers エントリを更新
    if !config.is_object() {
        config = serde_json::json!({});
    }
    let mcp_servers = config
        .as_object_mut()
        .unwrap()
        .entry("mcpServers")
        .or_insert_with(|| serde_json::json!({}));

    mcp_servers["arcagate"] = serde_json::json!({
        "command": exe_path,
        "args": ["mcp"]
    });

    let new_content =
        serde_json::to_string_pretty(&config).map_err(|e| AppError::InvalidInput(e.to_string()))?;
    std::fs::write(config_path, new_content)?;
    eprintln!("[setup] updated: {}", config_path.display());

    Ok(())
}
