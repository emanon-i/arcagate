use arcagate_lib::{
    db,
    models::{
        item::{CreateItemInput, Item, ItemType, UpdateItemInput},
        launch::{ItemStats, LaunchLog},
        workspace::{
            AddWidgetInput, CreateWorkspaceInput, UpdateWidgetPositionInput, WidgetType, Workspace,
            WorkspaceWidget,
        },
    },
    services::{config_service, export_service, item_service, launch_service, workspace_service},
    utils::error::AppError,
};
use clap::{Parser, Subcommand};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "arcagate", about = "Arcagate command-line interface", version)]
struct Cli {
    /// Override database file path
    #[arg(long, global = true)]
    db: Option<PathBuf>,

    /// Output as JSON
    #[arg(long, global = true)]
    json: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// List all items
    List,
    /// Search items by name or memo
    Search {
        /// Search query (partial match)
        query: String,
    },
    /// Launch an item by name
    Run {
        /// Item name (exact match preferred, falls back to partial match)
        name: String,
        /// Validate only, don't actually launch
        #[arg(long)]
        dry_run: bool,
    },
    /// Create a new item
    Create {
        /// Item type (exe|url|folder|script|command)
        item_type: Option<String>,
        /// Display name
        label: Option<String>,
        /// Path, URL, or command
        target: Option<String>,
        /// JSON input as alternative to positional args
        #[arg(long)]
        json_input: Option<String>,
        /// Validate only, don't create
        #[arg(long)]
        dry_run: bool,
    },
    /// Describe commands and their parameters (schema introspection for agents)
    Describe {
        /// Command name to describe (omit for overview)
        command: Option<String>,
    },
    /// Update an item (partial update via JSON)
    Update {
        /// Item UUID
        id: String,
        /// JSON input with fields to update
        #[arg(long)]
        json_input: String,
        /// Validate only, don't update
        #[arg(long)]
        dry_run: bool,
    },
    /// Delete an item
    Delete {
        /// Item UUID
        id: String,
    },
    /// Export all data to JSON file
    Export {
        /// Output file path
        path: String,
    },
    /// Import data from JSON file
    Import {
        /// Input file path
        path: String,
        /// Validate only, don't import
        #[arg(long)]
        dry_run: bool,
    },
    /// Show recently launched items
    Recent {
        /// Max number of results (default: 10)
        #[arg(long, default_value = "10")]
        limit: i64,
    },
    /// Show frequently launched items
    Frequent {
        /// Max number of results (default: 10)
        #[arg(long, default_value = "10")]
        limit: i64,
    },
    /// Configuration operations
    Config {
        #[command(subcommand)]
        command: ConfigCommands,
    },
    /// Workspace operations
    Workspace {
        #[command(subcommand)]
        command: WorkspaceCommands,
    },
}

#[derive(Subcommand)]
enum ConfigCommands {
    /// Get a config value
    Get { key: String },
    /// Set a config value
    Set { key: String, value: String },
}

#[derive(Subcommand)]
enum WorkspaceCommands {
    /// List all workspaces
    List,
    /// Create a new workspace
    Create {
        /// Workspace name
        name: String,
    },
    /// Add a widget to a workspace
    AddWidget {
        /// Workspace UUID
        workspace_id: String,
        /// Widget type (favorites|recent|projects|watched_folders)
        widget_type: String,
    },
    /// Delete a workspace
    Delete {
        /// Workspace UUID
        id: String,
    },
    /// List widgets in a workspace
    ListWidgets {
        /// Workspace UUID
        workspace_id: String,
    },
    /// Update widget position and size
    UpdateWidget {
        /// Widget UUID
        id: String,
        /// JSON input: {"position_x","position_y","width","height"}
        #[arg(long)]
        json_input: String,
    },
    /// Remove a widget
    RemoveWidget {
        /// Widget UUID
        id: String,
    },
}

#[derive(Deserialize)]
struct CreateItemJsonInput {
    item_type: String,
    label: String,
    target: String,
}

#[derive(Deserialize)]
struct UpdateItemJsonInput {
    label: Option<String>,
    target: Option<String>,
    args: Option<String>,
    working_dir: Option<String>,
    icon_path: Option<String>,
    aliases: Option<Vec<String>>,
    is_enabled: Option<bool>,
    tag_ids: Option<Vec<String>>,
}

