use rusqlite::{params, Connection};

use crate::models::item::Item;
use crate::models::workspace::{UpdateWidgetPositionInput, WidgetType, Workspace, WorkspaceWidget};
use crate::repositories::item_repository::row_to_item;
use crate::utils::error::AppError;

fn row_to_workspace(row: &rusqlite::Row) -> rusqlite::Result<Workspace> {
    Ok(Workspace {
        id: row.get(0)?,
        name: row.get(1)?,
        sort_order: row.get(2)?,
        wallpaper_path: row.get(3)?,
        wallpaper_opacity: row.get(4)?,
        wallpaper_blur: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn row_to_widget(row: &rusqlite::Row) -> rusqlite::Result<WorkspaceWidget> {
    let widget_type_str: String = row.get(2)?;
    let widget_type = WidgetType::from_str(&widget_type_str).unwrap_or(WidgetType::Favorites);
    Ok(WorkspaceWidget {
        id: row.get(0)?,
        workspace_id: row.get(1)?,
        widget_type,
        position_x: row.get(3)?,
        position_y: row.get(4)?,
        width: row.get(5)?,
        height: row.get(6)?,
        config: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

// --- Workspace CRUD ---

pub fn insert_workspace(conn: &Connection, ws: &Workspace) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO workspaces (id, name, sort_order) VALUES (?1, ?2, ?3)",
        params![ws.id, ws.name, ws.sort_order],
    )?;
    Ok(())
}

pub fn find_workspace_by_id(conn: &Connection, id: &str) -> Result<Workspace, AppError> {
    let result = conn.query_row(
        "SELECT id, name, sort_order, wallpaper_path, wallpaper_opacity, wallpaper_blur, created_at, updated_at FROM workspaces WHERE id = ?1",
        params![id],
        row_to_workspace,
    );
    match result {
        Ok(ws) => Ok(ws),
        Err(rusqlite::Error::QueryReturnedNoRows) => Err(AppError::NotFound(id.to_string())),
        Err(e) => Err(AppError::Database(e)),
    }
}

pub fn find_all_workspaces(conn: &Connection) -> Result<Vec<Workspace>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, sort_order, wallpaper_path, wallpaper_opacity, wallpaper_blur, created_at, updated_at FROM workspaces ORDER BY sort_order, name",
    )?;
    let workspaces = stmt
        .query_map([], row_to_workspace)?
        .collect::<rusqlite::Result<Vec<Workspace>>>()?;
    Ok(workspaces)
}

pub fn update_workspace(conn: &Connection, id: &str, name: &str) -> Result<Workspace, AppError> {
    conn.execute(
        "UPDATE workspaces SET name = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?2",
        params![name, id],
    )?;
    find_workspace_by_id(conn, id)
}

pub fn delete_workspace(conn: &Connection, id: &str) -> Result<(), AppError> {
    let n = conn.execute("DELETE FROM workspaces WHERE id = ?1", params![id])?;
    if n == 0 {
        return Err(AppError::NotFound(id.to_string()));
    }
    Ok(())
}

// PH-499: Workspace 壁紙設定の update / clear

pub fn update_workspace_wallpaper(
    conn: &Connection,
    id: &str,
    path: Option<&str>,
    opacity: f64,
    blur: i64,
) -> Result<Workspace, AppError> {
    let n = conn.execute(
        "UPDATE workspaces
           SET wallpaper_path = ?1,
               wallpaper_opacity = ?2,
               wallpaper_blur = ?3,
               updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE id = ?4",
        params![path, opacity, blur, id],
    )?;
    if n == 0 {
        return Err(AppError::NotFound(id.to_string()));
    }
    find_workspace_by_id(conn, id)
}

pub fn clear_workspace_wallpaper(conn: &Connection, id: &str) -> Result<Workspace, AppError> {
    let n = conn.execute(
        "UPDATE workspaces
           SET wallpaper_path = NULL,
               wallpaper_opacity = 1.0,
               wallpaper_blur = 0,
               updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE id = ?1",
        params![id],
    )?;
    if n == 0 {
        return Err(AppError::NotFound(id.to_string()));
    }
    find_workspace_by_id(conn, id)
}

// --- Widget CRUD ---

pub fn insert_widget(conn: &Connection, w: &WorkspaceWidget) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO workspace_widgets (id, workspace_id, widget_type, position_x, position_y, width, height, config)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            w.id,
            w.workspace_id,
            w.widget_type.as_str(),
            w.position_x,
            w.position_y,
            w.width,
            w.height,
            w.config,
        ],
    )?;
    Ok(())
}

