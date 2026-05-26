use uuid::Uuid;

use crate::db::DbState;
use crate::models::config::{DEFAULT_THEME_MODE, KEY_THEME_MODE};
use crate::models::theme::{CreateThemeInput, Theme, UpdateThemeInput};
use crate::repositories::{config_repository, theme_repository};
use crate::utils::error::AppError;

/// PH-CF-800 F6: カスタムテーマの作成上限 (builtin は対象外、 `is_builtin = 1` を除いた件数)。
///
/// 上限の根拠: daily-use launcher の typical 利用範囲 (< 10 本) を大きく上回り、 import
/// loop / accidental flood で DB を肥大させない緩い stop-loss として 50 本に設定。
/// `create_theme` と `import_theme_json` の両方で同じ MAX を検査する契約
/// (`features/backend/theme-service.md` §カスタムテーマ上限契約)。
///
/// UI (`SettingsAppearancePane.svelte`) は常時「N / MAX」 を表示し、 上限到達でボタン disabled。
pub const MAX_CUSTOM_THEMES: usize = 50;

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

/// PH-CF-800 F6: 現在のカスタムテーマ件数 (`is_builtin = 0`)。 UI / 上限チェック共用。
pub fn count_custom_themes(db: &DbState) -> Result<usize, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let all = theme_repository::find_all(&conn)?;
    Ok(all.iter().filter(|t| !t.is_builtin).count())
}

/// PH-CF-800 F6: カスタムテーマが上限に達しているか否かを共用 check (create / import で再利用)。
fn ensure_custom_theme_capacity(conn: &rusqlite::Connection) -> Result<(), AppError> {
    let all = theme_repository::find_all(conn)?;
    let custom_count = all.iter().filter(|t| !t.is_builtin).count();
    if custom_count >= MAX_CUSTOM_THEMES {
        return Err(AppError::InvalidInput(format!(
            "custom theme limit reached ({} / {})",
            custom_count, MAX_CUSTOM_THEMES
        )));
    }
    Ok(())
}

