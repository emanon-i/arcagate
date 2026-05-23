use rusqlite::{params, Connection};

use crate::models::item::Item;
use crate::models::workspace::{UpdateWidgetPositionInput, Workspace, WorkspaceWidget};
use crate::utils::error::{AppError, ToAppError};

// --- Workspace CRUD ---

pub fn insert_workspace(conn: &Connection, ws: &Workspace) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO workspaces (id, name, sort_order) VALUES (?1, ?2, ?3)",
        params![ws.id, ws.name, ws.sort_order],
    )?;
    Ok(())
}

pub fn find_workspace_by_id(conn: &Connection, id: &str) -> Result<Workspace, AppError> {
    // audit F9: ToAppError trait 経由。
    conn.query_row(
        "SELECT id, name, sort_order, wallpaper_path, wallpaper_opacity, wallpaper_blur, created_at, updated_at FROM workspaces WHERE id = ?1",
        params![id],
        Workspace::from_row,
    )
    .to_not_found(id)
}

pub fn find_all_workspaces(conn: &Connection) -> Result<Vec<Workspace>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, sort_order, wallpaper_path, wallpaper_opacity, wallpaper_blur, created_at, updated_at FROM workspaces ORDER BY sort_order, name",
    )?;
    let workspaces = stmt
        .query_map([], Workspace::from_row)?
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

/// PH-issue-009: Workspace の壁紙設定を更新。
/// `path = None` で壁紙クリア、それ以外は path / opacity / blur を更新。
pub fn update_workspace_wallpaper(
    conn: &Connection,
    id: &str,
    path: Option<&str>,
    opacity: f64,
    blur: i64,
) -> Result<Workspace, AppError> {
    conn.execute(
        "UPDATE workspaces
         SET wallpaper_path = ?1,
             wallpaper_opacity = ?2,
             wallpaper_blur = ?3,
             updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE id = ?4",
        params![path, opacity, blur, id],
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
    // audit F9: ToAppError trait 経由。
    conn.query_row(
        "SELECT id, workspace_id, widget_type, position_x, position_y, width, height, config, created_at, updated_at
         FROM workspace_widgets WHERE id = ?1",
        params![id],
        WorkspaceWidget::from_row,
    )
    .to_not_found(id)
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
        .query_map(params![workspace_id], WorkspaceWidget::from_row)?
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

/// PH-issue-006: 全 widget の config (JSON TEXT) を scan、`item_id == X` または
/// `item_ids` 配列に X を含む widget の (id, config_text) を返す。
///
/// config が NULL / 空 / 不正 JSON の widget は skip。
pub fn find_widgets_referencing_item(
    conn: &Connection,
    item_id: &str,
) -> Result<Vec<(String, String)>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, config FROM workspace_widgets WHERE config IS NOT NULL AND config != ''",
    )?;
    let rows = stmt.query_map([], |row| {
        let id: String = row.get(0)?;
        let config: String = row.get(1)?;
        Ok((id, config))
    })?;
    let mut matches = Vec::new();
    for row in rows {
        let (widget_id, config_text) = row?;
        if widget_config_references_item(&config_text, item_id) {
            matches.push((widget_id, config_text));
        }
    }
    Ok(matches)
}

/// config JSON が `item_id == X` または `item_ids` 配列に X を含むか。
/// 不正 JSON は false (skip)。
fn widget_config_references_item(config_text: &str, item_id: &str) -> bool {
    let Ok(value) = serde_json::from_str::<serde_json::Value>(config_text) else {
        return false;
    };
    let Some(obj) = value.as_object() else {
        return false;
    };
    if let Some(serde_json::Value::String(s)) = obj.get("item_id") {
        if s == item_id {
            return true;
        }
    }
    if let Some(serde_json::Value::Array(arr)) = obj.get("item_ids") {
        if arr.iter().any(|v| v.as_str() == Some(item_id)) {
            return true;
        }
    }
    false
}

/// PH-issue-006: widget の config から item_id 参照を取り除いた新 config を返す。
///   - `item_id == X` ならフィールド削除
///   - `item_ids` 配列から X を filter で除去 (空配列も維持、UI 側で「item 無し」表示)
///
/// config_text 不正 / object でない場合は元のまま返す (副作用なし)。
fn strip_item_id_from_config(config_text: &str, item_id: &str) -> String {
    let Ok(mut value) = serde_json::from_str::<serde_json::Value>(config_text) else {
        return config_text.to_string();
    };
    let Some(obj) = value.as_object_mut() else {
        return config_text.to_string();
    };
    if let Some(serde_json::Value::String(s)) = obj.get("item_id") {
        if s == item_id {
            obj.remove("item_id");
        }
    }
    if let Some(serde_json::Value::Array(arr)) = obj.get_mut("item_ids") {
        arr.retain(|v| v.as_str() != Some(item_id));
    }
    serde_json::to_string(&value).unwrap_or_else(|_| config_text.to_string())
}

