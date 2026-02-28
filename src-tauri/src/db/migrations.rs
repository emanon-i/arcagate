use rusqlite::Connection;
use rusqlite_migration::{Migrations, M};

const MIGRATION_001: &str = include_str!("../../migrations/001_initial.sql");

pub fn migrations() -> Migrations<'static> {
    Migrations::new(vec![M::up(MIGRATION_001)])
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
        assert!(tables.contains(&"categories".to_string()));
        assert!(tables.contains(&"tags".to_string()));
        assert!(tables.contains(&"launch_log".to_string()));
        assert!(tables.contains(&"item_stats".to_string()));
        assert!(tables.contains(&"config".to_string()));
        assert!(tables.contains(&"item_categories".to_string()));
        assert!(tables.contains(&"item_tags".to_string()));
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