pub fn find_widget_by_id(conn: &Connection, id: &str) -> Result<WorkspaceWidget, AppError> {
    let result = conn.query_row(
        "SELECT id, workspace_id, widget_type, position_x, position_y, width, height, config, created_at, updated_at
         FROM workspace_widgets WHERE id = ?1",
        params![id],
        row_to_widget,
    );
    match result {
        Ok(w) => Ok(w),
        Err(rusqlite::Error::QueryReturnedNoRows) => Err(AppError::NotFound(id.to_string())),
        Err(e) => Err(AppError::Database(e)),
    }
}

pub fn find_widgets_by_workspace(
    conn: &Connection,
    workspace_id: &str,
) -> Result<Vec<WorkspaceWidget>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, widget_type, position_x, position_y, width, height, config, created_at, updated_at
         FROM workspace_widgets WHERE workspace_id = ?1
         ORDER BY position_y, position_x",
    )?;
    let widgets = stmt
        .query_map(params![workspace_id], row_to_widget)?
        .collect::<rusqlite::Result<Vec<WorkspaceWidget>>>()?;
    Ok(widgets)
}

pub fn update_widget_position(
    conn: &Connection,
    id: &str,
    input: &UpdateWidgetPositionInput,
) -> Result<WorkspaceWidget, AppError> {
    conn.execute(
        "UPDATE workspace_widgets
         SET position_x = ?1, position_y = ?2, width = ?3, height = ?4,
             updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE id = ?5",
        params![
            input.position_x,
            input.position_y,
            input.width,
            input.height,
            id
        ],
    )?;
    find_widget_by_id(conn, id)
}

pub fn update_widget_config(
    conn: &Connection,
    id: &str,
    config: Option<&str>,
) -> Result<WorkspaceWidget, AppError> {
    conn.execute(
        "UPDATE workspace_widgets
         SET config = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE id = ?2",
        params![config, id],
    )?;
    find_widget_by_id(conn, id)
}

pub fn delete_widget(conn: &Connection, id: &str) -> Result<(), AppError> {
    let n = conn.execute("DELETE FROM workspace_widgets WHERE id = ?1", params![id])?;
    if n == 0 {
        return Err(AppError::NotFound(id.to_string()));
    }
    Ok(())
}

// --- JOIN queries (Item) ---

pub fn list_frequent_items(conn: &Connection, limit: i64) -> Result<Vec<Item>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT i.id, i.item_type, i.label, i.target, i.args, i.working_dir,
                i.icon_path, i.icon_type, i.aliases, i.sort_order, i.is_enabled,
                i.is_tracked, i.default_app, i.card_override_json, i.created_at, i.updated_at
         FROM items i
         INNER JOIN item_stats s ON s.item_id = i.id
         WHERE i.is_enabled = 1
         ORDER BY s.launch_count DESC, s.last_launched_at DESC
         LIMIT ?1",
    )?;
    let items = stmt
        .query_map(params![limit], row_to_item)?
        .collect::<rusqlite::Result<Vec<Item>>>()?;
    Ok(items)
}

pub fn list_recent_items(conn: &Connection, limit: i64) -> Result<Vec<Item>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT i.id, i.item_type, i.label, i.target, i.args, i.working_dir,
                i.icon_path, i.icon_type, i.aliases, i.sort_order, i.is_enabled,
                i.is_tracked, i.default_app, i.card_override_json, i.created_at, i.updated_at
         FROM items i
         INNER JOIN (
             SELECT item_id, MAX(launched_at) AS last_launch
             FROM launch_log GROUP BY item_id
         ) sub ON sub.item_id = i.id
         WHERE i.is_enabled = 1
         ORDER BY sub.last_launch DESC
         LIMIT ?1",
    )?;
    let items = stmt
        .query_map(params![limit], row_to_item)?
        .collect::<rusqlite::Result<Vec<Item>>>()?;
    Ok(items)
}