/// PH-issue-006: item 削除 cascade — 該当 item を参照する全 widget の config を更新。
/// 戻り値は影響を受けた widget 数。
pub fn cascade_remove_item_from_widgets(
    conn: &Connection,
    item_id: &str,
) -> Result<usize, AppError> {
    let referencing = find_widgets_referencing_item(conn, item_id)?;
    let count = referencing.len();
    for (widget_id, old_config) in referencing {
        let new_config = strip_item_id_from_config(&old_config, item_id);
        conn.execute(
            "UPDATE workspace_widgets
             SET config = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
             WHERE id = ?2",
            params![new_config, widget_id],
        )?;
    }
    Ok(count)
}

/// PH-CF-100: workspace 配下の item 参照集合を 1 query で返す (2 経路の和集合)。
///   - 経路 1: `sys-ws-<id>` tag が付いた item (`item_service` の auto register / U-7 tag 経路)
///   - 経路 2: 当該 workspace の widget config JSON の `item_id` / `item_ids` フィールド
///     (`LibraryItemPicker` で widget に追加された既存 item は tag を持たない)
///
/// cascade DELETE はこの和集合を対象集合とし、 「他 workspace から参照されない item」 のみ消す。
/// 旧実装は経路 1 のみを見ていたため、 経路 2 経由の item が孤立残留していた (E5)。
pub fn collect_workspace_referenced_item_ids(
    conn: &Connection,
    workspace_id: &str,
) -> Result<std::collections::HashSet<String>, AppError> {
    let mut ids: std::collections::HashSet<String> = std::collections::HashSet::new();
    let tag_id = format!("sys-ws-{}", workspace_id);

    // 経路 1: sys-ws-<id> tag 付き item
    let mut stmt = conn.prepare("SELECT item_id FROM item_tags WHERE tag_id = ?1")?;
    let rows = stmt.query_map(params![tag_id], |row| row.get::<_, String>(0))?;
    for row in rows {
        ids.insert(row?);
    }

    // 経路 2: 当該 workspace の widget config JSON の item_id / item_ids
    let mut wstmt = conn.prepare(
        "SELECT config FROM workspace_widgets
         WHERE workspace_id = ?1 AND config IS NOT NULL AND config != ''",
    )?;
    let wrows = wstmt.query_map(params![workspace_id], |row| row.get::<_, String>(0))?;
    for row in wrows {
        let cfg = row?;
        let Ok(value) = serde_json::from_str::<serde_json::Value>(&cfg) else {
            continue;
        };
        let Some(obj) = value.as_object() else {
            continue;
        };
        if let Some(serde_json::Value::String(s)) = obj.get("item_id") {
            ids.insert(s.clone());
        }
        if let Some(serde_json::Value::Array(arr)) = obj.get("item_ids") {
            for v in arr {
                if let Some(s) = v.as_str() {
                    ids.insert(s.to_string());
                }
            }
        }
    }
    Ok(ids)
}

/// PH-CF-100: ある item が「他 workspace から」 参照されているか判定する。
///   - 他 workspace の `sys-ws-*` tag (除外: 当該 workspace tag)
///   - 他 workspace の widget config の item_id / item_ids
///
/// `delete_workspace(delete_items=true)` で「他 workspace 非参照のみ削除」 を判定するために使う。
pub fn is_item_referenced_outside_workspace(
    conn: &Connection,
    item_id: &str,
    workspace_id: &str,
) -> Result<bool, AppError> {
    let tag_id = format!("sys-ws-{}", workspace_id);
    // 経路 1: 他 workspace の sys-ws-* tag に紐付くか
    let tag_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM item_tags
         WHERE item_id = ?1 AND tag_id LIKE 'sys-ws-%' AND tag_id <> ?2",
        params![item_id, tag_id],
        |row| row.get(0),
    )?;
    if tag_count > 0 {
        return Ok(true);
    }
    // 経路 2: 他 workspace の widget config が参照
    let mut stmt = conn.prepare(
        "SELECT config FROM workspace_widgets
         WHERE workspace_id <> ?1 AND config IS NOT NULL AND config != ''",
    )?;
    let rows = stmt.query_map(params![workspace_id], |row| row.get::<_, String>(0))?;
    for row in rows {
        let cfg = row?;
        if widget_config_references_item(&cfg, item_id) {
            return Ok(true);
        }
    }
    Ok(false)
}

#[cfg(test)]
mod cascade_tests {
    use super::*;