fn main() {
    let cli = Cli::parse();

    let db_path = cli
        .db
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(default_db_path);

    // describe doesn't need DB
    if let Commands::Describe { ref command } = cli.command {
        cmd_describe(command.as_deref(), cli.json);
        return;
    }

    let db = match db::initialize(&db_path) {
        Ok(state) => state,
        Err(e) => {
            eprintln!("Error: failed to open database at {}: {}", db_path, e);
            std::process::exit(1);
        }
    };

    let result = match &cli.command {
        Commands::List => cmd_list(&db, cli.json),
        Commands::Search { query } => cmd_search(&db, query, cli.json),
        Commands::Run { name, dry_run } => cmd_run(&db, name, *dry_run),
        Commands::Create {
            item_type,
            label,
            target,
            json_input,
            dry_run,
        } => cmd_create(
            &db,
            item_type.as_deref(),
            label.as_deref(),
            target.as_deref(),
            json_input.as_deref(),
            *dry_run,
            cli.json,
        ),
        Commands::Update {
            id,
            json_input,
            dry_run,
        } => cmd_update(&db, id, json_input, *dry_run, cli.json),
        Commands::Delete { id } => cmd_delete(&db, id, cli.json),
        Commands::Export { path } => cmd_export(&db, path),
        Commands::Import { path, dry_run } => cmd_import(&db, path, *dry_run),
        Commands::Recent { limit } => cmd_recent(&db, *limit, cli.json),
        Commands::Frequent { limit } => cmd_frequent(&db, *limit, cli.json),
        Commands::Config { command } => match command {
            ConfigCommands::Get { key } => cmd_config_get(&db, key, cli.json),
            ConfigCommands::Set { key, value } => cmd_config_set(&db, key, value, cli.json),
        },
        Commands::Describe { .. } => unreachable!(),
        Commands::Workspace { command } => match command {
            WorkspaceCommands::List => cmd_workspace_list(&db, cli.json),
            WorkspaceCommands::Create { name } => cmd_workspace_create(&db, name, cli.json),
            WorkspaceCommands::AddWidget {
                workspace_id,
                widget_type,
            } => cmd_workspace_add_widget(&db, workspace_id, widget_type, cli.json),
            WorkspaceCommands::Delete { id } => cmd_workspace_delete(&db, id, cli.json),
            WorkspaceCommands::ListWidgets { workspace_id } => {
                cmd_workspace_list_widgets(&db, workspace_id, cli.json)
            }
            WorkspaceCommands::UpdateWidget { id, json_input } => {
                cmd_workspace_update_widget(&db, id, json_input, cli.json)
            }
            WorkspaceCommands::RemoveWidget { id } => {
                cmd_workspace_remove_widget(&db, id, cli.json)
            }
        },
    };

    if let Err(e) = result {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}

fn default_db_path() -> String {
    let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(appdata)
        .join("com.arcagate.desktop")
        .join("arcagate.db")
        .to_string_lossy()
        .to_string()
}

// ── Input hardening ──────────────────────────────────────────────

fn validate_no_control_chars(s: &str, field: &str) -> Result<(), AppError> {
    if s.bytes().any(|b| b < 0x20) {
        return Err(AppError::Validation(format!(
            "{} contains control characters",
            field
        )));
    }
    Ok(())
}

fn validate_no_path_traversal(path: &str) -> Result<(), AppError> {
    let normalized = path.replace('\\', "/");
    for component in normalized.split('/') {
        if component == ".." {
            return Err(AppError::Validation(
                "target contains path traversal (..)".to_string(),
            ));
        }
    }
    Ok(())
}

fn validate_item_type(s: &str) -> Result<ItemType, AppError> {
    ItemType::from_str(s).ok_or_else(|| {
        AppError::Validation(format!(
            "invalid item_type '{}' (expected: exe|url|folder|script|command)",
            s
        ))
    })
}

fn validate_widget_type(s: &str) -> Result<WidgetType, AppError> {
    WidgetType::from_str(s).ok_or_else(|| {
        AppError::Validation(format!(
            "invalid widget_type '{}' (expected: favorites|recent|projects|watched_folders)",
            s
        ))
    })
}

fn validate_create_input(
    item_type_str: &str,
    label: &str,
    target: &str,
) -> Result<ItemType, AppError> {
    validate_no_control_chars(label, "label")?;
    validate_no_control_chars(target, "target")?;
    let item_type = validate_item_type(item_type_str)?;
    // Path traversal check for file-based types
    if matches!(
        item_type,
        ItemType::Exe | ItemType::Folder | ItemType::Script
    ) {
        validate_no_path_traversal(target)?;
    }
    Ok(item_type)
}

// ── Commands ─────────────────────────────────────────────────────

fn cmd_list(db: &db::DbState, json: bool) -> Result<(), AppError> {
    let items = item_service::list_items(db)?;
    print_items(&items, json);
    Ok(())
}

fn cmd_search(db: &db::DbState, query: &str, json: bool) -> Result<(), AppError> {
    let items = item_service::search_items(db, query)?;
    if items.is_empty() && !json {
        println!("No items found for \"{}\"", query);
    } else {
        print_items(&items, json);
    }
    Ok(())
}

fn cmd_run(db: &db::DbState, name: &str, dry_run: bool) -> Result<(), AppError> {
    validate_no_control_chars(name, "name")?;
    let items = item_service::search_items(db, name)?;

    let item = items
        .iter()
        .find(|i| i.label.to_lowercase() == name.to_lowercase())
        .or_else(|| items.first())
        .ok_or_else(|| AppError::NotFound(format!("No item found matching \"{}\"", name)))?;

    if dry_run {
        eprintln!(
            "[dry-run] Would launch: {} ({}) [{}]",
            item.label,
            item.target,
            item.item_type.as_str()
        );
        return Ok(());
    }

    eprintln!("Launching: {} ({})", item.label, item.target);
    launch_service::launch_item(db, &item.id, "cli")?;
    Ok(())
}

fn cmd_create(
    db: &db::DbState,
    item_type: Option<&str>,
    label: Option<&str>,
    target: Option<&str>,
    json_input: Option<&str>,
    dry_run: bool,
    json: bool,
) -> Result<(), AppError> {
    let (type_str, label_str, target_str) = if let Some(json_str) = json_input {
        let parsed: CreateItemJsonInput = serde_json::from_str(json_str)
            .map_err(|e| AppError::Validation(format!("invalid JSON input: {}", e)))?;
        (parsed.item_type, parsed.label, parsed.target)
    } else {
        let t = item_type
            .ok_or_else(|| {
                AppError::Validation("item_type is required (or use --json-input)".to_string())
            })?
            .to_string();
        let l = label
            .ok_or_else(|| {
                AppError::Validation("label is required (or use --json-input)".to_string())
            })?
            .to_string();
        let tgt = target
            .ok_or_else(|| {
                AppError::Validation("target is required (or use --json-input)".to_string())
            })?
            .to_string();
        (t, l, tgt)
    };

    let validated_type = validate_create_input(&type_str, &label_str, &target_str)?;

    if dry_run {
        eprintln!(
            "[dry-run] Would create: type={}, label=\"{}\", target=\"{}\"",
            type_str, label_str, target_str
        );
        return Ok(());
    }

    let input = CreateItemInput {
        item_type: validated_type,
        label: label_str,
        target: target_str,
        args: None,
        working_dir: None,
        icon_path: None,
        aliases: vec![],
        tag_ids: vec![],
        is_tracked: true,
    };

    let item = item_service::create_item(db, input)?;
    print_result(
        &item,
        json,
        &format!("Created: {} ({})", item.label, item.id),
    );
    Ok(())
}

fn cmd_workspace_list(db: &db::DbState, json: bool) -> Result<(), AppError> {
    let workspaces = workspace_service::list_workspaces(db)?;
    print_workspaces(&workspaces, json);
    Ok(())
}

fn cmd_workspace_create(db: &db::DbState, name: &str, json: bool) -> Result<(), AppError> {
    validate_no_control_chars(name, "name")?;
    let input = CreateWorkspaceInput {
        name: name.to_string(),
    };
    let ws = workspace_service::create_workspace(db, input)?;
    print_result(
        &ws,
        json,
        &format!("Created workspace: {} ({})", ws.name, ws.id),
    );
    Ok(())
}

fn cmd_workspace_add_widget(
    db: &db::DbState,
    workspace_id: &str,
    widget_type_str: &str,
    json: bool,
) -> Result<(), AppError> {
    let wt = validate_widget_type(widget_type_str)?;
    let input = AddWidgetInput {
        workspace_id: workspace_id.to_string(),
        widget_type: wt,
    };
    let widget = workspace_service::add_widget(db, input)?;
    print_result(
        &widget,
        json,
        &format!(
            "Added widget: {} to workspace {}",
            widget_type_str, workspace_id
        ),
    );
    Ok(())
}

fn cmd_workspace_list_widgets(
    db: &db::DbState,
    workspace_id: &str,
    json: bool,
) -> Result<(), AppError> {
    let widgets = workspace_service::list_widgets(db, workspace_id)?;
    print_widgets(&widgets, json);
    Ok(())
}

fn cmd_workspace_update_widget(
    db: &db::DbState,
    id: &str,
    json_input: &str,
    json: bool,
) -> Result<(), AppError> {
    let input: UpdateWidgetPositionInput = serde_json::from_str(json_input)
        .map_err(|e| AppError::Validation(format!("invalid JSON input: {}", e)))?;
    let widget = workspace_service::update_widget_position(db, id, input)?;
    print_result(&widget, json, &format!("Updated widget: {}", widget.id));
    Ok(())
}

fn cmd_workspace_remove_widget(db: &db::DbState, id: &str, json: bool) -> Result<(), AppError> {
    workspace_service::remove_widget(db, id)?;
    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(&serde_json::json!({"deleted": id})).unwrap()
        );
    } else {
        eprintln!("Removed widget: {}", id);
    }
    Ok(())
}

