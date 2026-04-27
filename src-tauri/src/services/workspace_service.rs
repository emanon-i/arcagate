use uuid::Uuid;

use crate::db::DbState;
use crate::models::git::GitStatus;
use crate::models::item::Item;
use crate::models::tag::{self, Tag};
use crate::models::workspace::{
    AddWidgetInput, CreateWorkspaceInput, UpdateWidgetPositionInput, UpdateWorkspaceInput,
    WallpaperSettings, Workspace, WorkspaceWidget,
};
use crate::repositories::{tag_repository, workspace_repository};
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

    let ws_name = input.name;
    let ws = Workspace {
        id: id.clone(),
        name: ws_name.clone(),
        sort_order,
        created_at: String::new(),
        updated_at: String::new(),
        // PH-499: 新規 workspace は wallpaper 未設定 (global library default を継承)
        wallpaper_path: None,
        wallpaper_opacity: 0.7,
        wallpaper_blur: 0,
    };

    workspace_repository::insert_workspace(&conn, &ws)?;

    // ワークスペース名のシステムタグ作成
    let sys_tag = Tag {
        id: tag::sys_ws_tag_id(&id),
        name: ws_name,
        is_hidden: false,
        is_system: true,
        prefix: None,
        icon: None,
        sort_order: -50,
        created_at: String::new(),
    };
    tag_repository::upsert_system_tag(&conn, &sys_tag)?;

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

    // ワークスペースのシステムタグ名も更新
    let sys_tag = Tag {
        id: tag::sys_ws_tag_id(id),
        name: name.clone(),
        is_hidden: false,
        is_system: true,
        prefix: None,
        icon: None,
        sort_order: -50,
        created_at: String::new(),
    };
    tag_repository::upsert_system_tag(&conn, &sys_tag)?;

    Ok(result)
}

// PH-499: Workspace 別背景壁紙 update
pub fn set_workspace_wallpaper(
    db: &DbState,
    id: &str,
    settings: WallpaperSettings,
) -> Result<Workspace, AppError> {
    let opacity = settings.opacity.clamp(0.0, 1.0);
    let blur = settings.blur.clamp(0, 40);
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    workspace_repository::update_workspace_wallpaper(
        &conn,
        id,
        settings.path.as_deref(),
        opacity,
        blur,
    )
}

pub fn delete_workspace(db: &DbState, id: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    workspace_repository::delete_workspace(&conn, id)?;

    // ワークスペースのシステムタグも削除
    let sys_tag_id = tag::sys_ws_tag_id(id);
    tag_repository::delete_system_tag_by_id(&conn, &sys_tag_id)?;

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
    workspace_repository::find_widget_by_id(&conn, &id)
}

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
}

pub fn remove_widget(db: &DbState, id: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    workspace_repository::delete_widget(&conn, id)
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

pub fn get_folder_items(db: &DbState) -> Result<Vec<Item>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    workspace_repository::list_folder_items(&conn)
}

pub fn git_status(path: &str) -> Result<GitStatus, AppError> {
    git::git_status(path)
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
