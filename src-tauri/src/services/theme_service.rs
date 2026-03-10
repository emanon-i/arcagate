use uuid::Uuid;

use crate::db::DbState;
use crate::models::config::{DEFAULT_THEME_MODE, KEY_THEME_MODE};
use crate::models::theme::{CreateThemeInput, Theme, UpdateThemeInput};
use crate::repositories::{config_repository, theme_repository};
use crate::utils::error::AppError;

fn validate_theme_name(name: &str) -> Result<(), AppError> {
    if name.trim().is_empty() {
        return Err(AppError::InvalidInput("name must not be empty".to_string()));
    }
    Ok(())
}

fn validate_base_theme(base_theme: &str) -> Result<(), AppError> {
    if base_theme != "dark" && base_theme != "light" {
        return Err(AppError::InvalidInput(format!(
            "base_theme must be 'dark' or 'light', got '{}'",
            base_theme
        )));
    }
    Ok(())
}

fn validate_css_vars(css_vars: &str) -> Result<(), AppError> {
    serde_json::from_str::<serde_json::Value>(css_vars)
        .map_err(|e| AppError::InvalidInput(format!("css_vars must be valid JSON: {}", e)))?;
    Ok(())
}

pub fn list_themes(db: &DbState) -> Result<Vec<Theme>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    theme_repository::find_all(&conn)
}

pub fn get_theme(db: &DbState, id: &str) -> Result<Theme, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    theme_repository::find_by_id(&conn, id)
}

pub fn create_theme(db: &DbState, input: CreateThemeInput) -> Result<Theme, AppError> {
    validate_theme_name(&input.name)?;
    validate_base_theme(&input.base_theme)?;
    validate_css_vars(&input.css_vars)?;

    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let id = Uuid::now_v7().to_string();

    let theme = Theme {
        id: id.clone(),
        name: input.name,
        base_theme: input.base_theme,
        css_vars: input.css_vars,
        is_builtin: false,
        created_at: String::new(),
        updated_at: String::new(),
    };

    theme_repository::insert(&conn, &theme)?;
    theme_repository::find_by_id(&conn, &id)
}

pub fn update_theme(db: &DbState, id: &str, input: UpdateThemeInput) -> Result<Theme, AppError> {
    if let Some(ref name) = input.name {
        validate_theme_name(name)?;
    }
    if let Some(ref base_theme) = input.base_theme {
        validate_base_theme(base_theme)?;
    }
    if let Some(ref css_vars) = input.css_vars {
        validate_css_vars(css_vars)?;
    }

    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    theme_repository::update(&conn, id, &input)
}

pub fn delete_theme(db: &DbState, id: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;

    // If deleting the active theme, reset to "dark"
    let current_mode =
        config_repository::get_or_default(&conn, KEY_THEME_MODE, DEFAULT_THEME_MODE)?;
    if current_mode == id {
        config_repository::set(&conn, KEY_THEME_MODE, DEFAULT_THEME_MODE)?;
    }

    theme_repository::delete(&conn, id)
}

pub fn get_active_theme_mode(db: &DbState) -> Result<String, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    config_repository::get_or_default(&conn, KEY_THEME_MODE, DEFAULT_THEME_MODE)
}

pub fn set_active_theme_mode(db: &DbState, mode: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;

    // "dark", "light", "system" are always valid
    match mode {
        "dark" | "light" | "system" => {}
        custom_id => {
            // Must be a valid theme ID
            theme_repository::find_by_id(&conn, custom_id)?;
        }
    }

    config_repository::set(&conn, KEY_THEME_MODE, mode)
}

pub fn export_theme_json(db: &DbState, id: &str) -> Result<String, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let theme = theme_repository::find_by_id(&conn, id)?;
    serde_json::to_string_pretty(&theme)
        .map_err(|e| AppError::InvalidInput(format!("failed to serialize theme: {}", e)))
}

