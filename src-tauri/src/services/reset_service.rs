//! #5: クリーン状態リセット (factory reset) サービス。
//!
//! ライブラリ / ワークスペースのランタイム永続化データを段階選択で初期化する。
//! 設定 (config / localStorage) のリセットは frontend の `resetAllSettings` (K-4)
//! が担当するため、本サービスは DB のユーザーデータ削除のみを行う。
//!
//! - builtin テーマ / builtin Opener は削除対象外 (`is_builtin = 0` のみ削除)。
//! - 全削除を 1 トランザクションで実行 (途中失敗時は全ロールバック)。
//! - system タグは起動時の `ensure_system_tags` が冪等に再生成する。

use crate::db::DbState;
use crate::utils::error::AppError;

/// ライブラリ / ワークスペースデータを段階選択で初期化する。
pub fn factory_reset(
    db: &DbState,
    reset_library: bool,
    reset_workspace: bool,
) -> Result<(), AppError> {
    let mut conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let tx = conn.transaction()?;

    if reset_library {
        // アイテムライフサイクル契約 (Bug 3 修正): reset_workspace=false で workspace_widgets
        // が残る場合に widget config JSON の item_ids が全件 dangling になるのを防ぐため、
        // items 削除前に全 widget config から item_id / item_ids を strip する。
        // 旧実装は raw `DELETE FROM items` のみで、 config に存在しない id 参照が永続残留していた。
        // reset_workspace=true の場合は下流で workspace_widgets ごと消えるため strip 不要だが、
        // どちらの順序でも contract を満たすため両分岐で実行。
        let item_ids: Vec<String> = {
            let mut stmt = tx.prepare("SELECT id FROM items")?;
            let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
            rows.collect::<Result<Vec<_>, _>>()?
        };
        for id in &item_ids {
            crate::repositories::workspace_repository::cascade_remove_item_from_widgets(&tx, id)?;
        }
        // widget_item_hides は item_ids strip 後に明示 DELETE (item へ FK 無いため CASCADE
        // しない)。 hide 記録自体も reset 対象 = 「クリーン状態」 に戻す意図。
        tx.execute("DELETE FROM item_tags", [])?;
        tx.execute("DELETE FROM items", [])?;
        tx.execute("DELETE FROM tags", [])?;
        tx.execute("DELETE FROM launch_log", [])?;
        tx.execute("DELETE FROM item_stats", [])?;
        tx.execute("DELETE FROM widget_item_hides", [])?;
        tx.execute("DELETE FROM icon_cache", [])?;
        // openers テーブルは user 定義 custom のみ (builtin は compiled-in、DB 非保存)
        // のため全削除で OK。builtin テーマ (is_builtin=1) は残す。
        tx.execute("DELETE FROM openers", [])?;
        tx.execute("DELETE FROM themes WHERE is_builtin = 0", [])?;
    }

    if reset_workspace {
        // workspace_widgets は workspaces への FK cascade で消えるが明示削除。
        tx.execute("DELETE FROM workspace_widgets", [])?;
        tx.execute("DELETE FROM workspaces", [])?;
        tx.execute("DELETE FROM watched_paths", [])?;
    }

    tx.commit()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    #[test]
    fn test_factory_reset_library_deletes_custom_themes_keeps_builtin() {
        let db = initialize_in_memory();
        {
            let conn = db.0.lock().unwrap();
            // custom (非 builtin) テーマを 1 件追加。
            conn.execute(
                "INSERT INTO themes (id, name, base_theme, css_vars, is_builtin) \
                 VALUES ('custom-x', 'Custom X', 'dark', '{}', 0)",
                [],
            )
            .unwrap();
        }
        factory_reset(&db, true, false).unwrap();
        let conn = db.0.lock().unwrap();
        // library reset で custom テーマは削除、builtin (PH-CF-800 F1 / migration 041 で 6 本)
        // は残る。 3 系統 × Dark/Light = dark / light / brutalist / brutalist-dark /
        // neumorph / neumorph-dark (HUD は migration 041 で削除済)。
        let themes: i64 = conn
            .query_row("SELECT COUNT(*) FROM themes", [], |r| r.get(0))
            .unwrap();
        assert_eq!(themes, 6, "builtin テーマのみ残る (custom は削除)");
        let custom: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM themes WHERE id = 'custom-x'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(custom, 0, "custom テーマは reset で削除");
    }

    #[test]
    fn test_factory_reset_workspace_clears_workspaces() {
        let db = initialize_in_memory();
        {
            let conn = db.0.lock().unwrap();
            conn.execute(
                "INSERT INTO workspaces (id, name, sort_order) VALUES ('w1','WS',0)",
                [],
            )
            .unwrap();
        }
        factory_reset(&db, false, true).unwrap();
        let conn = db.0.lock().unwrap();
        let ws: i64 = conn
            .query_row("SELECT COUNT(*) FROM workspaces", [], |r| r.get(0))
            .unwrap();
        assert_eq!(ws, 0, "workspace reset で workspaces は全削除");
    }

    #[test]
    fn test_factory_reset_no_scope_is_noop() {
        let db = initialize_in_memory();
        {
            let conn = db.0.lock().unwrap();
            conn.execute(
                "INSERT INTO workspaces (id, name, sort_order) VALUES ('w1','WS',0)",
                [],
            )
            .unwrap();
        }
        factory_reset(&db, false, false).unwrap();
        let conn = db.0.lock().unwrap();
        let ws: i64 = conn
            .query_row("SELECT COUNT(*) FROM workspaces", [], |r| r.get(0))
            .unwrap();
        assert_eq!(ws, 1, "スコープ未選択なら何も削除しない");
    }
}
