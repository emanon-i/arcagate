use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "../../src/lib/bindings/")]
// 5/01 user 判断: ClockWidget は 4 回 fix しても user 体感が改善しなかったため廃止。
// 旧 `WidgetType::Clock` / "clock" は完全削除。既存 DB 上の widget は migration v021 で除去。
pub enum WidgetType {
    Favorites,
    Recent,
    Projects,
    Item,
    Stats,
    QuickNote,
    ExeFolder,
    DailyTask,
    Snippet,
    ClipboardHistory,
    FileSearch,
    SystemMonitor,
}

impl WidgetType {
    pub fn as_str(&self) -> &'static str {
        match self {
            WidgetType::Favorites => "favorites",
            WidgetType::Recent => "recent",
            WidgetType::Projects => "projects",
            WidgetType::Item => "item",
            WidgetType::Stats => "stats",
            WidgetType::QuickNote => "quick_note",
            WidgetType::ExeFolder => "exe_folder",
            WidgetType::DailyTask => "daily_task",
            WidgetType::Snippet => "snippet",
            WidgetType::ClipboardHistory => "clipboard_history",
            WidgetType::FileSearch => "file_search",
            WidgetType::SystemMonitor => "system_monitor",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "favorites" => Some(WidgetType::Favorites),
            "recent" => Some(WidgetType::Recent),
            "projects" => Some(WidgetType::Projects),
            "item" => Some(WidgetType::Item),
            "stats" => Some(WidgetType::Stats),
            "quick_note" => Some(WidgetType::QuickNote),
            "exe_folder" => Some(WidgetType::ExeFolder),
            "daily_task" => Some(WidgetType::DailyTask),
            "snippet" => Some(WidgetType::Snippet),
            "clipboard_history" => Some(WidgetType::ClipboardHistory),
            "file_search" => Some(WidgetType::FileSearch),
            "system_monitor" => Some(WidgetType::SystemMonitor),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub sort_order: i64,
    /// PH-issue-009: per-workspace 背景画像のローカルパス。
    /// 値は `%APPDATA%/com.arcagate.desktop/wallpapers/<uuid>.<ext>` 想定。
    /// `None` は壁紙未設定 (default 表示)。
    pub wallpaper_path: Option<String>,
    /// PH-issue-009: 壁紙の opacity (0.0..1.0)。default 0.6。
    pub wallpaper_opacity: f64,
    /// PH-issue-009: 壁紙の blur 量 (px、0..40)。default 0。
    pub wallpaper_blur: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateWorkspaceWallpaperInput {
    pub workspace_id: String,
    pub path: Option<String>,
    pub opacity: f64,
    pub blur: i64,
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
        assert_eq!(WidgetType::Item.as_str(), "item");
        assert_eq!(WidgetType::Stats.as_str(), "stats");
        assert_eq!(WidgetType::QuickNote.as_str(), "quick_note");
        assert_eq!(WidgetType::ExeFolder.as_str(), "exe_folder");
        assert_eq!(WidgetType::DailyTask.as_str(), "daily_task");
        assert_eq!(WidgetType::Snippet.as_str(), "snippet");
        assert_eq!(WidgetType::ClipboardHistory.as_str(), "clipboard_history");
        assert_eq!(WidgetType::FileSearch.as_str(), "file_search");
        assert_eq!(WidgetType::SystemMonitor.as_str(), "system_monitor");
    }

    #[test]
    fn test_widget_type_from_str_valid() {
        assert_eq!(
            WidgetType::from_str("favorites"),
            Some(WidgetType::Favorites)
        );
        assert_eq!(WidgetType::from_str("recent"), Some(WidgetType::Recent));
        assert_eq!(WidgetType::from_str("projects"), Some(WidgetType::Projects));
        assert_eq!(WidgetType::from_str("item"), Some(WidgetType::Item));
        assert_eq!(WidgetType::from_str("stats"), Some(WidgetType::Stats));
        assert_eq!(
            WidgetType::from_str("quick_note"),
            Some(WidgetType::QuickNote)
        );
        assert_eq!(
            WidgetType::from_str("exe_folder"),
            Some(WidgetType::ExeFolder)
        );
        assert_eq!(
            WidgetType::from_str("daily_task"),
            Some(WidgetType::DailyTask)
        );
        assert_eq!(WidgetType::from_str("snippet"), Some(WidgetType::Snippet));
        assert_eq!(
            WidgetType::from_str("clipboard_history"),
            Some(WidgetType::ClipboardHistory)
        );
        assert_eq!(
            WidgetType::from_str("file_search"),
            Some(WidgetType::FileSearch)
        );
        assert_eq!(
            WidgetType::from_str("system_monitor"),
            Some(WidgetType::SystemMonitor)
        );
    }

    #[test]
    fn test_widget_type_from_str_invalid() {
        assert_eq!(WidgetType::from_str("unknown"), None);
        assert_eq!(WidgetType::from_str("Favorites"), None);
        assert_eq!(WidgetType::from_str(""), None);
        // 5/01 user 判断: clock 廃止後、文字列 "clock" は無効値として扱う
        // (migration v021 で DB 側からも除去済みのため、新規受付されない)。
        assert_eq!(WidgetType::from_str("clock"), None);
    }

    #[test]
    fn test_widget_type_roundtrip() {
        let types = [
            WidgetType::Favorites,
            WidgetType::Recent,
            WidgetType::Projects,
            WidgetType::Item,
            WidgetType::Stats,
            WidgetType::QuickNote,
            WidgetType::ExeFolder,
            WidgetType::DailyTask,
            WidgetType::Snippet,
            WidgetType::ClipboardHistory,
            WidgetType::FileSearch,
            WidgetType::SystemMonitor,
        ];
        for t in &types {
            let s = t.as_str();
            let back = WidgetType::from_str(s);
            assert_eq!(back.as_ref(), Some(t));
        }
    }
}
