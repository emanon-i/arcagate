use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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
    /// PH-290: per-card 背景・文字 override (JSON 文字列、NULL = global default)
    pub card_override_json: Option<String>,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_item_type_as_str() {
        assert_eq!(ItemType::Exe.as_str(), "exe");
        assert_eq!(ItemType::Url.as_str(), "url");
        assert_eq!(ItemType::Folder.as_str(), "folder");
        assert_eq!(ItemType::Script.as_str(), "script");
        assert_eq!(ItemType::Command.as_str(), "command");
    }

    #[test]
    fn test_item_type_from_str_valid() {
        assert_eq!(ItemType::from_str("exe"), Some(ItemType::Exe));
        assert_eq!(ItemType::from_str("url"), Some(ItemType::Url));
        assert_eq!(ItemType::from_str("folder"), Some(ItemType::Folder));
        assert_eq!(ItemType::from_str("script"), Some(ItemType::Script));
        assert_eq!(ItemType::from_str("command"), Some(ItemType::Command));
    }

    #[test]
    fn test_item_type_from_str_invalid() {
        assert_eq!(ItemType::from_str("unknown"), None);
        assert_eq!(ItemType::from_str("EXE"), None);
        assert_eq!(ItemType::from_str(""), None);
    }

    #[test]
    fn test_item_type_roundtrip() {
        let types = [
            ItemType::Exe,
            ItemType::Url,
            ItemType::Folder,
            ItemType::Script,
            ItemType::Command,
        ];
        for t in &types {
            let s = t.as_str();
            let back = ItemType::from_str(s);
            assert_eq!(back.as_ref(), Some(t));
        }
    }
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
    /// PH-290: per-card override JSON (null 渡しで明示的に解除)
    pub card_override_json: Option<Option<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryStats {
    pub total_items: i64,
    pub total_tags: i64,
    pub recent_launch_count: i64,
}