    #[test]
    fn test_widget_config_references_item_id_match() {
        let config = r#"{"item_id":"abc"}"#;
        assert!(widget_config_references_item(config, "abc"));
        assert!(!widget_config_references_item(config, "xyz"));
    }

    #[test]
    fn test_widget_config_references_item_ids_array() {
        let config = r#"{"item_ids":["a","b","c"]}"#;
        assert!(widget_config_references_item(config, "b"));
        assert!(!widget_config_references_item(config, "z"));
    }

    #[test]
    fn test_widget_config_references_invalid_json_returns_false() {
        assert!(!widget_config_references_item("not json", "abc"));
        assert!(!widget_config_references_item("[]", "abc"));
    }

    #[test]
    fn test_strip_item_id_removes_field() {
        let result = strip_item_id_from_config(r#"{"item_id":"abc","other":1}"#, "abc");
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert!(parsed.get("item_id").is_none());
        assert_eq!(parsed.get("other"), Some(&serde_json::json!(1)));
    }

    #[test]
    fn test_strip_item_id_keeps_unrelated() {
        let result = strip_item_id_from_config(r#"{"item_id":"xyz"}"#, "abc");
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.get("item_id"), Some(&serde_json::json!("xyz")));
    }

    #[test]
    fn test_strip_item_id_filters_array() {
        let result = strip_item_id_from_config(r#"{"item_ids":["a","b","c"]}"#, "b");
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.get("item_ids"), Some(&serde_json::json!(["a", "c"])));
    }

    #[test]
    fn test_strip_item_id_preserves_other_fields() {
        let result = strip_item_id_from_config(
            r#"{"item_id":"abc","title":"foo","item_ids":["abc","x"]}"#,
            "abc",
        );
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert!(parsed.get("item_id").is_none());
        assert_eq!(parsed.get("title"), Some(&serde_json::json!("foo")));
        assert_eq!(parsed.get("item_ids"), Some(&serde_json::json!(["x"])));
    }
}

// --- JOIN queries (Item) ---

pub fn list_frequent_items(conn: &Connection, limit: i64) -> Result<Vec<Item>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT i.id, i.item_type, i.label, i.target, i.args, i.working_dir,
                i.icon_path, i.icon_type, i.aliases, i.sort_order, i.is_enabled,
                i.is_tracked, i.default_app, i.card_override_json, i.source_widget_id, i.source_entry_key, i.created_at, i.updated_at
         FROM items i
         INNER JOIN item_stats s ON s.item_id = i.id
         WHERE i.is_enabled = 1
         ORDER BY s.launch_count DESC, s.last_launched_at DESC
         LIMIT ?1",
    )?;
    let items = stmt
        .query_map(params![limit], Item::from_row)?
        .collect::<rusqlite::Result<Vec<Item>>>()?;
    Ok(items)
}

pub fn list_recent_items(conn: &Connection, limit: i64) -> Result<Vec<Item>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT i.id, i.item_type, i.label, i.target, i.args, i.working_dir,
                i.icon_path, i.icon_type, i.aliases, i.sort_order, i.is_enabled,
                i.is_tracked, i.default_app, i.card_override_json, i.source_widget_id, i.source_entry_key, i.created_at, i.updated_at
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
        .query_map(params![limit], Item::from_row)?
        .collect::<rusqlite::Result<Vec<Item>>>()?;
    Ok(items)
}

/// R9-A: frecency (frequency × recency) ranking。
///
/// Mozilla-inspired bucketed weight (vision.md L3-C 持ち越し):
///   - 起動 1 day 以内: weight 4.0
///   - 7 days 以内:    weight 2.0
///   - 30 days 以内:   weight 1.0
///   - 90 days 以内:   weight 0.5
///   - それ以前:       weight 0.25
///
/// final score = launch_count × weight、score DESC、tie-break last_launched_at DESC。
/// is_enabled = 1 かつ起動歴あり (item_stats に row 存在) のみ。
/// 起動歴 0 件の item は素朴な list_frequent_items / list_recent_items と同じく除外。
pub fn list_frecency_items(conn: &Connection, limit: i64) -> Result<Vec<Item>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT i.id, i.item_type, i.label, i.target, i.args, i.working_dir,
                i.icon_path, i.icon_type, i.aliases, i.sort_order, i.is_enabled,
                i.is_tracked, i.default_app, i.card_override_json, i.source_widget_id, i.source_entry_key, i.created_at, i.updated_at
         FROM items i
         INNER JOIN item_stats s ON s.item_id = i.id
         WHERE i.is_enabled = 1 AND s.last_launched_at IS NOT NULL
         ORDER BY (s.launch_count * (
             CASE
                 WHEN julianday('now') - julianday(s.last_launched_at) <= 1 THEN 4.0
                 WHEN julianday('now') - julianday(s.last_launched_at) <= 7 THEN 2.0
                 WHEN julianday('now') - julianday(s.last_launched_at) <= 30 THEN 1.0
                 WHEN julianday('now') - julianday(s.last_launched_at) <= 90 THEN 0.5
                 ELSE 0.25
             END
         )) DESC, s.last_launched_at DESC
         LIMIT ?1",
    )?;
    let items = stmt
        .query_map(params![limit], Item::from_row)?
        .collect::<rusqlite::Result<Vec<Item>>>()?;
    Ok(items)
}

