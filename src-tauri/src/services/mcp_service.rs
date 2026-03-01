use crate::db::DbState;
use crate::repositories::mcp_repository;
use crate::utils::error::AppError;

pub fn is_tool_allowed(db: &DbState, tool_name: &str) -> Result<bool, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    mcp_repository::is_tool_allowed(&conn, tool_name)
}

pub fn set_tool_allowed(db: &DbState, tool_name: &str, allowed: bool) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    mcp_repository::set_tool_allowed(&conn, tool_name, allowed)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    #[test]
    fn test_default_read_only() {
        let db = initialize_in_memory();
        assert!(is_tool_allowed(&db, "arcagate_list").unwrap());
        assert!(is_tool_allowed(&db, "arcagate_search").unwrap());
        assert!(!is_tool_allowed(&db, "arcagate_launch").unwrap());
        assert!(!is_tool_allowed(&db, "arcagate_create").unwrap());
    }

    #[test]
    fn test_grant_revoke_toggle() {
        let db = initialize_in_memory();
        set_tool_allowed(&db, "arcagate_launch", true).unwrap();
        assert!(is_tool_allowed(&db, "arcagate_launch").unwrap());
        set_tool_allowed(&db, "arcagate_launch", false).unwrap();
        assert!(!is_tool_allowed(&db, "arcagate_launch").unwrap());
    }
}