fn cmd_update(
    db: &db::DbState,
    id: &str,
    json_input: &str,
    dry_run: bool,
    json: bool,
) -> Result<(), AppError> {
    let parsed: UpdateItemJsonInput = serde_json::from_str(json_input)
        .map_err(|e| AppError::Validation(format!("invalid JSON input: {}", e)))?;

    if let Some(ref label) = parsed.label {
        validate_no_control_chars(label, "label")?;
    }
    if let Some(ref target) = parsed.target {
        validate_no_control_chars(target, "target")?;
    }

    if dry_run {
        eprintln!("[dry-run] Would update item: {}", id);
        return Ok(());
    }

    let input = UpdateItemInput {
        label: parsed.label,
        target: parsed.target,
        args: parsed.args,
        working_dir: parsed.working_dir,
        icon_path: parsed.icon_path,
        aliases: parsed.aliases,
        is_enabled: parsed.is_enabled,
        is_tracked: None,
        default_app: None,
        tag_ids: parsed.tag_ids,
        card_override_json: None,
    };

    let item = item_service::update_item(db, id, input)?;
    print_result(
        &item,
        json,
        &format!("Updated: {} ({})", item.label, item.id),
    );
    Ok(())
}

fn cmd_delete(db: &db::DbState, id: &str, json: bool) -> Result<(), AppError> {
    item_service::delete_item(db, id)?;
    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(&serde_json::json!({"deleted": id})).unwrap()
        );
    } else {
        eprintln!("Deleted item: {}", id);
    }
    Ok(())
}

