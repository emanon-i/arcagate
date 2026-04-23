use rusqlite::{params, Connection};

use crate::models::theme::{Theme, UpdateThemeInput};
use crate::utils::error::AppError;

fn row_to_theme(row: &rusqlite::Row) -> rusqlite::Result<Theme> {
    Ok(Theme {
        id: row.get(0)?,
        name: row.get(1)?,
        base_theme: row.get(2)?,
        css_vars: row.get(3)?,
        is_builtin: row.get::<_, i64>(4)? != 0,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

pub fn insert(conn: &Connection, theme: &Theme) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO themes (id, name, base_theme, css_vars, is_builtin) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            theme.id,
            theme.name,
            theme.base_theme,
            theme.css_vars,
            theme.is_builtin as i64,
        ],
    )?;
    Ok(())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<Theme, AppError> {
    let result = conn.query_row(
        "SELECT id, name, base_theme, css_vars, is_builtin, created_at, updated_at FROM themes WHERE id = ?1",
        params![id],
        row_to_theme,
    );
    match result {
        Ok(theme) => Ok(theme),
        Err(rusqlite::Error::QueryReturnedNoRows) => Err(AppError::NotFound(id.to_string())),
        Err(e) => Err(AppError::Database(e)),
    }
}

pub fn find_all(conn: &Connection) -> Result<Vec<Theme>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, base_theme, css_vars, is_builtin, created_at, updated_at FROM themes ORDER BY is_builtin DESC, name",
    )?;
    let themes = stmt
        .query_map([], row_to_theme)?
        .collect::<rusqlite::Result<Vec<Theme>>>()?;
    Ok(themes)
}

pub fn update(conn: &Connection, id: &str, input: &UpdateThemeInput) -> Result<Theme, AppError> {
    let existing = find_by_id(conn, id)?;

    if existing.is_builtin {
        if let Some(ref name) = input.name {
            if name != &existing.name {
                return Err(AppError::InvalidInput(
                    "cannot rename builtin theme".to_string(),
                ));
            }
        }
    }

    let name = input.name.as_deref().unwrap_or(&existing.name);
    let base_theme = input.base_theme.as_deref().unwrap_or(&existing.base_theme);
    let css_vars = input.css_vars.as_deref().unwrap_or(&existing.css_vars);

    conn.execute(
        "UPDATE themes SET name = ?1, base_theme = ?2, css_vars = ?3, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?4",
        params![name, base_theme, css_vars, id],
    )?;
    find_by_id(conn, id)
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    let existing = find_by_id(conn, id)?;
    if existing.is_builtin {
        return Err(AppError::InvalidInput(
            "cannot delete builtin theme".to_string(),
        ));
    }
    conn.execute("DELETE FROM themes WHERE id = ?1", params![id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    fn make_theme(id: &str, name: &str, base_theme: &str, is_builtin: bool) -> Theme {
        Theme {
            id: id.to_string(),
            name: name.to_string(),
            base_theme: base_theme.to_string(),
            css_vars: "{}".to_string(),
            is_builtin,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }

    #[test]
    fn test_builtin_themes_seeded() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let themes = find_all(&conn).unwrap();
        assert_eq!(themes.len(), 4);
        assert!(themes.iter().all(|t| t.is_builtin));
        assert!(themes.iter().any(|t| t.id == "theme-builtin-dark"));
        assert!(themes.iter().any(|t| t.id == "theme-builtin-light"));
        assert!(themes.iter().any(|t| t.id == "theme-builtin-endfield"));
        assert!(themes
            .iter()
            .any(|t| t.id == "theme-builtin-ubuntu-frosted"));
    }

    #[test]
    fn test_insert_and_find_by_id() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let theme = make_theme("custom-001", "My Theme", "dark", false);
        insert(&conn, &theme).unwrap();

        let found = find_by_id(&conn, "custom-001").unwrap();
        assert_eq!(found.name, "My Theme");
        assert_eq!(found.base_theme, "dark");
        assert!(!found.is_builtin);
        assert!(!found.created_at.is_empty());
    }

    #[test]
    fn test_find_all_returns_builtin_and_custom() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_theme("custom-001", "Custom", "light", false)).unwrap();

        let themes = find_all(&conn).unwrap();
        assert_eq!(themes.len(), 5);
        // builtin first (is_builtin DESC), then custom
        assert!(themes[..4].iter().all(|t| t.is_builtin));
        assert!(!themes[4].is_builtin);
    }

    #[test]
    fn test_update_theme_css_vars() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_theme("custom-001", "Custom", "dark", false)).unwrap();

        let updated = update(
            &conn,
            "custom-001",
            &UpdateThemeInput {
                name: None,
                base_theme: None,
                css_vars: Some("{\"--ag-accent\": \"#ff0000\"}".to_string()),
            },
        )
        .unwrap();
        assert_eq!(updated.css_vars, "{\"--ag-accent\": \"#ff0000\"}");
    }

    #[test]
    fn test_update_builtin_name_rejected() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let result = update(
            &conn,
            "theme-builtin-dark",
            &UpdateThemeInput {
                name: Some("Renamed".to_string()),
                base_theme: None,
                css_vars: None,
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_delete_custom_theme() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_theme("custom-001", "Custom", "dark", false)).unwrap();
        delete(&conn, "custom-001").unwrap();

        let result = find_by_id(&conn, "custom-001");
        assert!(result.is_err());
    }

    #[test]
    fn test_delete_builtin_rejected() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let result = delete(&conn, "theme-builtin-dark");
        assert!(result.is_err());
    }

    #[test]
    fn test_name_unique_constraint() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_theme("custom-001", "Unique", "dark", false)).unwrap();
        let result = insert(&conn, &make_theme("custom-002", "Unique", "dark", false));
        assert!(result.is_err());
    }

    #[test]
    fn test_find_by_id_not_found() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let result = find_by_id(&conn, "nonexistent");
        assert!(result.is_err());
    }
}
