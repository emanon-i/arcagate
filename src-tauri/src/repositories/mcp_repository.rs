use rusqlite::{params, Connection};

use crate::models::mcp::McpPermission;
use crate::utils::error::AppError;

fn row_to_permission(row: &rusqlite::Row) -> rusqlite::Result<McpPermission> {
    let is_allowed_int: i64 = row.get(2)?;
    Ok(McpPermission {
        id: row.get(0)?,
        tool_name: row.get(1)?,
        is_allowed: is_allowed_int != 0,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
    })
}

/// ツール名に対応するパーミッションを返す。存在しないツール名は安全側フォールバックで false。
pub fn is_tool_allowed(conn: &Connection, tool_name: &str) -> Result<bool, AppError> {
    let result = conn.query_row(
        "SELECT id, tool_name, is_allowed, created_at, updated_at
         FROM mcp_permissions WHERE tool_name = ?1",
        params![tool_name],
        row_to_permission,
    );
    match result {
        Ok(p) => Ok(p.is_allowed),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(false),
        Err(e) => Err(AppError::Database(e)),
    }
}

pub fn set_tool_allowed(conn: &Connection, tool_name: &str, allowed: bool) -> Result<(), AppError> {
    let rows = conn.execute(
        "UPDATE mcp_permissions
         SET is_allowed = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE tool_name = ?2",
        params![allowed as i64, tool_name],
    )?;
    if rows == 0 {
        return Err(AppError::NotFound(format!(
            "unknown MCP tool: {}",
            tool_name
        )));
    }
    Ok(())
}

#[allow(dead_code)]
pub fn find_all(conn: &Connection) -> Result<Vec<McpPermission>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, tool_name, is_allowed, created_at, updated_at
         FROM mcp_permissions ORDER BY tool_name",
    )?;
    let permissions = stmt
        .query_map([], row_to_permission)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(permissions)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    #[test]
    fn test_default_permissions() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        let perms = find_all(&conn).unwrap();

        let list = perms
            .iter()
            .find(|p| p.tool_name == "arcagate_list")
            .unwrap();
        assert!(list.is_allowed);

        let search = perms
            .iter()
            .find(|p| p.tool_name == "arcagate_search")
            .unwrap();
        assert!(search.is_allowed);

        let launch = perms
            .iter()
            .find(|p| p.tool_name == "arcagate_launch")
            .unwrap();
        assert!(!launch.is_allowed);

        let create = perms
            .iter()
            .find(|p| p.tool_name == "arcagate_create")
            .unwrap();
        assert!(!create.is_allowed);
    }

    #[test]
    fn test_set_tool_allowed_toggle() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        assert!(!is_tool_allowed(&conn, "arcagate_launch").unwrap());
        set_tool_allowed(&conn, "arcagate_launch", true).unwrap();
        assert!(is_tool_allowed(&conn, "arcagate_launch").unwrap());
        set_tool_allowed(&conn, "arcagate_launch", false).unwrap();
        assert!(!is_tool_allowed(&conn, "arcagate_launch").unwrap());
    }

    #[test]
    fn test_unknown_tool_returns_false() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        assert!(!is_tool_allowed(&conn, "nonexistent_tool").unwrap());
    }

    #[test]
    fn test_find_all_returns_four_entries() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();
        let perms = find_all(&conn).unwrap();
        assert_eq!(perms.len(), 4);
    }

    #[test]
    fn test_set_tool_allowed_create() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        assert!(!is_tool_allowed(&conn, "arcagate_create").unwrap());
        set_tool_allowed(&conn, "arcagate_create", true).unwrap();
        assert!(is_tool_allowed(&conn, "arcagate_create").unwrap());
    }
}