fn cmd_workspace_delete(db: &db::DbState, id: &str, json: bool) -> Result<(), AppError> {
    workspace_service::delete_workspace(db, id)?;
    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(&serde_json::json!({"deleted": id})).unwrap()
        );
    } else {
        eprintln!("Deleted workspace: {}", id);
    }
    Ok(())
}

fn cmd_config_get(db: &db::DbState, key: &str, json: bool) -> Result<(), AppError> {
    let value = config_service::get_config(db, key)?;
    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(&serde_json::json!({"key": key, "value": value})).unwrap()
        );
    } else {
        match value {
            Some(v) => println!("{}", v),
            None => println!("(not set)"),
        }
    }
    Ok(())
}

fn cmd_config_set(db: &db::DbState, key: &str, value: &str, json: bool) -> Result<(), AppError> {
    validate_no_control_chars(key, "key")?;
    validate_no_control_chars(value, "value")?;
    config_service::set_config(db, key, value)?;
    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(&serde_json::json!({"key": key, "value": value})).unwrap()
        );
    } else {
        eprintln!("Set {}={}", key, value);
    }
    Ok(())
}

fn cmd_export(db: &db::DbState, path: &str) -> Result<(), AppError> {
    validate_no_path_traversal(path)?;
    export_service::export_json(db, path)?;
    eprintln!("Exported to: {}", path);
    Ok(())
}

fn cmd_import(db: &db::DbState, path: &str, dry_run: bool) -> Result<(), AppError> {
    validate_no_path_traversal(path)?;
    if dry_run {
        if !std::path::Path::new(path).exists() {
            return Err(AppError::Validation(format!("file not found: {}", path)));
        }
        eprintln!("[dry-run] Would import from: {}", path);
        return Ok(());
    }
    export_service::import_json(db, path)?;
    eprintln!("Imported from: {}", path);
    Ok(())
}

fn cmd_recent(db: &db::DbState, limit: i64, json: bool) -> Result<(), AppError> {
    let logs = launch_service::list_recent(db, limit)?;
    print_launch_logs(&logs, json);
    Ok(())
}

fn cmd_frequent(db: &db::DbState, limit: i64, json: bool) -> Result<(), AppError> {
    let stats = launch_service::list_frequent(db, limit)?;
    print_item_stats(&stats, json);
    Ok(())
}

// ── Describe (schema introspection) ──────────────────────────────

fn cmd_describe(command: Option<&str>, json: bool) {
    match command {
        None => describe_all(json),
        Some(name) => {
            if !describe_one(name, json) {
                eprintln!("Unknown command: {}", name);
                std::process::exit(1);
            }
        }
    }
}

fn describe_all(json: bool) {
    let commands = serde_json::json!([
        {"name": "list",      "description": "List all items"},
        {"name": "search",    "description": "Search items by name or memo"},
        {"name": "run",       "description": "Launch an item by name"},
        {"name": "create",    "description": "Create a new item"},
        {"name": "update",    "description": "Update an item (partial update via JSON)"},
        {"name": "delete",    "description": "Delete an item"},
        {"name": "recent",    "description": "Show recently launched items"},
        {"name": "frequent",  "description": "Show frequently launched items"},
        {"name": "config get",  "description": "Get a config value"},
        {"name": "config set",  "description": "Set a config value"},
        {"name": "export",    "description": "Export all data to JSON file"},
        {"name": "import",    "description": "Import data from JSON file"},
        {"name": "describe",  "description": "Describe commands (schema introspection)"},
        {"name": "workspace list",       "description": "List all workspaces"},
        {"name": "workspace create",     "description": "Create a new workspace"},
        {"name": "workspace add-widget", "description": "Add a widget to a workspace"},
        {"name": "workspace delete",       "description": "Delete a workspace"},
        {"name": "workspace list-widgets", "description": "List widgets in a workspace"},
        {"name": "workspace update-widget","description": "Update widget position and size"},
        {"name": "workspace remove-widget","description": "Remove a widget"},
    ]);

    if json {
        println!("{}", serde_json::to_string_pretty(&commands).unwrap());
    } else {
        println!("Available commands:\n");
        if let Some(arr) = commands.as_array() {
            for cmd in arr {
                println!(
                    "  {:<25} {}",
                    cmd["name"].as_str().unwrap_or(""),
                    cmd["description"].as_str().unwrap_or("")
                );
            }
        }
        println!("\nUse 'arcagate describe <command>' for details.");
    }
}