pub fn import_theme_json(db: &DbState, json: &str) -> Result<Theme, AppError> {
    let imported: Theme = serde_json::from_str(json)
        .map_err(|e| AppError::InvalidInput(format!("invalid theme JSON: {}", e)))?;

    // Validate fields
    validate_theme_name(&imported.name)?;
    validate_base_theme(&imported.base_theme)?;
    validate_css_vars(&imported.css_vars)?;

    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;

    // Check name uniqueness
    let all = theme_repository::find_all(&conn)?;
    if all.iter().any(|t| t.name == imported.name) {
        return Err(AppError::InvalidInput(format!(
            "theme with name '{}' already exists",
            imported.name
        )));
    }

    // Assign new UUID
    let id = Uuid::now_v7().to_string();
    let theme = Theme {
        id: id.clone(),
        name: imported.name,
        base_theme: imported.base_theme,
        css_vars: imported.css_vars,
        is_builtin: false,
        created_at: String::new(),
        updated_at: String::new(),
    };

    theme_repository::insert(&conn, &theme)?;
    theme_repository::find_by_id(&conn, &id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    #[test]
    fn test_list_themes() {
        let db = initialize_in_memory();
        let themes = list_themes(&db).unwrap();
        assert_eq!(themes.len(), 2); // builtin dark + light
    }

    #[test]
    fn test_get_theme() {
        let db = initialize_in_memory();
        let theme = get_theme(&db, "theme-builtin-dark").unwrap();
        assert_eq!(theme.name, "Dark");
    }

    #[test]
    fn test_create_theme() {
        let db = initialize_in_memory();
        let theme = create_theme(
            &db,
            CreateThemeInput {
                name: "My Theme".to_string(),
                base_theme: "dark".to_string(),
                css_vars: "{\"--ag-accent\": \"#ff0000\"}".to_string(),
            },
        )
        .unwrap();
        assert_eq!(theme.name, "My Theme");
        assert!(!theme.is_builtin);
        assert!(!theme.id.is_empty());
    }

    #[test]
    fn test_create_validates_name() {
        let db = initialize_in_memory();
        let result = create_theme(
            &db,
            CreateThemeInput {
                name: "  ".to_string(),
                base_theme: "dark".to_string(),
                css_vars: "{}".to_string(),
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_create_validates_base_theme() {
        let db = initialize_in_memory();
        let result = create_theme(
            &db,
            CreateThemeInput {
                name: "Test".to_string(),
                base_theme: "invalid".to_string(),
                css_vars: "{}".to_string(),
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_create_validates_css_vars_json() {
        let db = initialize_in_memory();
        let result = create_theme(
            &db,
            CreateThemeInput {
                name: "Test".to_string(),
                base_theme: "dark".to_string(),
                css_vars: "not json".to_string(),
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_update_theme() {
        let db = initialize_in_memory();
        let theme = create_theme(
            &db,
            CreateThemeInput {
                name: "Before".to_string(),
                base_theme: "dark".to_string(),
                css_vars: "{}".to_string(),
            },
        )
        .unwrap();

        let updated = update_theme(
            &db,
            &theme.id,
            UpdateThemeInput {
                name: Some("After".to_string()),
                base_theme: None,
                css_vars: None,
            },
        )
        .unwrap();
        assert_eq!(updated.name, "After");
    }

    #[test]
    fn test_delete_theme() {
        let db = initialize_in_memory();
        let theme = create_theme(
            &db,
            CreateThemeInput {
                name: "ToDelete".to_string(),
                base_theme: "dark".to_string(),
                css_vars: "{}".to_string(),
            },
        )
        .unwrap();

        delete_theme(&db, &theme.id).unwrap();
        let all = list_themes(&db).unwrap();
        assert_eq!(all.len(), 2); // only builtins
    }

    #[test]
    fn test_delete_active_theme_resets_mode() {
        let db = initialize_in_memory();
        let theme = create_theme(
            &db,
            CreateThemeInput {
                name: "Active".to_string(),
                base_theme: "dark".to_string(),
                css_vars: "{}".to_string(),
            },
        )
        .unwrap();

        set_active_theme_mode(&db, &theme.id).unwrap();
        delete_theme(&db, &theme.id).unwrap();

        let mode = get_active_theme_mode(&db).unwrap();
        assert_eq!(mode, "dark");
    }

    #[test]
    fn test_get_active_theme_mode_default() {
        let db = initialize_in_memory();
        let mode = get_active_theme_mode(&db).unwrap();
        assert_eq!(mode, "dark");
    }

    #[test]
    fn test_set_active_theme_mode_valid() {
        let db = initialize_in_memory();
        set_active_theme_mode(&db, "light").unwrap();
        assert_eq!(get_active_theme_mode(&db).unwrap(), "light");

        set_active_theme_mode(&db, "system").unwrap();
        assert_eq!(get_active_theme_mode(&db).unwrap(), "system");

        set_active_theme_mode(&db, "dark").unwrap();
        assert_eq!(get_active_theme_mode(&db).unwrap(), "dark");
    }

    #[test]
    fn test_set_active_theme_mode_custom_id() {
        let db = initialize_in_memory();
        let theme = create_theme(
            &db,
            CreateThemeInput {
                name: "Custom".to_string(),
                base_theme: "dark".to_string(),
                css_vars: "{}".to_string(),
            },
        )
        .unwrap();

        set_active_theme_mode(&db, &theme.id).unwrap();
        assert_eq!(get_active_theme_mode(&db).unwrap(), theme.id);
    }

    #[test]
    fn test_set_active_theme_mode_invalid() {
        let db = initialize_in_memory();
        let result = set_active_theme_mode(&db, "nonexistent-id");
        assert!(result.is_err());
    }

    #[test]
    fn test_export_theme_json() {
        let db = initialize_in_memory();
        let json = export_theme_json(&db, "theme-builtin-dark").unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed["name"], "Dark");
    }

    #[test]
    fn test_import_creates_new_id() {
        let db = initialize_in_memory();
        let json = r#"{
            "id": "old-id",
            "name": "Imported",
            "base_theme": "dark",
            "css_vars": "{}",
            "is_builtin": false,
            "created_at": "",
            "updated_at": ""
        }"#;

        let imported = import_theme_json(&db, json).unwrap();
        assert_ne!(imported.id, "old-id");
        assert_eq!(imported.name, "Imported");
    }

    #[test]
    fn test_import_duplicate_name_rejected() {
        let db = initialize_in_memory();
        // "Dark" already exists as builtin
        let json = r#"{
            "id": "any",
            "name": "Dark",
            "base_theme": "dark",
            "css_vars": "{}",
            "is_builtin": false,
            "created_at": "",
            "updated_at": ""
        }"#;

        let result = import_theme_json(&db, json);
        assert!(result.is_err());
    }
}
