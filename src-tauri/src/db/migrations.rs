use rusqlite::Connection;
use rusqlite_migration::{Migrations, M};

const MIGRATION_001: &str = include_str!("../../migrations/001_initial.sql");
const MIGRATION_002: &str = include_str!("../../migrations/002_mcp_permissions.sql");
const MIGRATION_003: &str = include_str!("../../migrations/003_watched_paths.sql");
const MIGRATION_004: &str = include_str!("../../migrations/004_workspaces.sql");
const MIGRATION_005: &str = include_str!("../../migrations/005_mcp_workspace_permissions.sql");
const MIGRATION_006: &str = include_str!("../../migrations/006_themes.sql");
const MIGRATION_007: &str = include_str!("../../migrations/007_drop_mcp_permissions.sql");
const MIGRATION_008: &str = include_str!("../../migrations/008_category_to_tag.sql");
const MIGRATION_009: &str = include_str!("../../migrations/009_add_is_tracked.sql");
const MIGRATION_010: &str = include_str!("../../migrations/010_folder_default_app.sql");
const MIGRATION_011: &str = include_str!("../../migrations/011_builtin_theme_presets.sql");
const MIGRATION_012: &str = include_str!("../../migrations/012_liquid_glass_theme.sql");
const MIGRATION_013: &str = include_str!("../../migrations/013_endfield_enhanced.sql");
const MIGRATION_014: &str = include_str!("../../migrations/014_ubuntu_frosted_enhanced.sql");
const MIGRATION_015: &str = include_str!("../../migrations/015_liquid_glass_token_fix.sql");
const MIGRATION_016: &str = include_str!("../../migrations/016_card_override.sql");
const MIGRATION_017: &str = include_str!("../../migrations/017_drop_watched_folders.sql");
const MIGRATION_018: &str = include_str!("../../migrations/018_workspace_wallpaper.sql");

pub fn migrations() -> Migrations<'static> {
    Migrations::new(vec![
        M::up(MIGRATION_001),
        M::up(MIGRATION_002),
        M::up(MIGRATION_003),
        M::up(MIGRATION_004),
        M::up(MIGRATION_005),
        M::up(MIGRATION_006),
        M::up(MIGRATION_007),
        M::up(MIGRATION_008),
        M::up(MIGRATION_009),
        M::up(MIGRATION_010),
        M::up(MIGRATION_011),
        M::up(MIGRATION_012),
        M::up(MIGRATION_013),
        M::up(MIGRATION_014),
        M::up(MIGRATION_015),
        M::up(MIGRATION_016),
        M::up(MIGRATION_017),
        M::up(MIGRATION_018),
    ])
}

pub fn apply_pragmas(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;
         PRAGMA synchronous = NORMAL;
         PRAGMA cache_size = -8000;",
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migrations_apply_to_in_memory_db() {
        let mut conn = Connection::open_in_memory().unwrap();
        apply_pragmas(&conn).unwrap();
        migrations().to_latest(&mut conn).unwrap();

        // Verify tables exist
        let tables: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert!(tables.contains(&"items".to_string()));
        assert!(!tables.contains(&"categories".to_string()));
        assert!(tables.contains(&"tags".to_string()));
        assert!(tables.contains(&"launch_log".to_string()));
        assert!(tables.contains(&"item_stats".to_string()));
        assert!(tables.contains(&"config".to_string()));
        assert!(!tables.contains(&"item_categories".to_string()));
        assert!(tables.contains(&"item_tags".to_string()));
        assert!(!tables.contains(&"mcp_permissions".to_string()));
        assert!(tables.contains(&"watched_paths".to_string()));
        assert!(tables.contains(&"workspaces".to_string()));
        assert!(tables.contains(&"workspace_widgets".to_string()));
        assert!(tables.contains(&"themes".to_string()));
    }

    #[test]
    fn test_pragmas_are_set() {
        let conn = Connection::open_in_memory().unwrap();
        apply_pragmas(&conn).unwrap();

        let fk: bool = conn
            .pragma_query_value(None, "foreign_keys", |row| row.get(0))
            .unwrap();
        assert!(fk);

        let busy: i64 = conn
            .pragma_query_value(None, "busy_timeout", |row| row.get(0))
            .unwrap();
        assert_eq!(busy, 5000);
    }
}
