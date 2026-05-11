use uuid::Uuid;

use crate::db::DbState;
use crate::models::git::{GitStatus, GitStatusBatchEntry};
use crate::models::item::Item;
use crate::models::workspace::{
    AddWidgetInput, CreateWorkspaceInput, UpdateWidgetPositionInput, UpdateWorkspaceInput,
    Workspace, WorkspaceWidget,
};
use crate::repositories::workspace_repository;
use crate::utils::error::AppError;
use crate::utils::git;

pub fn create_workspace(db: &DbState, input: CreateWorkspaceInput) -> Result<Workspace, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::InvalidInput("name must not be empty".to_string()));
    }

    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let all = workspace_repository::find_all_workspaces(&conn)?;
    let sort_order = all.len() as i64;
    let id = Uuid::now_v7().to_string();

    let ws = Workspace {
        id: id.clone(),
        name: input.name.clone(),
        sort_order,
        // PH-issue-009: 壁紙未設定 default
        wallpaper_path: None,
        wallpaper_opacity: 0.6,
        wallpaper_blur: 0,
        created_at: String::new(),
        updated_at: String::new(),
    };

    workspace_repository::insert_workspace(&conn, &ws)?;

    // U-3 (2026-05-12 user 検収): screens-and-flows.md Library / Workspace § で
    // 「workspace 名 system tag」 を再導入。 旧 G-7 (#410) で撤去されたが、 spec で復活。
    // workspace 作成と同時に sys-ws-<id> tag を作成 (tag name = workspace name)。
    let tag_id = format!("sys-ws-{}", id);
    conn.execute(
        "INSERT OR IGNORE INTO tags (id, name, is_hidden, is_system, prefix, icon, sort_order, created_at) \
         VALUES (?1, ?2, 0, 1, NULL, NULL, 70, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))",
        rusqlite::params![tag_id, input.name],
    )?;

    workspace_repository::find_workspace_by_id(&conn, &id)
}

pub fn list_workspaces(db: &DbState) -> Result<Vec<Workspace>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    workspace_repository::find_all_workspaces(&conn)
}

pub fn update_workspace(
    db: &DbState,
    id: &str,
    input: UpdateWorkspaceInput,
) -> Result<Workspace, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let existing = workspace_repository::find_workspace_by_id(&conn, id)?;

    let name = match input.name {
        Some(n) => {
            if n.trim().is_empty() {
                return Err(AppError::InvalidInput("name must not be empty".to_string()));
            }
            n
        }
        None => existing.name,
    };

    let result = workspace_repository::update_workspace(&conn, id, &name)?;

    // U-3: sys-ws-<id> tag の name を workspace 名に同期 (rename 反映)。
    let tag_id = format!("sys-ws-{}", id);
    conn.execute(
        "UPDATE tags SET name = ?1 WHERE id = ?2",
        rusqlite::params![name, tag_id],
    )?;

    Ok(result)
}

pub fn delete_workspace(db: &DbState, id: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    workspace_repository::delete_workspace(&conn, id)?;

    // U-3: workspace 削除と同時に sys-ws-<id> tag も削除 (item_tags は ON DELETE CASCADE)。
    let tag_id = format!("sys-ws-{}", id);
    conn.execute("DELETE FROM tags WHERE id = ?1", rusqlite::params![tag_id])?;

    Ok(())
}

pub fn add_widget(db: &DbState, input: AddWidgetInput) -> Result<WorkspaceWidget, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    // Verify workspace exists
    workspace_repository::find_workspace_by_id(&conn, &input.workspace_id)?;

    let widgets = workspace_repository::find_widgets_by_workspace(&conn, &input.workspace_id)?;
    let id = Uuid::now_v7().to_string();

    let widget = WorkspaceWidget {
        id: id.clone(),
        workspace_id: input.workspace_id,
        widget_type: input.widget_type,
        position_x: 0,
        position_y: widgets.len() as i64,
        width: 2,
        height: 2,
        config: None,
        created_at: String::new(),
        updated_at: String::new(),
    };

    workspace_repository::insert_widget(&conn, &widget)?;
    // G-7: workspace tag 同期処理は撤去 (sys-ws-* 機能ごと廃止)。
    workspace_repository::find_widget_by_id(&conn, &id)
}

// G-7: sync_workspace_item_tags 関数は撤去 (sys-ws-* 機能ごと廃止)。

pub fn list_widgets(db: &DbState, workspace_id: &str) -> Result<Vec<WorkspaceWidget>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    workspace_repository::find_widgets_by_workspace(&conn, workspace_id)
}

pub fn update_widget_position(
    db: &DbState,
    id: &str,
    input: UpdateWidgetPositionInput,
) -> Result<WorkspaceWidget, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    workspace_repository::update_widget_position(&conn, id, &input)
}

