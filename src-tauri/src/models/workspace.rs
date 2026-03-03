use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum WidgetType {
    Favorites,
    Recent,
    Projects,
    WatchedFolders,
}

impl WidgetType {
    pub fn as_str(&self) -> &'static str {
        match self {
            WidgetType::Favorites => "favorites",
            WidgetType::Recent => "recent",
            WidgetType::Projects => "projects",
            WidgetType::WatchedFolders => "watched_folders",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "favorites" => Some(WidgetType::Favorites),
            "recent" => Some(WidgetType::Recent),
            "projects" => Some(WidgetType::Projects),
            "watched_folders" => Some(WidgetType::WatchedFolders),
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
