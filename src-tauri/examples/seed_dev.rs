//! 開発用ダミーデータ投入スクリプト
//! 使い方: cargo run --example seed_dev
//!
//! APPDATA/com.arcagate.desktop/arcagate.db にダミーアイテムを投入する。
//! 既にデータがある場合はスキップ（label の UNIQUE 制約で重複回避）。

use arcagate_lib::db;
use arcagate_lib::models::item::CreateItemInput;
use arcagate_lib::services::{config_service, item_service};

fn main() {
    let db_path = format!(
        "{}/com.arcagate.desktop/arcagate.db",
        std::env::var("APPDATA").expect("APPDATA not set")
    );
    println!("DB: {}", db_path);

    let db_state = db::initialize(&db_path).expect("failed to open database");

    // セットアップ完了にする（SetupWizard スキップ）
    let _ = config_service::mark_setup_complete(&db_state);

    let items = vec![
        CreateItemInput {
            item_type: arcagate_lib::models::item::ItemType::Exe,
            label: "Visual Studio Code".into(),
            target: "C:/Users/gonda/AppData/Local/Programs/Microsoft VS Code/Code.exe".into(),
            args: None,
            working_dir: None,
            icon_path: None,
            aliases: vec!["vscode".into(), "code".into()],

            tag_ids: vec![],
            is_tracked: true,
        },
        CreateItemInput {
            item_type: arcagate_lib::models::item::ItemType::Exe,
            label: "Windows Terminal".into(),
            target: "wt.exe".into(),
            args: None,
            working_dir: None,
            icon_path: None,
            aliases: vec!["terminal".into(), "wt".into()],

            tag_ids: vec![],
            is_tracked: true,
        },
        CreateItemInput {
            item_type: arcagate_lib::models::item::ItemType::Exe,
            label: "File Explorer".into(),
            target: "explorer.exe".into(),
            args: None,
            working_dir: None,
            icon_path: None,
            aliases: vec!["explorer".into()],

            tag_ids: vec![],
            is_tracked: true,
        },
        CreateItemInput {
            item_type: arcagate_lib::models::item::ItemType::Url,
            label: "GitHub".into(),
            target: "https://github.com".into(),
            args: None,
            working_dir: None,
            icon_path: None,
            aliases: vec!["gh".into()],

            tag_ids: vec![],
            is_tracked: true,
        },
        CreateItemInput {
            item_type: arcagate_lib::models::item::ItemType::Url,
            label: "Claude".into(),
            target: "https://claude.ai".into(),
            args: None,
            working_dir: None,
            icon_path: None,
            aliases: vec!["ai".into(), "anthropic".into()],

            tag_ids: vec![],
            is_tracked: true,
        },
        CreateItemInput {
            item_type: arcagate_lib::models::item::ItemType::Url,
            label: "Google Search".into(),
            target: "https://google.com".into(),
            args: None,
            working_dir: None,
            icon_path: None,
            aliases: vec!["search".into()],

            tag_ids: vec![],
            is_tracked: true,
        },
        CreateItemInput {
            item_type: arcagate_lib::models::item::ItemType::Folder,
            label: "Arcagate Project".into(),
            target: "E:/Cella/Projects/arcagate".into(),
            args: None,
            working_dir: None,
            icon_path: None,
            aliases: vec!["project".into()],

            tag_ids: vec![],
            is_tracked: true,
        },
        CreateItemInput {
            item_type: arcagate_lib::models::item::ItemType::Folder,
            label: "Downloads".into(),
            target: "C:/Users/gonda/Downloads".into(),
            args: None,
            working_dir: None,
            icon_path: None,
            aliases: vec!["dl".into()],

            tag_ids: vec![],
            is_tracked: true,
        },
        CreateItemInput {
            item_type: arcagate_lib::models::item::ItemType::Script,
            label: "Git Status All".into(),
            target: "git status".into(),
            args: None,
            working_dir: Some("E:/Cella/Projects".into()),
            icon_path: None,
            aliases: vec!["gs".into()],

            tag_ids: vec![],
            is_tracked: true,
        },
        CreateItemInput {
            item_type: arcagate_lib::models::item::ItemType::Command,
            label: "Calculator".into(),
            target: "= ".into(),
            args: None,
            working_dir: None,
            icon_path: None,
            aliases: vec!["calc".into()],

            tag_ids: vec![],
            is_tracked: true,
        },
    ];

    let mut created = 0;
    let mut skipped = 0;
    for input in items {
        let label = input.label.clone();
        match item_service::create_item(&db_state, input) {
            Ok(_) => {
                println!("  + {}", label);
                created += 1;
            }
            Err(_) => {
                println!("  ~ {} (already exists)", label);
                skipped += 1;
            }
        }
    }
    println!("\nDone: {} created, {} skipped", created, skipped);
}