pub fn list_folder_items(conn: &Connection) -> Result<Vec<Item>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, item_type, label, target, args, working_dir,
                icon_path, icon_type, aliases, sort_order, is_enabled,
                is_tracked, default_app, card_override_json, source_widget_id, source_entry_key, created_at, updated_at
         FROM items
         WHERE item_type = 'folder' AND is_enabled = 1
         ORDER BY sort_order, label",
    )?;
    let items = stmt
        .query_map([], Item::from_row)?
        .collect::<rusqlite::Result<Vec<Item>>>()?;
    Ok(items)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;
    use crate::models::item::{Item, ItemType};
    use crate::models::workspace::WidgetType;
    use crate::repositories::item_repository;

    fn make_workspace(id: &str, name: &str, sort_order: i64) -> Workspace {
        Workspace {
            id: id.to_string(),
            name: name.to_string(),
            sort_order,
            wallpaper_path: None,
            wallpaper_opacity: 0.6,
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
            source_widget_id: None,
            source_entry_key: None,
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
    fn test_list_frecency_items_orders_by_combined_score() {
        // R9-A: 古くて多回起動 vs 新しくて少回起動 で recency weight が支配的になることを検証。
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let old_heavy = make_item("id-old", "Old Heavy", ItemType::Exe);
        let new_light = make_item("id-new", "New Light", ItemType::Exe);
        let new_heavy = make_item("id-new-heavy", "New Heavy", ItemType::Exe);
        item_repository::insert(&conn, &old_heavy).unwrap();
        item_repository::insert(&conn, &new_light).unwrap();
        item_repository::insert(&conn, &new_heavy).unwrap();

        // Old Heavy: 100 起動 / 100 日前 → 100 × 0.25 = 25
        // New Light: 5 起動 / 0 日前 (今日) → 5 × 4.0 = 20
        // New Heavy: 10 起動 / 0 日前 → 10 × 4.0 = 40 → 1 位
        // 期待 ranking: New Heavy > Old Heavy > New Light
        conn.execute(
            "INSERT INTO item_stats (item_id, launch_count, last_launched_at)
             VALUES (?1, ?2, datetime('now', '-100 days'))",
            params!["id-old", 100],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO item_stats (item_id, launch_count, last_launched_at)
             VALUES (?1, ?2, datetime('now'))",
            params!["id-new", 5],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO item_stats (item_id, launch_count, last_launched_at)
             VALUES (?1, ?2, datetime('now'))",
            params!["id-new-heavy", 10],
        )
        .unwrap();

        let items = list_frecency_items(&conn, 10).unwrap();
        assert_eq!(items.len(), 3);
        assert_eq!(items[0].label, "New Heavy", "score 40 should be first");
        assert_eq!(items[1].label, "Old Heavy", "score 25 should be second");
        assert_eq!(items[2].label, "New Light", "score 20 should be third");
    }

    #[test]
    fn test_list_frecency_items_excludes_no_history() {
        // 起動歴なし item は除外される (item_stats に row 無し or last_launched_at NULL)。
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let with_history = make_item("id-1", "With History", ItemType::Exe);
        let without_history = make_item("id-2", "No History", ItemType::Exe);
        item_repository::insert(&conn, &with_history).unwrap();
        item_repository::insert(&conn, &without_history).unwrap();

        conn.execute(
            "INSERT INTO item_stats (item_id, launch_count, last_launched_at)
             VALUES (?1, 1, datetime('now'))",
            params!["id-1"],
        )
        .unwrap();

        let items = list_frecency_items(&conn, 10).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].label, "With History");
    }

    #[test]
    fn test_list_frecency_items_respects_is_enabled() {
        // is_enabled = 0 の item は除外される。
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let mut disabled = make_item("id-disabled", "Disabled App", ItemType::Exe);
        disabled.is_enabled = false;
        item_repository::insert(&conn, &disabled).unwrap();

        conn.execute(
            "INSERT INTO item_stats (item_id, launch_count, last_launched_at)
             VALUES (?1, 100, datetime('now'))",
            params!["id-disabled"],
        )
        .unwrap();

        let items = list_frecency_items(&conn, 10).unwrap();
        assert_eq!(items.len(), 0);
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