pub fn create_theme(db: &DbState, input: CreateThemeInput) -> Result<Theme, AppError> {
    validate_theme_name(&input.name)?;
    validate_base_theme(&input.base_theme)?;
    validate_css_vars(&input.css_vars)?;

    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    // PH-CF-800 F6: MAX_CUSTOM_THEMES 超過は早期 reject (`features/backend/theme-service.md`
    // §カスタムテーマ上限契約)。
    ensure_custom_theme_capacity(&conn)?;
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

    // mode は実在する theme ID ('dark' / 'light' / 'brutalist' / 'brutalist-dark' /
    // 'neumorph' / 'neumorph-dark' / custom) でなければならない。 PH-CF-800 F1 で
    // HUD は builtin から削除。 OS 追従 ('system') は migration 036 で撤廃済。
    theme_repository::find_by_id(&conn, mode)?;

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
    // PH-CF-800 F6: import 経路でも create と同じ MAX_CUSTOM_THEMES を検査 (loop import で
    // DB が肥大しないように、 `features/backend/theme-service.md` §カスタムテーマ上限契約)。
    ensure_custom_theme_capacity(&conn)?;

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
        // PH-CF-800 F1 (migration 041): builtin は 6 本 (3 系統 × Dark/Light、 HUD 削除済)。
        assert_eq!(themes.len(), 6);
    }

    #[test]
    fn test_get_theme() {
        let db = initialize_in_memory();
        let theme = get_theme(&db, "dark").unwrap();
        assert_eq!(theme.name, "Dark");
    }

    #[test]
    fn test_builtin_themes_v2_set() {
        // PH-CF-800 F1 (migration 041): built-in は 6 本
        // (3 系統 × Dark/Light = dark / light / brutalist / brutalist-dark / neumorph / neumorph-dark)。
        // HUD は削除済。
        let db = initialize_in_memory();
        let themes = list_themes(&db).unwrap();
        let mut ids: Vec<&str> = themes.iter().map(|t| t.id.as_str()).collect();
        ids.sort_unstable();
        assert_eq!(
            ids,
            vec![
                "brutalist",
                "brutalist-dark",
                "dark",
                "light",
                "neumorph",
                "neumorph-dark",
            ]
        );
        let light = get_theme(&db, "light").unwrap();
        assert_eq!(light.name, "Light");
        assert_eq!(light.base_theme, "light");
        let brutalist_dark = get_theme(&db, "brutalist-dark").unwrap();
        assert_eq!(brutalist_dark.base_theme, "dark");
        let neumorph_dark = get_theme(&db, "neumorph-dark").unwrap();
        assert_eq!(neumorph_dark.base_theme, "dark");
    }

    /// F3 根治 (migration 043): 6 builtin の `css_vars` が空 '{}' ではなく実値 JSON を持ち、
    /// 主要 token (LAYER 1 seeds + LAYER 2 primitives) を含むこと。 これが満たされていれば
    /// `cloneTheme(sourceId)` で `source.css_vars` をそのまま copy しても新 custom (`data-theme=<uuid>`)
    /// に source の aesthetic が伝播する (= F3 clone bug の根治条件)。
    #[test]
    fn test_builtin_themes_have_non_empty_css_vars_with_core_tokens() {
        let db = initialize_in_memory();
        // 主要 token は LAYER 1 seeds (--c-bg / --c-fg / --c-primary) と LAYER 2 primitives
        // (--surface-blur / --ag-radius-lg)。 これらが揃っていれば clone した custom theme でも
        // 同じ aesthetic が再現する (audit doc §1 で実測 mismatch していた 5 token を網羅)。
        const REQUIRED_TOKENS: &[&str] = &[
            "--c-bg",
            "--c-fg",
            "--c-primary",
            "--surface-blur",
            "--ag-radius-lg",
        ];
        for id in [
            "dark",
            "light",
            "brutalist",
            "brutalist-dark",
            "neumorph",
            "neumorph-dark",
        ] {
            let theme = get_theme(&db, id).unwrap();
            assert!(theme.is_builtin, "{id} must be builtin");
            assert_ne!(
                theme.css_vars, "{}",
                "{id}: css_vars must not be empty (F3 clone bug — \
                 empty css_vars が clone で伝播し default Dark/Light に化ける)"
            );
            let parsed: serde_json::Value = serde_json::from_str(&theme.css_vars)
                .unwrap_or_else(|e| panic!("{id}: css_vars must be valid JSON: {e}"));
            let map = parsed
                .as_object()
                .unwrap_or_else(|| panic!("{id}: css_vars must be a JSON object"));
            for token in REQUIRED_TOKENS {
                assert!(
                    map.contains_key(*token),
                    "{id}: css_vars must contain {token} (clone fidelity required)"
                );
                let v = map.get(*token).unwrap();
                assert!(
                    v.is_string() && !v.as_str().unwrap().is_empty(),
                    "{id}: {token} must be a non-empty string"
                );
            }
        }
    }

    /// F3 根治 (migration 043): 各 builtin の aesthetic-defining token が CSS block と整合する
    /// ことを spot-check。 brutalist 系は `--ag-radius-lg = 0px` / `--surface-blur = none`、
    /// neumorph 系は `--ag-radius-lg = 24px` / `--surface-blur = none` 等、 audit doc §1 で実測
    /// mismatch していた値を逆引きで verify。
    #[test]
    fn test_builtin_themes_aesthetic_signatures() {
        let db = initialize_in_memory();

        fn get_token<'a>(css_vars: &'a str, key: &str) -> String {
            let parsed: serde_json::Value = serde_json::from_str(css_vars).unwrap();
            parsed
                .get(key)
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string()
        }

        // brutalist-dark: 純黒背景 + red-orange accent + 角丸 0 + blur 無し
        let brutalist_dark = get_theme(&db, "brutalist-dark").unwrap();
        assert_eq!(
            get_token(&brutalist_dark.css_vars, "--c-bg"),
            "oklch(0.14 0 0)"
        );
        assert_eq!(get_token(&brutalist_dark.css_vars, "--ag-radius-lg"), "0px");
        assert_eq!(
            get_token(&brutalist_dark.css_vars, "--surface-blur"),
            "none"
        );

        // brutalist (light): 純白 + 鮮烈 red + 角丸 0 + blur 無し
        let brutalist = get_theme(&db, "brutalist").unwrap();
        assert_eq!(get_token(&brutalist.css_vars, "--ag-radius-lg"), "0px");
        assert_eq!(get_token(&brutalist.css_vars, "--surface-blur"), "none");

        // neumorph (light): 大きめ角丸 24px + muted purple primary + blur 無し
        let neumorph = get_theme(&db, "neumorph").unwrap();
        assert_eq!(get_token(&neumorph.css_vars, "--ag-radius-lg"), "24px");
        assert_eq!(get_token(&neumorph.css_vars, "--surface-blur"), "none");

        // neumorph-dark: 同様に 24px + blur 無し
        let neumorph_dark = get_theme(&db, "neumorph-dark").unwrap();
        assert_eq!(get_token(&neumorph_dark.css_vars, "--ag-radius-lg"), "24px");
        assert_eq!(get_token(&neumorph_dark.css_vars, "--surface-blur"), "none");

        // dark (glass): blur あり + 角丸 22px (LAYER 2 デフォルト)
        let dark = get_theme(&db, "dark").unwrap();
        assert!(get_token(&dark.css_vars, "--surface-blur").contains("blur("));
        assert_eq!(get_token(&dark.css_vars, "--ag-radius-lg"), "22px");

        // light (glass): blur あり + 角丸 22px
        let light = get_theme(&db, "light").unwrap();
        assert!(get_token(&light.css_vars, "--surface-blur").contains("blur("));
        assert_eq!(get_token(&light.css_vars, "--ag-radius-lg"), "22px");
    }

    /// F3 根治 (migration 043): user 作成 custom theme (is_builtin=0) は migration 043 に
    /// 触られず元の css_vars (空 '{}' を含む) のまま残る。 過去の壊れた cloneTheme で空 cssVars
    /// の custom が作られていた場合、 ユーザーの編集成果物を不可逆に書き換えてしまわないため。
    #[test]
    fn test_migration_043_does_not_touch_custom_themes() {
        let db = initialize_in_memory();
        // 空 css_vars の custom を 1 本作る (= 過去の壊れた cloneTheme で生成された相当)。
        let custom = create_theme(
            &db,
            CreateThemeInput {
                name: "Broken Clone (legacy)".to_string(),
                base_theme: "dark".to_string(),
                css_vars: "{}".to_string(),
            },
        )
        .unwrap();
        // migration はすでに適用済 (initialize_in_memory が全 migration 走らせる) なので、
        // custom theme は空 '{}' のままで残っているはず。
        let after = get_theme(&db, &custom.id).unwrap();
        assert_eq!(after.css_vars, "{}", "custom theme must not be touched");
        assert!(!after.is_builtin);
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
        // PH-CF-800 F1 (migration 041): 6 builtins (3 系統 × Dark/Light)
        assert_eq!(all.len(), 6);
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
        // #7: 初回起動 default は Dark テーマ
        assert_eq!(mode, "dark");
    }

    #[test]
    fn test_set_active_theme_mode_valid() {
        let db = initialize_in_memory();
        // PH-CF-800 F1: 有効値は実在する builtin theme ID
        // ('dark' / 'light' / 'brutalist' / 'brutalist-dark' / 'neumorph' / 'neumorph-dark')。
        // HUD は削除済のため reject される (test_set_active_theme_mode_rejects_unknown_id を参照)。
        set_active_theme_mode(&db, "light").unwrap();
        assert_eq!(get_active_theme_mode(&db).unwrap(), "light");

        set_active_theme_mode(&db, "brutalist-dark").unwrap();
        assert_eq!(get_active_theme_mode(&db).unwrap(), "brutalist-dark");

        set_active_theme_mode(&db, "neumorph-dark").unwrap();
        assert_eq!(get_active_theme_mode(&db).unwrap(), "neumorph-dark");

        set_active_theme_mode(&db, "dark").unwrap();
        assert_eq!(get_active_theme_mode(&db).unwrap(), "dark");
    }

    #[test]
    fn test_set_active_theme_mode_rejects_unknown_id() {
        let db = initialize_in_memory();
        // 実在しない theme ID は reject
        assert!(set_active_theme_mode(&db, "no-such-theme").is_err());
        // OS 追従撤廃: 'system' も実在 theme ID ではないので reject される (migration 036)
        assert!(set_active_theme_mode(&db, "system").is_err());
        // PH-CF-800 F1 (migration 041): HUD は builtin から削除済 → reject される
        // audit-no-hud-references:ok (この assertion 自体が削除を verify)
        assert!(set_active_theme_mode(&db, "hud").is_err());
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
        let json = export_theme_json(&db, "dark").unwrap();
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

    /// PH-CF-800 F6: create が MAX_CUSTOM_THEMES を超えたら InvalidInput を返す。
    #[test]
    fn test_create_theme_enforces_custom_theme_limit() {
        let db = initialize_in_memory();
        // MAX 本まで作る
        for i in 0..MAX_CUSTOM_THEMES {
            create_theme(
                &db,
                CreateThemeInput {
                    name: format!("Custom-{i}"),
                    base_theme: "dark".to_string(),
                    css_vars: "{}".to_string(),
                },
            )
            .unwrap();
        }
        // MAX + 1 本目は reject
        let result = create_theme(
            &db,
            CreateThemeInput {
                name: "OverLimit".to_string(),
                base_theme: "dark".to_string(),
                css_vars: "{}".to_string(),
            },
        );
        assert!(matches!(result, Err(AppError::InvalidInput(_))));
    }

    /// PH-CF-800 F6: import も同じ MAX を検査する (loop import 防止)。
    #[test]
    fn test_import_theme_enforces_custom_theme_limit() {
        let db = initialize_in_memory();
        for i in 0..MAX_CUSTOM_THEMES {
            create_theme(
                &db,
                CreateThemeInput {
                    name: format!("Imp-{i}"),
                    base_theme: "dark".to_string(),
                    css_vars: "{}".to_string(),
                },
            )
            .unwrap();
        }
        let json = r#"{
            "id": "any",
            "name": "Imported",
            "base_theme": "dark",
            "css_vars": "{}",
            "is_builtin": false,
            "created_at": "",
            "updated_at": ""
        }"#;
        let result = import_theme_json(&db, json);
        assert!(matches!(result, Err(AppError::InvalidInput(_))));
    }

    #[test]
    fn test_count_custom_themes() {
        let db = initialize_in_memory();
        assert_eq!(count_custom_themes(&db).unwrap(), 0);
        create_theme(
            &db,
            CreateThemeInput {
                name: "A".to_string(),
                base_theme: "dark".to_string(),
                css_vars: "{}".to_string(),
            },
        )
        .unwrap();
        create_theme(
            &db,
            CreateThemeInput {
                name: "B".to_string(),
                base_theme: "dark".to_string(),
                css_vars: "{}".to_string(),
            },
        )
        .unwrap();
        assert_eq!(count_custom_themes(&db).unwrap(), 2);
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

/// V1 解消 (A3 PR-A): AppServices 集約パターン用の service struct。
/// 各 method は同 module の free function に delegate (scope 限定のため既存実装は維持)。
pub struct ThemeService {
    db: std::sync::Arc<crate::db::DbState>,
}

impl ThemeService {
    pub fn new(db: std::sync::Arc<crate::db::DbState>) -> Self {
        Self { db }
    }

    pub fn list_themes(&self) -> Result<Vec<Theme>, AppError> {
        list_themes(&self.db)
    }

    pub fn get_theme(&self, id: &str) -> Result<Theme, AppError> {
        get_theme(&self.db, id)
    }

    pub fn create_theme(&self, input: CreateThemeInput) -> Result<Theme, AppError> {
        create_theme(&self.db, input)
    }

    pub fn update_theme(&self, id: &str, input: UpdateThemeInput) -> Result<Theme, AppError> {
        update_theme(&self.db, id, input)
    }

    pub fn delete_theme(&self, id: &str) -> Result<(), AppError> {
        delete_theme(&self.db, id)
    }

    pub fn get_active_theme_mode(&self) -> Result<String, AppError> {
        get_active_theme_mode(&self.db)
    }

    pub fn set_active_theme_mode(&self, mode: &str) -> Result<(), AppError> {
        set_active_theme_mode(&self.db, mode)
    }

    pub fn export_theme_json(&self, id: &str) -> Result<String, AppError> {
        export_theme_json(&self.db, id)
    }

    pub fn import_theme_json(&self, json: &str) -> Result<Theme, AppError> {
        import_theme_json(&self.db, json)
    }

    /// PH-CF-800 F6: カスタムテーマ件数 + 上限の情報。 UI 「N / MAX」 表示用。
    pub fn get_custom_theme_quota(&self) -> Result<(usize, usize), AppError> {
        let used = count_custom_themes(&self.db)?;
        Ok((used, MAX_CUSTOM_THEMES))
    }
}
