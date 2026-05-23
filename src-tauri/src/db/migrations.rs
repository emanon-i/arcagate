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
const MIGRATION_019: &str = include_str!("../../migrations/019_widget_item_settings.sql");
const MIGRATION_020: &str = include_str!("../../migrations/020_openers.sql");
const MIGRATION_021: &str = include_str!("../../migrations/021_remove_clock_widget.sql");
const MIGRATION_022: &str = include_str!("../../migrations/022_icon_cache.sql");
const MIGRATION_023: &str = include_str!("../../migrations/023_drop_legacy_item_id.sql");
const MIGRATION_024: &str = include_str!("../../migrations/024_theme_palette_expansion.sql");
const MIGRATION_025: &str = include_str!("../../migrations/025_item_tags_index.sql");
const MIGRATION_026: &str = include_str!("../../migrations/026_drop_workspace_system_tags.sql");
const MIGRATION_027: &str = include_str!("../../migrations/027_workspace_system_tags_v2.sql");
const MIGRATION_028: &str = include_str!("../../migrations/028_drop_widget_item_settings.sql");
const MIGRATION_029: &str = include_str!("../../migrations/029_widget_item_hides.sql");
const MIGRATION_030: &str = include_str!("../../migrations/030_backfill_sys_type_tags.sql");
const MIGRATION_031: &str = include_str!("../../migrations/031_widget_grid_square_finer.sql");
const MIGRATION_032: &str = include_str!("../../migrations/032_consolidate_builtin_themes.sql");
const MIGRATION_033: &str = include_str!("../../migrations/033_confirmed_items.sql");
const MIGRATION_034: &str = include_str!("../../migrations/034_confirmed_scripts.sql");
const MIGRATION_035: &str = include_str!("../../migrations/035_design_tokens_v2.sql");
const MIGRATION_036: &str = include_str!("../../migrations/036_drop_system_theme_mode.sql");
const MIGRATION_037: &str =
    include_str!("../../migrations/037_system_monitor_chart_type_per_metric.sql");