fn describe_one(name: &str, json: bool) -> bool {
    let schema = match name {
        "list" => serde_json::json!({
            "name": "list",
            "description": "List all items",
            "parameters": [],
            "flags": [
                {"name": "--json", "description": "Output as JSON"}
            ]
        }),
        "search" => serde_json::json!({
            "name": "search",
            "description": "Search items by name or memo",
            "parameters": [
                {"name": "query", "type": "string", "required": true,
                 "description": "Search query (partial match on label and target)"}
            ],
            "flags": [
                {"name": "--json", "description": "Output as JSON"}
            ]
        }),
        "run" => serde_json::json!({
            "name": "run",
            "description": "Launch an item by name (exact match preferred, partial fallback)",
            "parameters": [
                {"name": "name", "type": "string", "required": true,
                 "description": "Item name to launch"}
            ],
            "flags": [
                {"name": "--dry-run", "description": "Validate only, don't launch"}
            ]
        }),
        "create" => serde_json::json!({
            "name": "create",
            "description": "Create a new item",
            "parameters": [
                {"name": "item_type", "type": "string", "required": true,
                 "enum": ["exe", "url", "folder", "script", "command"],
                 "description": "Type of item"},
                {"name": "label", "type": "string", "required": true,
                 "description": "Display name"},
                {"name": "target", "type": "string", "required": true,
                 "description": "Path, URL, or command"}
            ],
            "flags": [
                {"name": "--json-input", "type": "string",
                 "description": "JSON input as alternative to positional args: {\"item_type\",\"label\",\"target\"}"},
                {"name": "--dry-run", "description": "Validate only, don't create"},
                {"name": "--json", "description": "Output as JSON"}
            ]
        }),
        "describe" => serde_json::json!({
            "name": "describe",
            "description": "Describe commands and parameters (schema introspection)",
            "parameters": [
                {"name": "command", "type": "string", "required": false,
                 "description": "Command name (omit for overview)"}
            ],
            "flags": [
                {"name": "--json", "description": "Output as JSON"}
            ]
        }),
        "update" => serde_json::json!({
            "name": "update",
            "description": "Update an item (partial update via JSON)",
            "parameters": [
                {"name": "id", "type": "string", "required": true,
                 "description": "Item UUID"}
            ],
            "flags": [
                {"name": "--json-input", "type": "string", "required": true,
                 "description": "JSON with fields to update: {\"label\",\"target\",\"args\",\"working_dir\",\"icon_path\",\"aliases\",\"is_enabled\",\"tag_ids\"} (all optional)"},
                {"name": "--dry-run", "description": "Validate only, don't update"},
                {"name": "--json", "description": "Output as JSON"}
            ]
        }),
        "delete" => serde_json::json!({
            "name": "delete",
            "description": "Delete an item",
            "parameters": [
                {"name": "id", "type": "string", "required": true,
                 "description": "Item UUID"}
            ],
            "flags": [
                {"name": "--json", "description": "Output as JSON"}
            ]
        }),
        "recent" => serde_json::json!({
            "name": "recent",
            "description": "Show recently launched items",
            "parameters": [],
            "flags": [
                {"name": "--limit", "type": "integer", "default": 10,
                 "description": "Max number of results"},
                {"name": "--json", "description": "Output as JSON"}
            ]
        }),
        "frequent" => serde_json::json!({
            "name": "frequent",
            "description": "Show frequently launched items",
            "parameters": [],
            "flags": [
                {"name": "--limit", "type": "integer", "default": 10,
                 "description": "Max number of results"},
                {"name": "--json", "description": "Output as JSON"}
            ]
        }),
        "config get" | "config-get" => serde_json::json!({
            "name": "config get",
            "description": "Get a config value",
            "parameters": [
                {"name": "key", "type": "string", "required": true,
                 "description": "Config key"}
            ],
            "flags": [
                {"name": "--json", "description": "Output as JSON"}
            ]
        }),
        "config set" | "config-set" => serde_json::json!({
            "name": "config set",
            "description": "Set a config value",
            "parameters": [
                {"name": "key", "type": "string", "required": true,
                 "description": "Config key"},
                {"name": "value", "type": "string", "required": true,
                 "description": "Config value"}
            ],
            "flags": [
                {"name": "--json", "description": "Output as JSON"}
            ]
        }),
        "export" => serde_json::json!({
            "name": "export",
            "description": "Export all data to JSON file",
            "parameters": [
                {"name": "path", "type": "string", "required": true,
                 "description": "Output file path"}
            ],
            "flags": []
        }),
        "import" => serde_json::json!({
            "name": "import",
            "description": "Import data from JSON file",
            "parameters": [
                {"name": "path", "type": "string", "required": true,
                 "description": "Input file path"}
            ],
            "flags": [
                {"name": "--dry-run", "description": "Validate only, don't import"}
            ]
        }),
        "workspace list" | "workspace-list" => serde_json::json!({
            "name": "workspace list",
            "description": "List all workspaces",
            "parameters": [],
            "flags": [
                {"name": "--json", "description": "Output as JSON"}
            ]
        }),
        "workspace create" | "workspace-create" => serde_json::json!({
            "name": "workspace create",
            "description": "Create a new workspace",
            "parameters": [
                {"name": "name", "type": "string", "required": true,
                 "description": "Workspace name"}
            ],
            "flags": [
                {"name": "--json", "description": "Output as JSON"}
            ]
        }),
        "workspace add-widget" | "workspace-add-widget" => serde_json::json!({
            "name": "workspace add-widget",
            "description": "Add a widget to a workspace",
            "parameters": [
                {"name": "workspace_id", "type": "string", "required": true,
                 "description": "Workspace UUID"},
                {"name": "widget_type", "type": "string", "required": true,
                 "enum": ["favorites", "recent", "projects", "watched_folders"],
                 "description": "Widget type to add"}
            ],
            "flags": [
                {"name": "--json", "description": "Output as JSON"}
            ]
        }),
        "workspace delete" | "workspace-delete" => serde_json::json!({
            "name": "workspace delete",
            "description": "Delete a workspace",
            "parameters": [
                {"name": "id", "type": "string", "required": true,
                 "description": "Workspace UUID"}
            ],
            "flags": [
                {"name": "--json", "description": "Output as JSON"}
            ]
        }),
        "workspace list-widgets" | "workspace-list-widgets" => serde_json::json!({
            "name": "workspace list-widgets",
            "description": "List widgets in a workspace",
            "parameters": [
                {"name": "workspace_id", "type": "string", "required": true,
                 "description": "Workspace UUID"}
            ],
            "flags": [
                {"name": "--json", "description": "Output as JSON"}
            ]
        }),
        "workspace update-widget" | "workspace-update-widget" => serde_json::json!({
            "name": "workspace update-widget",
            "description": "Update widget position and size",
            "parameters": [
                {"name": "id", "type": "string", "required": true,
                 "description": "Widget UUID"}
            ],
            "flags": [
                {"name": "--json-input", "type": "string", "required": true,
                 "description": "JSON: {\"position_x\",\"position_y\",\"width\",\"height\"} (all required, integer)"},
                {"name": "--json", "description": "Output as JSON"}
            ]
        }),
        "workspace remove-widget" | "workspace-remove-widget" => serde_json::json!({
            "name": "workspace remove-widget",
            "description": "Remove a widget",
            "parameters": [
                {"name": "id", "type": "string", "required": true,
                 "description": "Widget UUID"}
            ],
            "flags": [
                {"name": "--json", "description": "Output as JSON"}
            ]
        }),
        _ => return false,
    };

    if json {
        println!("{}", serde_json::to_string_pretty(&schema).unwrap());
    } else {
        println!("Command: {}\n", schema["name"].as_str().unwrap_or(""));
        println!("  {}", schema["description"].as_str().unwrap_or(""));
        if let Some(params) = schema["parameters"].as_array() {
            if !params.is_empty() {
                println!("\nParameters:");
                for p in params {
                    let req = if p["required"].as_bool().unwrap_or(false) {
                        " (required)"
                    } else {
                        " (optional)"
                    };
                    print!(
                        "  {:<20} {}{}",
                        p["name"].as_str().unwrap_or(""),
                        p["type"].as_str().unwrap_or(""),
                        req
                    );
                    if let Some(vals) = p["enum"].as_array() {
                        let enum_str: Vec<&str> = vals.iter().filter_map(|v| v.as_str()).collect();
                        print!("  [{}]", enum_str.join("|"));
                    }
                    println!();
                }
            }
        }
        if let Some(flags) = schema["flags"].as_array() {
            if !flags.is_empty() {
                println!("\nFlags:");
                for f in flags {
                    println!(
                        "  {:<20} {}",
                        f["name"].as_str().unwrap_or(""),
                        f["description"].as_str().unwrap_or("")
                    );
                }
            }
        }
    }
    true
}

