use serde::Serialize;
use uuid::Uuid;

use crate::db::DbState;
use crate::models::git::GitStatusBatchEntry;
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

/// PH-CF-100: workspace 削除の cascade を 1 transaction + 参照経路 2 系統で再設計。
///
/// 引数 `delete_items` (必須、 implicit default 持たない契約):
///   - `true`: workspace に紐付く item を Library からも削除する (現状挙動)。 対象集合は
///     `sys-ws-<id>` tag ∪ workspace の widget config JSON `item_id`/`item_ids` の 和集合 のうち、
///     他 workspace から参照されない item のみ。 E5 真因 #1 (LibraryItemPicker 追加 item の
///     孤立) は経路 2 を集合に含めることで解消。
///   - `false`: workspace と widget だけ消し、 item は Library に残す (E6 PH-CF-300 で
///     user 選択する経路用)。
///
/// `workspace` / `item` / `tag` / `widget_item_hides` の削除は 1 transaction で行い、
/// 中途半端な状態 (workspace 行は消えたが item は残った 等) を残さない。 失敗時は Drop で rollback。
pub fn delete_workspace(db: &DbState, id: &str, delete_items: bool) -> Result<(), AppError> {
    let mut conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let tx = conn.transaction()?;
    let tag_id = format!("sys-ws-{}", id);

    if delete_items {
        // PH-CF-100: 参照集合 (tag ∪ widget config item_ids) のうち、 他 workspace から
        // 参照されない item のみ削除。 旧実装は経路 1 (tag) のみ見ていたため E5 が残った。
        let referenced = workspace_repository::collect_workspace_referenced_item_ids(&tx, id)?;
        for item_id in &referenced {
            if !workspace_repository::is_item_referenced_outside_workspace(&tx, item_id, id)? {
                // item 削除前に widget config からも cascade (image_scrap 等の cross-widget 参照)。
                workspace_repository::cascade_remove_item_from_widgets(&tx, item_id)?;
                tx.execute(
                    "DELETE FROM items WHERE id = ?1",
                    rusqlite::params![item_id],
                )?;
            }
        }
    }

    // workspace 行を削除 (workspace_widgets / widget_item_hides は FK CASCADE で連鎖)。
    workspace_repository::delete_workspace(&tx, id)?;
    // U-3: workspace 削除と同時に sys-ws-<id> tag も削除 (item_tags は ON DELETE CASCADE)。
    tx.execute("DELETE FROM tags WHERE id = ?1", rusqlite::params![tag_id])?;
    tx.commit()?;
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

/// Phase L-1: git_status batch (並列実行) — Library freeze 主因の N+1 IPC を 1 IPC に集約。
pub fn git_statuses_batch(paths: Vec<String>) -> Vec<GitStatusBatchEntry> {
    git::git_statuses_batch(paths)
}

/// #10: フォルダの実 mtime (filesystem 更新日時、ms epoch)。
/// フォルダ監視 widget の「更新日時」ソートで DB の updated_at ではなく
/// 実フォルダの mtime を参照するために使う。
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderMtimeEntry {
    pub path: String,
    pub mtime_ms: u64,
}

/// 各 path の filesystem mtime を batch 取得する。入力順を保持。
/// path 不在 / metadata 取得不可時は `mtime_ms: 0`。
pub fn folder_mtimes_batch(paths: Vec<String>) -> Vec<FolderMtimeEntry> {
    paths
        .into_iter()
        .map(|path| {
            let mtime_ms = std::fs::metadata(&path)
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|tm| tm.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);
            FolderMtimeEntry { path, mtime_ms }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;
    use crate::models::workspace::WidgetType;

    #[test]
    fn test_folder_mtimes_batch_existing_and_missing() {
        // #10: 実在 path は mtime > 0、不在 path は 0。
        let tmp = std::env::temp_dir();
        let tmp_str = tmp.to_string_lossy().to_string();
        let missing = tmp
            .join("arcagate-no-such-dir-xyz")
            .to_string_lossy()
            .to_string();
        let result = folder_mtimes_batch(vec![tmp_str.clone(), missing.clone()]);
        assert_eq!(result.len(), 2);
        assert!(result.iter().find(|e| e.path == tmp_str).unwrap().mtime_ms > 0);
        assert_eq!(
            result.iter().find(|e| e.path == missing).unwrap().mtime_ms,
            0
        );
    }

    #[test]
    fn test_folder_mtimes_batch_preserves_order() {
        let r = folder_mtimes_batch(vec![
            "a-x".to_string(),
            "b-x".to_string(),
            "c-x".to_string(),
        ]);
        assert_eq!(r.len(), 3);
        assert_eq!(r[0].path, "a-x");
        assert_eq!(r[2].path, "c-x");
    }

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

        delete_workspace(&db, &ws.id, true).unwrap();
        let all = list_workspaces(&db).unwrap();
        assert_eq!(all.len(), 0);
    }

    #[test]
    fn test_delete_workspace_cascades_orphan_items() {
        let db = initialize_in_memory();
        let ws = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "WS".to_string(),
            },
        )
        .unwrap();
        // create_workspace で sys-ws-<id> tag は作成済。 widget 経由登録を模して item に付与。
        {
            let conn = db.0.lock().unwrap();
            conn.execute(
                "INSERT INTO items (id, item_type, label, target) VALUES ('it1', 'exe', 'A', 'C:/a.exe')",
                [],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO item_tags (item_id, tag_id) VALUES ('it1', ?1)",
                rusqlite::params![format!("sys-ws-{}", ws.id)],
            )
            .unwrap();
        }
        delete_workspace(&db, &ws.id, true).unwrap();
        let conn = db.0.lock().unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM items WHERE id = 'it1'", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(
            count, 0,
            "workspace 削除で widget 登録 item も Library から消える"
        );
    }

    #[test]
    fn test_delete_workspace_keeps_multi_workspace_items() {
        let db = initialize_in_memory();
        let ws1 = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "WS1".to_string(),
            },
        )
        .unwrap();
        let ws2 = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "WS2".to_string(),
            },
        )
        .unwrap();
        {
            let conn = db.0.lock().unwrap();
            conn.execute(
                "INSERT INTO items (id, item_type, label, target) VALUES ('it1', 'exe', 'A', 'C:/a.exe')",
                [],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO item_tags (item_id, tag_id) VALUES ('it1', ?1)",
                rusqlite::params![format!("sys-ws-{}", ws1.id)],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO item_tags (item_id, tag_id) VALUES ('it1', ?1)",
                rusqlite::params![format!("sys-ws-{}", ws2.id)],
            )
            .unwrap();
        }
        delete_workspace(&db, &ws1.id, true).unwrap();
        let conn = db.0.lock().unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM items WHERE id = 'it1'", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(count, 1, "他 workspace にも登録済の item は残す");
    }

    // PH-CF-100: delete_workspace の delete_items=false 分岐 — workspace と widget だけ消し、
    // item は Library に残す (PH-CF-300 で user 選択する経路用)。
    #[test]
    fn test_delete_workspace_keep_items_branch() {
        let db = initialize_in_memory();
        let ws = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "WS".to_string(),
            },
        )
        .unwrap();
        {
            let conn = db.0.lock().unwrap();
            conn.execute(
                "INSERT INTO items (id, item_type, label, target) VALUES ('it1', 'exe', 'A', 'C:/a.exe')",
                [],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO item_tags (item_id, tag_id) VALUES ('it1', ?1)",
                rusqlite::params![format!("sys-ws-{}", ws.id)],
            )
            .unwrap();
        }
        delete_workspace(&db, &ws.id, false).unwrap();
        let conn = db.0.lock().unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM items WHERE id = 'it1'", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(
            count, 1,
            "delete_items=false なら workspace 削除しても item は残る"
        );
    }

    // PH-CF-100: E5 真因 #1 — LibraryItemPicker で widget config item_ids に追加された item
    // は `sys-ws-*` tag を持たない。 旧実装は tag 経由でしか cascade しなかったため孤立残留。
    // 修正: 参照集合を tag ∪ widget config item_ids の和集合に広げ、 他 workspace 非参照のみ削除。
    #[test]
    fn test_delete_workspace_cascades_widget_config_item_ids() {
        let db = initialize_in_memory();
        let ws = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "WS".to_string(),
            },
        )
        .unwrap();
        // item を Library に追加 (sys-ws-* tag は付けない = LibraryItemPicker 相当)。
        {
            let conn = db.0.lock().unwrap();
            conn.execute(
                "INSERT INTO items (id, item_type, label, target) VALUES ('orphan-it', 'exe', 'A', 'C:/orphan.exe')",
                [],
            )
            .unwrap();
        }
        // 当該 workspace に item widget を載せ、 config の item_ids に追加。
        let w = add_widget(
            &db,
            AddWidgetInput {
                workspace_id: ws.id.clone(),
                widget_type: WidgetType::Item,
            },
        )
        .unwrap();
        update_widget_config(&db, &w.id, Some(r#"{"item_ids":["orphan-it"]}"#)).unwrap();

        delete_workspace(&db, &ws.id, true).unwrap();
        let conn = db.0.lock().unwrap();
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM items WHERE id = 'orphan-it'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(
            count, 0,
            "widget config item_ids 経路の item も cascade 削除 (E5 真因 #1 解消)"
        );
    }

    // PH-CF-100: mixed widget payload (sys-ws-* tag 経由 + widget config item_ids 経由) を
    // 1 workspace に混ぜて配置した状態で削除しても、 全部消えて孤立 / dangling 参照が残らないこと。
    #[test]
    fn test_delete_workspace_mixed_payload_no_orphans_or_dangling() {
        let db = initialize_in_memory();
        let ws = create_workspace(
            &db,
            CreateWorkspaceInput {
                name: "WS".to_string(),
            },
        )
        .unwrap();
        {
            let conn = db.0.lock().unwrap();
            // 経路 1 (sys-ws tag): widget 由来 auto-register 相当
            conn.execute(
                "INSERT INTO items (id, item_type, label, target) VALUES ('tag-it', 'folder', 'A', 'C:/a')",
                [],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO item_tags (item_id, tag_id) VALUES ('tag-it', ?1)",
                rusqlite::params![format!("sys-ws-{}", ws.id)],
            )
            .unwrap();
            // 経路 2 (widget config item_ids): LibraryItemPicker 相当
            conn.execute(
                "INSERT INTO items (id, item_type, label, target) VALUES ('cfg-it', 'url', 'B', 'https://x')",
                [],
            )
            .unwrap();
        }
        let w = add_widget(
            &db,
            AddWidgetInput {
                workspace_id: ws.id.clone(),
                widget_type: WidgetType::Item,
            },
        )
        .unwrap();
        update_widget_config(&db, &w.id, Some(r#"{"item_ids":["tag-it","cfg-it"]}"#)).unwrap();

        delete_workspace(&db, &ws.id, true).unwrap();

        let conn = db.0.lock().unwrap();
        // 孤立 item ゼロ
        let item_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM items WHERE id IN ('tag-it','cfg-it')",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(item_count, 0, "mixed payload で孤立 item ゼロ");
        // dangling 参照ゼロ (widget 自体 cascade で消えるはずだが念のため)
        let widget_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM workspace_widgets WHERE workspace_id = ?1",
                rusqlite::params![ws.id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(widget_count, 0, "workspace 削除で widget も cascade");
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
/// 注: `git_statuses_batch` (db 不要) と `sync_workspace_item_tags` (内部 helper) は struct method 化しない。
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

    pub fn delete_workspace(&self, id: &str, delete_items: bool) -> Result<(), AppError> {
        delete_workspace(&self.db, id, delete_items)
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