pub fn update_widget_config(
    db: &DbState,
    id: &str,
    config: Option<&str>,
) -> Result<WorkspaceWidget, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    workspace_repository::update_widget_config(&conn, id, config)
    // G-7: sync_workspace_item_tags 撤去 (sys-ws-* 機能ごと廃止)。
}

pub fn remove_widget(db: &DbState, id: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    workspace_repository::delete_widget(&conn, id)?;
    // G-7: sync_workspace_item_tags 撤去 (sys-ws-* 機能ごと廃止)。
    Ok(())
}

pub fn get_frequent_items(db: &DbState, limit: i64) -> Result<Vec<Item>, AppError> {
    let limit = limit.clamp(1, 500);
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    workspace_repository::list_frequent_items(&conn, limit)
}

pub fn get_recent_items(db: &DbState, limit: i64) -> Result<Vec<Item>, AppError> {
    let limit = limit.clamp(1, 500);
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    workspace_repository::list_recent_items(&conn, limit)
}

/// R9-A: frecency 順 (frequency × recency) で item を返す。
/// palette empty-state で merged recent+frequent の代わりに使う。
pub fn get_frecency_items(db: &DbState, limit: i64) -> Result<Vec<Item>, AppError> {
    let limit = limit.clamp(1, 500);
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    workspace_repository::list_frecency_items(&conn, limit)
}

pub fn get_folder_items(db: &DbState) -> Result<Vec<Item>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    workspace_repository::list_folder_items(&conn)
}

pub fn git_status(path: &str) -> Result<GitStatus, AppError> {
    git::git_status(path)
}

/// Phase L-1: git_status batch (並列実行) — Library freeze 主因の N+1 IPC を 1 IPC に集約。
pub fn git_statuses_batch(paths: Vec<String>) -> Vec<GitStatusBatchEntry> {
    git::git_statuses_batch(paths)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;
    use crate::models::workspace::WidgetType;

    #[test]
    fn test_create_workspace() {
        let db = initialize_in_memory();
        let ws = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "Dev".to_string(),
            },
        )
        .unwrap();
        assert_eq!(ws.name, "Dev");
        assert_eq!(ws.sort_order, 0);
        assert!(!ws.id.is_empty());
    }

    #[test]
    fn test_create_workspace_empty_name() {
        let db = initialize_in_memory();
        let result = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "  ".to_string(),
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_create_workspace_sort_order_increments() {
        let db = initialize_in_memory();
        let ws1 = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "First".to_string(),
            },
        )
        .unwrap();
        let ws2 = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "Second".to_string(),
            },
        )
        .unwrap();
        assert_eq!(ws1.sort_order, 0);
        assert_eq!(ws2.sort_order, 1);
    }

    #[test]
    fn test_list_workspaces() {
        let db = initialize_in_memory();
        create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "A".to_string(),
            },
        )
        .unwrap();
        create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "B".to_string(),
            },
        )
        .unwrap();

        let all = list_workspaces(&db).unwrap();
        assert_eq!(all.len(), 2);
    }

    #[test]
    fn test_update_workspace() {
        let db = initialize_in_memory();
        let ws = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "Old".to_string(),
            },
        )
        .unwrap();

        let updated = update_workspace(
            &db,
            &ws.id,
            UpdateWorkspaceInput {
                name: Some("New".to_string()),
            },
        )
        .unwrap();
        assert_eq!(updated.name, "New");
    }

    #[test]
    fn test_update_workspace_empty_name() {
        let db = initialize_in_memory();
        let ws = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "OK".to_string(),
            },
        )
        .unwrap();

        let result = update_workspace(
            &db,
            &ws.id,
            UpdateWorkspaceInput {
                name: Some("".to_string()),
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_update_workspace_none_keeps_name() {
        let db = initialize_in_memory();
        let ws = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "Keep".to_string(),
            },
        )
        .unwrap();

        let updated = update_workspace(&db, &ws.id, UpdateWorkspaceInput { name: None }).unwrap();
        assert_eq!(updated.name, "Keep");
    }

    #[test]
    fn test_delete_workspace() {
        let db = initialize_in_memory();
        let ws = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "ToDelete".to_string(),
            },
        )
        .unwrap();

        delete_workspace(&db, &ws.id).unwrap();
        let all = list_workspaces(&db).unwrap();
        assert_eq!(all.len(), 0);
    }

    #[test]
    fn test_add_widget() {
        let db = initialize_in_memory();
        let ws = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "Dev".to_string(),
            },
        )
        .unwrap();

        let widget = add_widget(
            &db,
            AddWidgetInput {
                workspace_id: ws.id.clone(),
                widget_type: WidgetType::Favorites,
            },
        )
        .unwrap();
        assert_eq!(widget.workspace_id, ws.id);
        assert_eq!(widget.widget_type, WidgetType::Favorites);
        assert_eq!(widget.position_y, 0);
    }

    #[test]
    fn test_add_widget_nonexistent_workspace() {
        let db = initialize_in_memory();
        let result = add_widget(
            &db,
            AddWidgetInput {
                workspace_id: "nonexistent".to_string(),
                widget_type: WidgetType::Favorites,
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_list_widgets() {
        let db = initialize_in_memory();
        let ws = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "Dev".to_string(),
            },
        )
        .unwrap();

        add_widget(
            &db,
            AddWidgetInput {
                workspace_id: ws.id.clone(),
                widget_type: WidgetType::Favorites,
            },
        )
        .unwrap();
        add_widget(
            &db,
            AddWidgetInput {
                workspace_id: ws.id.clone(),
                widget_type: WidgetType::Recent,
            },
        )
        .unwrap();

        let widgets = list_widgets(&db, &ws.id).unwrap();
        assert_eq!(widgets.len(), 2);
    }

    #[test]
    fn test_update_widget_position() {
        let db = initialize_in_memory();
        let ws = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "Dev".to_string(),
            },
        )
        .unwrap();
        let widget = add_widget(
            &db,
            AddWidgetInput {
                workspace_id: ws.id,
                widget_type: WidgetType::Recent,
            },
        )
        .unwrap();

        let updated = update_widget_position(
            &db,
            &widget.id,
            UpdateWidgetPositionInput {
                position_x: 1,
                position_y: 2,
                width: 3,
                height: 4,
            },
        )
        .unwrap();
        assert_eq!(updated.position_x, 1);
        assert_eq!(updated.position_y, 2);
        assert_eq!(updated.width, 3);
        assert_eq!(updated.height, 4);
    }

    #[test]
    fn test_remove_widget() {
        let db = initialize_in_memory();
        let ws = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "Dev".to_string(),
            },
        )
        .unwrap();
        let widget = add_widget(
            &db,
            AddWidgetInput {
                workspace_id: ws.id.clone(),
                widget_type: WidgetType::Favorites,
            },
        )
        .unwrap();

        remove_widget(&db, &widget.id).unwrap();
        let widgets = list_widgets(&db, &ws.id).unwrap();
        assert_eq!(widgets.len(), 0);
    }
}