fn print_result<T: serde::Serialize>(value: &T, json: bool, message: &str) {
    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(value).unwrap_or_else(|_| "{}".to_string())
        );
    } else {
        eprintln!("{}", message);
    }
}

// ── Display helpers ──────────────────────────────────────────────

fn print_items(items: &[Item], json: bool) {
    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(items).unwrap_or_else(|_| "[]".to_string())
        );
        return;
    }

    if items.is_empty() {
        println!("(no items)");
        return;
    }

    const ID_W: usize = 8;
    const LABEL_W: usize = 30;
    const TYPE_W: usize = 10;
    const TARGET_W: usize = 48;
    const SEP: usize = ID_W + LABEL_W + TYPE_W + TARGET_W + 8;

    println!(
        "{:<ID_W$}  {:<LABEL_W$}  {:<TYPE_W$}  {:<TARGET_W$}",
        "ID(abbr)", "NAME", "TYPE", "TARGET"
    );
    println!("{}", "-".repeat(SEP));

    for item in items {
        let id_short = if item.id.len() >= ID_W {
            &item.id[item.id.len() - ID_W..]
        } else {
            &item.id
        };
        let label = truncate(&item.label, LABEL_W);
        let type_str = item.item_type.as_str();
        let target = truncate(&item.target, TARGET_W);

        println!(
            "{:<ID_W$}  {:<LABEL_W$}  {:<TYPE_W$}  {:<TARGET_W$}",
            id_short, label, type_str, target
        );
    }

    println!("\n{} item(s)", items.len());
}

fn print_workspaces(workspaces: &[Workspace], json: bool) {
    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(workspaces).unwrap_or_else(|_| "[]".to_string())
        );
        return;
    }

    if workspaces.is_empty() {
        println!("(no workspaces)");
        return;
    }

    const ID_W: usize = 8;
    const NAME_W: usize = 30;
    const SEP: usize = ID_W + NAME_W + 4;

    println!("{:<ID_W$}  {:<NAME_W$}", "ID(abbr)", "NAME");
    println!("{}", "-".repeat(SEP));

    for ws in workspaces {
        let id_short = if ws.id.len() >= ID_W {
            &ws.id[ws.id.len() - ID_W..]
        } else {
            &ws.id
        };
        println!(
            "{:<ID_W$}  {:<NAME_W$}",
            id_short,
            truncate(&ws.name, NAME_W)
        );
    }

    println!("\n{} workspace(s)", workspaces.len());
}

