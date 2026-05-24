// Phase 2 (2026-05-12): per-widget hide の永続化。
//
// widget_id × item_target で hide を記録、 widget render 時に filter する。
// widget 削除で FK CASCADE で自動消去 (= 新 widget は前 widget の hide 状態継承しない、
// シナリオ 2「勝手な復活」 を解消)。

use rusqlite::{params, Connection};

use crate::utils::error::AppError;

/// widget_id × item_target で hide row 追加 (idempotent: 既存ありなら no-op)。
pub fn add(conn: &Connection, widget_id: &str, item_target: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR IGNORE INTO widget_item_hides (widget_id, item_target) VALUES (?1, ?2)",
        params![widget_id, item_target],
    )?;
    Ok(())
}

/// widget_id × item_target の hide を解除。
pub fn remove(conn: &Connection, widget_id: &str, item_target: &str) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM widget_item_hides WHERE widget_id = ?1 AND item_target = ?2",
        params![widget_id, item_target],
    )?;
    Ok(())
}

/// アイテムライフサイクル契約 (Bug 7 / D14 rename): folder rename イベントで
/// `widget_item_hides.item_target` (= scan entry key 空間、 forward-slash 正規化済) を
/// 一括 prefix 書き換えする。 戻り値は影響を受けた hide 行数。
pub fn rename_path_prefix(
    conn: &Connection,
    old_path: &std::path::Path,
    new_path: &std::path::Path,
) -> Result<usize, AppError> {
    let old = old_path.to_string_lossy().into_owned();
    let new = new_path.to_string_lossy().into_owned();
    let old_fwd = old.trim_end_matches(['/', '\\']).replace('\\', "/");
    let new_fwd = new.trim_end_matches(['/', '\\']).replace('\\', "/");
    let prefix = format!("{}/%", old_fwd);
    let mut rows = conn.execute(
        "UPDATE widget_item_hides SET item_target = ?1 WHERE item_target = ?2",
        params![&new_fwd, &old_fwd],
    )?;
    let keep_from = (old_fwd.len() + 1) as i64;
    rows += conn.execute(
        "UPDATE widget_item_hides SET item_target = ?1 || substr(item_target, ?2)
         WHERE item_target LIKE ?3",
        params![&new_fwd, keep_from, &prefix],
    )?;
    Ok(rows)
}

/// widget_id の hide リスト (item_target 列)。
pub fn list_by_widget(conn: &Connection, widget_id: &str) -> Result<Vec<String>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT item_target FROM widget_item_hides WHERE widget_id = ?1 ORDER BY created_at",
    )?;
    let rows = stmt
        .query_map([widget_id], |row| row.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    fn seed_widget(conn: &Connection, widget_id: &str) {
        // workspaces / workspace_widgets に minimum row を挿入 (FK 充足のため)
        conn.execute(
            "INSERT INTO workspaces (id, name, sort_order, wallpaper_opacity, wallpaper_blur)
             VALUES ('ws1', 'WS', 0, 0.6, 0)",
            [],
        )
        .ok();
        conn.execute(
            "INSERT INTO workspace_widgets (id, workspace_id, widget_type, position_x, position_y, width, height)
             VALUES (?1, 'ws1', 'item', 0, 0, 2, 2)",
            params![widget_id],
        )
        .unwrap();
    }

    #[test]
    fn add_then_list_returns_targets() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        seed_widget(&conn, "w1");
        add(&conn, "w1", "C:/games/a.exe").unwrap();
        add(&conn, "w1", "C:/games/b.exe").unwrap();
        let hides = list_by_widget(&conn, "w1").unwrap();
        assert_eq!(hides.len(), 2);
        assert!(hides.contains(&"C:/games/a.exe".to_string()));
        assert!(hides.contains(&"C:/games/b.exe".to_string()));
    }

    #[test]
    fn add_is_idempotent() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        seed_widget(&conn, "w1");
        add(&conn, "w1", "C:/x").unwrap();
        add(&conn, "w1", "C:/x").unwrap();
        let hides = list_by_widget(&conn, "w1").unwrap();
        assert_eq!(hides.len(), 1);
    }

    #[test]
    fn remove_deletes_only_matching_row() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        seed_widget(&conn, "w1");
        add(&conn, "w1", "C:/a").unwrap();
        add(&conn, "w1", "C:/b").unwrap();
        remove(&conn, "w1", "C:/a").unwrap();
        let hides = list_by_widget(&conn, "w1").unwrap();
        assert_eq!(hides.len(), 1);
        assert_eq!(hides[0], "C:/b");
    }

    #[test]
    fn list_returns_empty_for_unknown_widget() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        let hides = list_by_widget(&conn, "nonexistent").unwrap();
        assert!(hides.is_empty());
    }

    #[test]
    fn cascade_delete_on_widget_removal() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        seed_widget(&conn, "w1");
        add(&conn, "w1", "C:/a").unwrap();
        // workspace_widgets row を削除 → FK CASCADE で widget_item_hides も消える
        conn.execute("DELETE FROM workspace_widgets WHERE id = 'w1'", [])
            .unwrap();
        let hides = list_by_widget(&conn, "w1").unwrap();
        assert!(hides.is_empty());
    }

    #[test]
    fn hides_are_per_widget_independent() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        seed_widget(&conn, "w1");
        // 2 個目 widget を追加
        conn.execute(
            "INSERT INTO workspace_widgets (id, workspace_id, widget_type, position_x, position_y, width, height)
             VALUES ('w2', 'ws1', 'item', 2, 0, 2, 2)",
            [],
        )
        .unwrap();
        add(&conn, "w1", "C:/shared").unwrap();
        // 別 widget で同 target を hide しても影響しない
        let w1 = list_by_widget(&conn, "w1").unwrap();
        let w2 = list_by_widget(&conn, "w2").unwrap();
        assert_eq!(w1.len(), 1);
        assert_eq!(w2.len(), 0);
    }
}