/// V1 解消 (A3 PR-A): AppServices 集約パターン用の service struct。
/// 各 method は同 module の free function に delegate (scope 限定のため既存実装は維持)。
/// 注: `git_status` (db 不要) と `sync_workspace_item_tags` (内部 helper) は struct method 化しない。
pub struct WorkspaceService {
    db: std::sync::Arc<crate::db::DbState>,
}

impl WorkspaceService {
    pub fn new(db: std::sync::Arc<crate::db::DbState>) -> Self {
        Self { db }
    }

    pub fn create_workspace(&self, input: CreateWorkspaceInput) -> Result<Workspace, AppError> {
        create_workspace(&self.db, input)
    }

    pub fn list_workspaces(&self) -> Result<Vec<Workspace>, AppError> {
        list_workspaces(&self.db)
    }

    pub fn update_workspace(
        &self,
        id: &str,
        input: UpdateWorkspaceInput,
    ) -> Result<Workspace, AppError> {
        update_workspace(&self.db, id, input)
    }

    pub fn delete_workspace(&self, id: &str) -> Result<(), AppError> {
        delete_workspace(&self.db, id)
    }

    pub fn add_widget(&self, input: AddWidgetInput) -> Result<WorkspaceWidget, AppError> {
        add_widget(&self.db, input)
    }

    pub fn list_widgets(&self, workspace_id: &str) -> Result<Vec<WorkspaceWidget>, AppError> {
        list_widgets(&self.db, workspace_id)
    }

    pub fn update_widget_position(
        &self,
        id: &str,
        input: UpdateWidgetPositionInput,
    ) -> Result<WorkspaceWidget, AppError> {
        update_widget_position(&self.db, id, input)
    }

    pub fn update_widget_config(
        &self,
        id: &str,
        config: Option<&str>,
    ) -> Result<WorkspaceWidget, AppError> {
        update_widget_config(&self.db, id, config)
    }

    pub fn remove_widget(&self, id: &str) -> Result<(), AppError> {
        remove_widget(&self.db, id)
    }

    pub fn get_frequent_items(&self, limit: i64) -> Result<Vec<Item>, AppError> {
        get_frequent_items(&self.db, limit)
    }

    pub fn get_recent_items(&self, limit: i64) -> Result<Vec<Item>, AppError> {
        get_recent_items(&self.db, limit)
    }

    pub fn get_frecency_items(&self, limit: i64) -> Result<Vec<Item>, AppError> {
        get_frecency_items(&self.db, limit)
    }

    pub fn get_folder_items(&self) -> Result<Vec<Item>, AppError> {
        get_folder_items(&self.db)
    }
}