fn print_widgets(widgets: &[WorkspaceWidget], json: bool) {
    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(widgets).unwrap_or_else(|_| "[]".to_string())
        );
        return;
    }

    if widgets.is_empty() {
        println!("(no widgets)");
        return;
    }

    const ID_W: usize = 8;
    const TYPE_W: usize = 18;
    const POS_W: usize = 12;
    const SIZE_W: usize = 12;
    const SEP: usize = ID_W + TYPE_W + POS_W + SIZE_W + 8;

    println!(
        "{:<ID_W$}  {:<TYPE_W$}  {:<POS_W$}  {:<SIZE_W$}",
        "ID(abbr)", "TYPE", "POSITION", "SIZE"
    );
    println!("{}", "-".repeat(SEP));

    for w in widgets {
        let id_short = if w.id.len() >= ID_W {
            &w.id[w.id.len() - ID_W..]
        } else {
            &w.id
        };
        let pos = format!("{},{}", w.position_x, w.position_y);
        let size = format!("{}x{}", w.width, w.height);
        println!(
            "{:<ID_W$}  {:<TYPE_W$}  {:<POS_W$}  {:<SIZE_W$}",
            id_short,
            w.widget_type.as_str(),
            pos,
            size
        );
    }

    println!("\n{} widget(s)", widgets.len());
}

fn print_launch_logs(logs: &[LaunchLog], json: bool) {
    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(logs).unwrap_or_else(|_| "[]".to_string())
        );
        return;
    }

    if logs.is_empty() {
        println!("(no recent launches)");
        return;
    }

    const ID_W: usize = 8;
    const ITEM_ID_W: usize = 8;
    const TIME_W: usize = 20;
    const SRC_W: usize = 8;
    const SEP: usize = ID_W + ITEM_ID_W + TIME_W + SRC_W + 8;

    println!(
        "{:<ID_W$}  {:<ITEM_ID_W$}  {:<TIME_W$}  {:<SRC_W$}",
        "ID(abbr)", "ITEM", "LAUNCHED_AT", "SOURCE"
    );
    println!("{}", "-".repeat(SEP));

    for log in logs {
        let id_short = if log.id.len() >= ID_W {
            &log.id[log.id.len() - ID_W..]
        } else {
            &log.id
        };
        let item_short = if log.item_id.len() >= ITEM_ID_W {
            &log.item_id[log.item_id.len() - ITEM_ID_W..]
        } else {
            &log.item_id
        };
        println!(
            "{:<ID_W$}  {:<ITEM_ID_W$}  {:<TIME_W$}  {:<SRC_W$}",
            id_short,
            item_short,
            truncate(&log.launched_at, TIME_W),
            log.launch_source
        );
    }

    println!("\n{} log(s)", logs.len());
}

fn print_item_stats(stats: &[ItemStats], json: bool) {
    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(stats).unwrap_or_else(|_| "[]".to_string())
        );
        return;
    }

    if stats.is_empty() {
        println!("(no launch stats)");
        return;
    }

    const ID_W: usize = 8;
    const COUNT_W: usize = 8;
    const TIME_W: usize = 20;
    const SEP: usize = ID_W + COUNT_W + TIME_W + 6;

    println!(
        "{:<ID_W$}  {:<COUNT_W$}  {:<TIME_W$}",
        "ITEM", "COUNT", "LAST_LAUNCHED"
    );
    println!("{}", "-".repeat(SEP));

    for s in stats {
        let id_short = if s.item_id.len() >= ID_W {
            &s.item_id[s.item_id.len() - ID_W..]
        } else {
            &s.item_id
        };
        let last = s.last_launched_at.as_deref().unwrap_or("-");
        println!(
            "{:<ID_W$}  {:<COUNT_W$}  {:<TIME_W$}",
            id_short,
            s.launch_count,
            truncate(last, TIME_W)
        );
    }

    println!("\n{} item(s)", stats.len());
}

fn truncate(s: &str, max_len: usize) -> String {
    let char_count = s.chars().count();
    if char_count <= max_len {
        s.to_string()
    } else {
        let truncated: String = s.chars().take(max_len - 3).collect();
        format!("{}...", truncated)
    }
}