pub fn list_folder_items(conn: &Connection) -> Result<Vec<Item>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, item_type, label, target, args, working_dir,
                icon_path, icon_type, aliases, sort_order, is_enabled,
                is_tracked, default_app, card_override_json, created_at, updated_at
         FROM items
         WHERE item_type = 'folder' AND is_enabled = 1
         ORDER BY sort_order, label",
    )?;
    let items = stmt
        .query_map([], row_to_item)?
        .collect::<rusqlite::Result<Vec<Item>>>()?;
    Ok(items)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;
    use crate::models::item::{Item, ItemType};
    use crate::repositories::item_repository;

    fn make_workspace(id: &str, name: &str, sort_order: i64) -> Workspace {
        Workspace {
            id: id.to_string(),
            name: name.to_string(),
            sort_order,
            wallpaper_path: None,
            wallpaper_opacity: 1.0,
            wallpaper_blur: 0,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }

    fn make_widget(id: &str, workspace_id: &str, widget_type: WidgetType) -> WorkspaceWidget {
        WorkspaceWidget {
            id: id.to_string(),
            workspace_id: workspace_id.to_string(),
            widget_type,
            position_x: 0,
            position_y: 0,
            width: 2,
            height: 2,
            config: None,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }

    fn make_item(id: &str, label: &str, item_type: ItemType) -> Item {
        Item {
            id: id.to_string(),
            item_type,
            label: label.to_string(),
            target: "C:/test/app.exe".to_string(),
            args: None,
            working_dir: None,
            icon_path: None,
            icon_type: None,
            aliases: vec![],
            sort_order: 0,
            is_enabled: true,
            is_tracked: true,
            default_app: None,
            card_override_json: None,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }

    #[test]
    fn test_workspace_insert_find_all_roundtrip() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert_workspace(&conn, &make_workspace("ws-001", "Dev", 0)).unwrap();
        insert_workspace(&conn, &make_workspace("ws-002", "Gaming", 1)).unwrap();

        let all = find_all_workspaces(&conn).unwrap();
        assert_eq!(all.len(), 2);
        assert_eq!(all[0].name, "Dev");
        assert_eq!(all[1].name, "Gaming");
    }

    #[test]
    fn test_workspace_find_by_id() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert_workspace(&conn, &make_workspace("ws-001", "Dev", 0)).unwrap();

        let ws = find_workspace_by_id(&conn, "ws-001").unwrap();
        assert_eq!(ws.name, "Dev");
        assert_eq!(ws.sort_order, 0);
        // DB DEFAULT should set timestamps
        assert!(!ws.created_at.is_empty());
    }

    #[test]
    fn test_workspace_find_by_id_not_found() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let result = find_workspace_by_id(&conn, "nonexistent");
        assert!(result.is_err());
    }

    #[test]
    fn test_workspace_update() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert_workspace(&conn, &make_workspace("ws-001", "Old Name", 0)).unwrap();
        let updated = update_workspace(&conn, "ws-001", "New Name").unwrap();
        assert_eq!(updated.name, "New Name");
    }

    #[test]
    fn test_workspace_delete() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert_workspace(&conn, &make_workspace("ws-001", "Dev", 0)).unwrap();
        delete_workspace(&conn, "ws-001").unwrap();

        let all = find_all_workspaces(&conn).unwrap();
        assert_eq!(all.len(), 0);
    }

    #[test]
    fn test_widget_insert_find_roundtrip() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert_workspace(&conn, &make_workspace("ws-001", "Dev", 0)).unwrap();
        insert_widget(
            &conn,
            &make_widget("wg-001", "ws-001", WidgetType::Favorites),
        )
        .unwrap();

        let widget = find_widget_by_id(&conn, "wg-001").unwrap();
        assert_eq!(widget.workspace_id, "ws-001");
        assert_eq!(widget.widget_type, WidgetType::Favorites);
        assert_eq!(widget.width, 2);
        assert_eq!(widget.height, 2);
    }

    #[test]
    fn test_widget_find_by_workspace() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert_workspace(&conn, &make_workspace("ws-001", "Dev", 0)).unwrap();
        insert_widget(
            &conn,
            &make_widget("wg-001", "ws-001", WidgetType::Favorites),
        )
        .unwrap();
        insert_widget(&conn, &make_widget("wg-002", "ws-001", WidgetType::Recent)).unwrap();

        let widgets = find_widgets_by_workspace(&conn, "ws-001").unwrap();
        assert_eq!(widgets.len(), 2);
    }

    #[test]
    fn test_widget_update_position() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert_workspace(&conn, &make_workspace("ws-001", "Dev", 0)).unwrap();
        insert_widget(
            &conn,
            &make_widget("wg-001", "ws-001", WidgetType::Favorites),
        )
        .unwrap();

        let input = UpdateWidgetPositionInput {
            position_x: 3,
            position_y: 4,
            width: 5,
            height: 6,
        };
        let updated = update_widget_position(&conn, "wg-001", &input).unwrap();
        assert_eq!(updated.position_x, 3);
        assert_eq!(updated.position_y, 4);
        assert_eq!(updated.width, 5);
        assert_eq!(updated.height, 6);
    }

    #[test]
    fn test_widget_delete() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert_workspace(&conn, &make_workspace("ws-001", "Dev", 0)).unwrap();
        insert_widget(
            &conn,
            &make_widget("wg-001", "ws-001", WidgetType::Favorites),
        )
        .unwrap();

        delete_widget(&conn, "wg-001").unwrap();
        let result = find_widget_by_id(&conn, "wg-001");
        assert!(result.is_err());
    }

    #[test]
    fn test_workspace_delete_cascades_widgets() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert_workspace(&conn, &make_workspace("ws-001", "Dev", 0)).unwrap();
        insert_widget(
            &conn,
            &make_widget("wg-001", "ws-001", WidgetType::Favorites),
        )
        .unwrap();
        insert_widget(&conn, &make_widget("wg-002", "ws-001", WidgetType::Recent)).unwrap();

        delete_workspace(&conn, "ws-001").unwrap();

        let widgets = find_widgets_by_workspace(&conn, "ws-001").unwrap();
        assert_eq!(widgets.len(), 0);
    }

    #[test]
    fn test_widget_insert_invalid_workspace_fk() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let result = insert_widget(
            &conn,
            &make_widget("wg-001", "nonexistent", WidgetType::Favorites),
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_list_frequent_items() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let item = make_item("id-001", "Frequent App", ItemType::Exe);
        item_repository::insert(&conn, &item).unwrap();

        // Insert item_stats
        conn.execute(
            "INSERT INTO item_stats (item_id, launch_count, last_launched_at)
             VALUES (?1, ?2, ?3)",
            params!["id-001", 10, "2026-01-01T00:00:00Z"],
        )
        .unwrap();

        let items = list_frequent_items(&conn, 10).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].label, "Frequent App");
    }

    #[test]
    fn test_list_recent_items() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let item = make_item("id-001", "Recent App", ItemType::Exe);
        item_repository::insert(&conn, &item).unwrap();

        // Insert launch_log
        conn.execute(
            "INSERT INTO launch_log (id, item_id, launched_at, launch_source)
             VALUES (?1, ?2, ?3, ?4)",
            params!["log-001", "id-001", "2026-01-01T12:00:00Z", "palette"],
        )
        .unwrap();

        let items = list_recent_items(&conn, 10).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].label, "Recent App");
    }

    #[test]
    fn test_list_recent_items_deduplicates() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let item = make_item("id-001", "App", ItemType::Exe);
        item_repository::insert(&conn, &item).unwrap();

        // Insert multiple launch_log entries for the same item
        conn.execute(
            "INSERT INTO launch_log (id, item_id, launched_at, launch_source)
             VALUES (?1, ?2, ?3, ?4)",
            params!["log-001", "id-001", "2026-01-01T12:00:00Z", "palette"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO launch_log (id, item_id, launched_at, launch_source)
             VALUES (?1, ?2, ?3, ?4)",
            params!["log-002", "id-001", "2026-01-02T12:00:00Z", "palette"],
        )
        .unwrap();

        let items = list_recent_items(&conn, 10).unwrap();
        assert_eq!(items.len(), 1); // deduplicated
    }

    #[test]
    fn test_list_folder_items() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let mut folder_item = make_item("id-001", "My Folder", ItemType::Folder);
        folder_item.target = "C:/Projects".to_string();
        item_repository::insert(&conn, &folder_item).unwrap();

        let exe_item = make_item("id-002", "Some App", ItemType::Exe);
        item_repository::insert(&conn, &exe_item).unwrap();

        let items = list_folder_items(&conn).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].label, "My Folder");
    }

    #[test]
    fn test_list_folder_items_excludes_disabled() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let mut item = make_item("id-001", "Disabled Folder", ItemType::Folder);
        item.is_enabled = false;
        item_repository::insert(&conn, &item).unwrap();

        let items = list_folder_items(&conn).unwrap();
        assert_eq!(items.len(), 0);
    }
}
