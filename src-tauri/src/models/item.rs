use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ItemType {
    Exe,
    Url,
    Folder,
    Script,
    Command,
}

impl ItemType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ItemType::Exe => "exe",
            ItemType::Url => "url",
            ItemType::Folder => "folder",
            ItemType::Script => "script",
            ItemType::Command => "command",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "exe" => Some(ItemType::Exe),
            "url" => Some(ItemType::Url),
            "folder" => Some(ItemType::Folder),
            "script" => Some(ItemType::Script),
            "command" => Some(ItemType::Command),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub item_type: ItemType,
    pub label: String,
    pub target: String,
    pub args: Option<String>,
    pub working_dir: Option<String>,
    pub icon_path: Option<String>,
    pub icon_type: Option<String>,
    pub aliases: Vec<String>,
    pub sort_order: i64,
    pub is_enabled: bool,
    pub is_tracked: bool,
    pub default_app: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateItemInput {
    pub item_type: ItemType,
    pub label: String,
    pub target: String,
    pub args: Option<String>,
    pub working_dir: Option<String>,
    pub icon_path: Option<String>,
    pub aliases: Vec<String>,
    pub tag_ids: Vec<String>,
    #[serde(default = "default_true")]
    pub is_tracked: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateItemInput {
    pub label: Option<String>,
    pub target: Option<String>,
    pub args: Option<String>,
    pub working_dir: Option<String>,
    pub icon_path: Option<String>,
    pub aliases: Option<Vec<String>>,
    pub is_enabled: Option<bool>,
    pub is_tracked: Option<bool>,
    pub default_app: Option<String>,
    pub tag_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryStats {
    pub total_items: i64,
    pub total_tags: i64,
    pub recent_launch_count: i64,
}