// ── Tests ────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── Input hardening ──────────────────────────────────────────

    #[test]
    fn test_control_chars_rejected_in_label() {
        let result = validate_no_control_chars("hello\x00world", "label");
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("control characters"));
    }

    #[test]
    fn test_control_chars_rejected_tab() {
        let result = validate_no_control_chars("hello\tworld", "label");
        assert!(result.is_err());
    }

    #[test]
    fn test_control_chars_ok_for_normal_text() {
        assert!(validate_no_control_chars("Hello World 123!", "label").is_ok());
    }

    #[test]
    fn test_path_traversal_rejected() {
        assert!(validate_no_path_traversal("../../.ssh/id_rsa").is_err());
        assert!(validate_no_path_traversal("foo/../bar").is_err());
        assert!(validate_no_path_traversal("..\\Windows\\System32").is_err());
    }

    #[test]
    fn test_path_traversal_ok_for_normal_paths() {
        assert!(validate_no_path_traversal("C:\\Program Files\\app.exe").is_ok());
        assert!(validate_no_path_traversal("/usr/local/bin/app").is_ok());
        assert!(validate_no_path_traversal("relative/path/file.txt").is_ok());
    }

    #[test]
    fn test_validate_item_type_valid() {
        assert!(validate_item_type("exe").is_ok());
        assert!(validate_item_type("url").is_ok());
        assert!(validate_item_type("folder").is_ok());
        assert!(validate_item_type("script").is_ok());
        assert!(validate_item_type("command").is_ok());
    }

    #[test]
    fn test_validate_item_type_invalid() {
        let result = validate_item_type("invalid");
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("invalid item_type"));
    }

    #[test]
    fn test_validate_widget_type_valid() {
        assert!(validate_widget_type("favorites").is_ok());
        assert!(validate_widget_type("recent").is_ok());
        assert!(validate_widget_type("projects").is_ok());
        assert!(validate_widget_type("watched_folders").is_ok());
    }

    #[test]
    fn test_validate_widget_type_invalid() {
        let result = validate_widget_type("invalid");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_create_rejects_exe_with_traversal() {
        let result = validate_create_input("exe", "My App", "../../bad/path.exe");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("path traversal"));
    }

    #[test]
    fn test_validate_create_allows_url_with_dotdot() {
        // URLs can contain ".." - only file-based types are checked
        let result = validate_create_input("url", "Test", "https://example.com/../page");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_create_rejects_control_chars_in_label() {
        let result = validate_create_input("url", "bad\x01name", "https://example.com");
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("control characters"));
    }

    // ── JSON input parsing ───────────────────────────────────────

    #[test]
    fn test_json_input_parsing() {
        let json = r#"{"item_type":"url","label":"Google","target":"https://google.com"}"#;
        let parsed: CreateItemJsonInput = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.item_type, "url");
        assert_eq!(parsed.label, "Google");
        assert_eq!(parsed.target, "https://google.com");
    }

    #[test]
    fn test_json_input_invalid() {
        let json = r#"{"item_type":"url"}"#;
        let result: Result<CreateItemJsonInput, _> = serde_json::from_str(json);
        assert!(result.is_err());
    }

    // ── Describe ─────────────────────────────────────────────────

    #[test]
    fn test_update_json_input_parsing() {
        let json = r#"{"label":"New Name","target":"https://new.com"}"#;
        let parsed: UpdateItemJsonInput = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.label.as_deref(), Some("New Name"));
        assert_eq!(parsed.target.as_deref(), Some("https://new.com"));
        assert!(parsed.args.is_none());
        assert!(parsed.is_enabled.is_none());
    }

    #[test]
    fn test_update_json_input_empty() {
        let json = r#"{}"#;
        let parsed: UpdateItemJsonInput = serde_json::from_str(json).unwrap();
        assert!(parsed.label.is_none());
        assert!(parsed.target.is_none());
    }

    #[test]
    fn test_describe_known_commands() {
        assert!(describe_one("list", true));
        assert!(describe_one("search", true));
        assert!(describe_one("run", true));
        assert!(describe_one("create", true));
        assert!(describe_one("update", true));
        assert!(describe_one("delete", true));
        assert!(describe_one("recent", true));
        assert!(describe_one("frequent", true));
        assert!(describe_one("config get", true));
        assert!(describe_one("config set", true));
        assert!(describe_one("export", true));
        assert!(describe_one("import", true));
        assert!(describe_one("describe", true));
        assert!(describe_one("workspace list", true));
        assert!(describe_one("workspace create", true));
        assert!(describe_one("workspace add-widget", true));
        assert!(describe_one("workspace delete", true));
        assert!(describe_one("workspace list-widgets", true));
        assert!(describe_one("workspace update-widget", true));
        assert!(describe_one("workspace remove-widget", true));
    }

    #[test]
    fn test_describe_unknown_command() {
        assert!(!describe_one("nonexistent", true));
    }

    // ── Display helpers ──────────────────────────────────────────

    // ── UpdateWidgetPositionInput parsing ───────────────────────

    #[test]
    fn test_update_widget_json_input_parsing() {
        let json = r#"{"position_x":1,"position_y":2,"width":4,"height":3}"#;
        let parsed: UpdateWidgetPositionInput = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.position_x, 1);
        assert_eq!(parsed.position_y, 2);
        assert_eq!(parsed.width, 4);
        assert_eq!(parsed.height, 3);
    }

    #[test]
    fn test_update_widget_json_input_invalid() {
        // Missing required field (height)
        let json = r#"{"position_x":1,"position_y":2,"width":4}"#;
        let result: Result<UpdateWidgetPositionInput, _> = serde_json::from_str(json);
        assert!(result.is_err());
    }

    // ── Display helpers ──────────────────────────────────────────

    #[test]
    fn test_truncate_short_string() {
        assert_eq!(truncate("hello", 10), "hello");
    }

    #[test]
    fn test_truncate_long_string() {
        let result = truncate("this is a long string", 10);
        assert_eq!(result, "this is...");
    }
}
