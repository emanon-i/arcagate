use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum WidgetType {
    Favorites,
    Recent,
    Projects,
    WatchedFolders,
    Item,
}

impl WidgetType {
    pub fn as_str(&self) -> &'static str {
        match self {
            WidgetType::Favorites => "favorites",
            WidgetType::Recent => "recent",
            WidgetType::Projects => "projects",
            WidgetType::WatchedFolders => "watched_folders",
            WidgetType::Item => "item",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "favorites" => Some(WidgetType::Favorites),
            "recent" => Some(WidgetType::Recent),
            "projects" => Some(WidgetType::Projects),
            "watched_folders" => Some(WidgetType::WatchedFolders),
            "item" => Some(WidgetType::Item),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceWidget {
    pub id: String,
    pub workspace_id: String,
    pub widget_type: WidgetType,
    pub position_x: i64,
    pub position_y: i64,
    pub width: i64,
    pub height: i64,
    pub config: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkspaceInput {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateWorkspaceInput {
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddWidgetInput {
    pub workspace_id: String,
    pub widget_type: WidgetType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateWidgetPositionInput {
    pub position_x: i64,
    pub position_y: i64,
    pub width: i64,
    pub height: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_widget_type_as_str() {
        assert_eq!(WidgetType::Favorites.as_str(), "favorites");
        assert_eq!(WidgetType::Recent.as_str(), "recent");
        assert_eq!(WidgetType::Projects.as_str(), "projects");
        assert_eq!(WidgetType::WatchedFolders.as_str(), "watched_folders");
        assert_eq!(WidgetType::Item.as_str(), "item");
    }

    #[test]
    fn test_widget_type_from_str_valid() {
        assert_eq!(
            WidgetType::from_str("favorites"),
            Some(WidgetType::Favorites)
        );
        assert_eq!(WidgetType::from_str("recent"), Some(WidgetType::Recent));
        assert_eq!(WidgetType::from_str("projects"), Some(WidgetType::Projects));
        assert_eq!(
            WidgetType::from_str("watched_folders"),
            Some(WidgetType::WatchedFolders)
        );
        assert_eq!(WidgetType::from_str("item"), Some(WidgetType::Item));
    }

    #[test]
    fn test_widget_type_from_str_invalid() {
        assert_eq!(WidgetType::from_str("unknown"), None);
        assert_eq!(WidgetType::from_str("Favorites"), None);
        assert_eq!(WidgetType::from_str(""), None);
    }

    #[test]
    fn test_widget_type_roundtrip() {
        let types = [
            WidgetType::Favorites,
            WidgetType::Recent,
            WidgetType::Projects,
            WidgetType::WatchedFolders,
            WidgetType::Item,
        ];
        for t in &types {
            let s = t.as_str();
            let back = WidgetType::from_str(s);
            assert_eq!(back.as_ref(), Some(t));
        }
    }
}
