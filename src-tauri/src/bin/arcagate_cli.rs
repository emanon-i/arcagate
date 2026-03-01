use arcagate_lib::{
    db,
    models::item::Item,
    services::{item_service, launch_service},
    utils::error::AppError,
};
use clap::{Parser, Subcommand};
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
    },
}

fn main() {
    let cli = Cli::parse();

    let db_path = cli
        .db
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(default_db_path);

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
        Commands::Run { name } => cmd_run(&db, name),
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

fn cmd_run(db: &db::DbState, name: &str) -> Result<(), AppError> {
    let items = item_service::search_items(db, name)?;

    // 完全一致を優先、なければ最初の部分一致
    let item = items
        .iter()
        .find(|i| i.label.to_lowercase() == name.to_lowercase())
        .or_else(|| items.first())
        .ok_or_else(|| AppError::NotFound(format!("No item found matching \"{}\"", name)))?;

    eprintln!("Launching: {} ({})", item.label, item.target);
    launch_service::launch_item(db, &item.id, "cli")?;
    Ok(())
}

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
        // UUID v7 の末尾 8 文字を略称として表示
        let id_short = if item.id.len() >= ID_W {
            &item.id[item.id.len() - ID_W..]
        } else {
            &item.id
        };
        let label = truncate(&item.label, LABEL_W);
        let type_str = format!("{:?}", item.item_type).to_lowercase();
        let target = truncate(&item.target, TARGET_W);

        println!(
            "{:<ID_W$}  {:<LABEL_W$}  {:<TYPE_W$}  {:<TARGET_W$}",
            id_short, label, type_str, target
        );
    }

    println!("\n{} item(s)", items.len());
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