const MIGRATION_038: &str = include_str!("../../migrations/038_card_override_drop_fit.sql");
const MIGRATION_039: &str = include_str!("../../migrations/039_items_source_back_link.sql");

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
        M::up(MIGRATION_019),
        M::up(MIGRATION_020),
        M::up(MIGRATION_021),
        M::up(MIGRATION_022),
        M::up(MIGRATION_023),
        M::up(MIGRATION_024),
        M::up(MIGRATION_025),
        M::up(MIGRATION_026),
        M::up(MIGRATION_027),
        M::up(MIGRATION_028),
        M::up(MIGRATION_029),
        M::up(MIGRATION_030),
        M::up(MIGRATION_031),
        M::up(MIGRATION_032),
        M::up(MIGRATION_033),
        M::up(MIGRATION_034),
        M::up(MIGRATION_035),
        M::up(MIGRATION_036),
        M::up(MIGRATION_037),
        M::up(MIGRATION_038),
        M::up(MIGRATION_039),
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
    fn test_migration_032_consolidates_themes_and_remaps_mode() {
        let mut conn = Connection::open_in_memory().unwrap();
        apply_pragmas(&conn).unwrap();
        let m = migrations();

        // migration 031 まで適用 (旧 builtin テーマ 8 件が揃った状態)
        m.to_version(&mut conn, 31).unwrap();
        let before: i64 = conn
            .query_row("SELECT COUNT(*) FROM themes", [], |r| r.get(0))
            .unwrap();
        assert_eq!(before, 8);

        // 削除対象テーマを指す theme_mode を持つ既存 user を再現
        conn.execute(
            "INSERT INTO config (key, value) VALUES ('theme_mode', 'theme-builtin-endfield')",
            [],
        )
        .unwrap();

        // migration 032 適用
        m.to_version(&mut conn, 32).unwrap();

        // builtin は Dark / Light の 2 本のみ (id は 'dark' / 'light')
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM themes", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 2);
        let light_base: String = conn
            .query_row(
                "SELECT base_theme FROM themes WHERE id = 'light'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(light_base, "light");
        let dark_name: String = conn
            .query_row("SELECT name FROM themes WHERE id = 'dark'", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(dark_name, "Dark");

        // 削除テーマを指していた theme_mode は 'dark' へ remap
        let mode: String = conn
            .query_row(
                "SELECT value FROM config WHERE key = 'theme_mode'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(mode, "dark");
    }

    #[test]
    fn test_migration_032_remaps_old_light_theme_id() {
        let mut conn = Connection::open_in_memory().unwrap();
        apply_pragmas(&conn).unwrap();
        let m = migrations();
        m.to_version(&mut conn, 31).unwrap();
        conn.execute(
            "INSERT INTO config (key, value) VALUES ('theme_mode', 'theme-builtin-light')",
            [],
        )
        .unwrap();
        m.to_version(&mut conn, 32).unwrap();
        let mode: String = conn
            .query_row(
                "SELECT value FROM config WHERE key = 'theme_mode'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(mode, "light");
    }

    #[test]
    fn test_migration_036_remaps_system_theme_mode_to_dark() {
        let mut conn = Connection::open_in_memory().unwrap();
        apply_pragmas(&conn).unwrap();
        let m = migrations();

        // migration 035 まで適用し、theme_mode = 'system' の既存 user を再現
        m.to_version(&mut conn, 35).unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO config (key, value) VALUES ('theme_mode', 'system')",
            [],
        )
        .unwrap();

        // migration 036 適用 → OS 追従撤廃により 'system' は 'dark' へフォールバック
        m.to_version(&mut conn, 36).unwrap();
        let mode: String = conn
            .query_row(
                "SELECT value FROM config WHERE key = 'theme_mode'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(mode, "dark");
    }

    #[test]
    fn test_migration_038_drops_fit_and_adds_rotation() {
        let mut conn = Connection::open_in_memory().unwrap();
        apply_pragmas(&conn).unwrap();
        let m = migrations();

        // migration 037 まで適用 (card_override_json column が揃った状態)
        m.to_version(&mut conn, 37).unwrap();

        // background.fit + 旧 schema field を持つ既存 override
        conn.execute(
            r##"INSERT INTO items (id, item_type, label, target, card_override_json)
               VALUES ('it-bg', 'exe', 'A', 'a.exe',
                       '{"background":{"fit":"center","mode":"image","focalX":10,"focalY":20,"offsetX":30,"offsetY":40},"style":{"textColor":"#fff"}}')"##,
            [],
        )
        .unwrap();
        // background を持たない override (opener のみ) は対象外
        conn.execute(
            r#"INSERT INTO items (id, item_type, label, target, card_override_json)
               VALUES ('it-nobg', 'url', 'B', 'https://x', '{"opener_id":"op1"}')"#,
            [],
        )
        .unwrap();

        // migration 038 適用
        m.to_version(&mut conn, 38).unwrap();

        let bg: String = conn
            .query_row(
                "SELECT card_override_json FROM items WHERE id = 'it-bg'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        // 撤廃 field は除去
        assert!(!bg.contains("\"fit\""), "fit should be removed: {bg}");
        assert!(!bg.contains("\"mode\""), "mode should be removed: {bg}");
        assert!(!bg.contains("focalX"), "focalX should be removed: {bg}");
        assert!(!bg.contains("focalY"), "focalY should be removed: {bg}");
        // offset / style は保持、rotation 0 が付与される
        assert!(bg.contains("offsetX"), "offsetX should be kept: {bg}");
        assert!(bg.contains("textColor"), "style should be kept: {bg}");
        assert!(
            bg.contains("\"rotation\":0"),
            "rotation:0 should be added: {bg}"
        );

        // background 無し override は無変更 (rotation は付与しない)
        let nobg: String = conn
            .query_row(
                "SELECT card_override_json FROM items WHERE id = 'it-nobg'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert!(
            !nobg.contains("rotation"),
            "no background → no rotation: {nobg}"
        );
        assert!(nobg.contains("op1"), "opener_id should be kept: {nobg}");
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
