use rusqlite::{params, Connection};

use crate::models::tag::{Tag, TagWithCount};
use crate::utils::error::AppError;

fn row_to_tag(row: &rusqlite::Row) -> rusqlite::Result<Tag> {
    let is_hidden_int: i64 = row.get(2)?;
    let is_system_int: i64 = row.get(3)?;
    Ok(Tag {
        id: row.get(0)?,
        name: row.get(1)?,
        is_hidden: is_hidden_int != 0,
        is_system: is_system_int != 0,
        prefix: row.get(4)?,
        icon: row.get(5)?,
        sort_order: row.get(6)?,
        created_at: row.get(7)?,
    })
}

pub fn insert(conn: &Connection, tag: &Tag) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO tags (id, name, is_hidden, is_system, prefix, icon, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            tag.id,
            tag.name,
            tag.is_hidden as i64,
            tag.is_system as i64,
            tag.prefix,
            tag.icon,
            tag.sort_order,
        ],
    )?;
    Ok(())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<Tag, AppError> {
    let result = conn.query_row(
        "SELECT id, name, is_hidden, is_system, prefix, icon, sort_order, created_at
         FROM tags WHERE id = ?1",
        params![id],
        row_to_tag,
    );
    match result {
        Ok(tag) => Ok(tag),
        Err(rusqlite::Error::QueryReturnedNoRows) => Err(AppError::NotFound(id.to_string())),
        Err(e) => Err(AppError::Database(e)),
    }
}

pub fn find_all(conn: &Connection) -> Result<Vec<Tag>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, is_hidden, is_system, prefix, icon, sort_order, created_at
         FROM tags ORDER BY sort_order, name",
    )?;
    let tags = stmt
        .query_map([], row_to_tag)?
        .collect::<rusqlite::Result<Vec<Tag>>>()?;
    Ok(tags)
}

pub fn find_all_with_counts(conn: &Connection) -> Result<Vec<TagWithCount>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, t.is_system, t.prefix, t.icon,
                (SELECT COUNT(*) FROM item_tags it
                 INNER JOIN items i ON i.id = it.item_id
                 WHERE it.tag_id = t.id AND i.is_enabled = 1) AS item_count
         FROM tags t
         WHERE t.is_hidden = 0
         ORDER BY t.sort_order, t.name",
    )?;
    let tags = stmt
        .query_map([], |row| {
            let is_system_int: i64 = row.get(2)?;
            Ok(TagWithCount {
                id: row.get(0)?,
                name: row.get(1)?,
                is_system: is_system_int != 0,
                prefix: row.get(3)?,
                icon: row.get(4)?,
                item_count: row.get(5)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<TagWithCount>>>()?;
    Ok(tags)
}

pub fn find_by_item_id(conn: &Connection, item_id: &str) -> Result<Vec<Tag>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, t.is_hidden, t.is_system, t.prefix, t.icon, t.sort_order, t.created_at
         FROM tags t
         INNER JOIN item_tags it ON it.tag_id = t.id
         WHERE it.item_id = ?1
         ORDER BY t.sort_order, t.name",
    )?;
    let tags = stmt
        .query_map(params![item_id], row_to_tag)?
        .collect::<rusqlite::Result<Vec<Tag>>>()?;
    Ok(tags)
}

#[allow(dead_code)]
pub fn find_system_tags(conn: &Connection) -> Result<Vec<Tag>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, is_hidden, is_system, prefix, icon, sort_order, created_at
         FROM tags WHERE is_system = 1 ORDER BY sort_order, name",
    )?;
    let tags = stmt
        .query_map([], row_to_tag)?
        .collect::<rusqlite::Result<Vec<Tag>>>()?;
    Ok(tags)
}

/// システムタグでないことを検証。システムタグなら InvalidInput を返す。
fn guard_not_system(conn: &Connection, id: &str) -> Result<(), AppError> {
    let is_system: i64 = conn
        .query_row(
            "SELECT is_system FROM tags WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(id.to_string()),
            _ => AppError::Database(e),
        })?;
    if is_system != 0 {
        return Err(AppError::InvalidInput(
            "system tags cannot be modified".to_string(),
        ));
    }
    Ok(())
}

pub fn update(conn: &Connection, id: &str, name: &str, is_hidden: bool) -> Result<(), AppError> {
    guard_not_system(conn, id)?;
    conn.execute(
        "UPDATE tags SET name = ?1, is_hidden = ?2 WHERE id = ?3",
        params![name, is_hidden as i64, id],
    )?;
    Ok(())
}

pub fn update_prefix(conn: &Connection, id: &str, prefix: Option<&str>) -> Result<(), AppError> {
    conn.execute(
        "UPDATE tags SET prefix = ?1 WHERE id = ?2 AND is_system = 0",
        params![prefix, id],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    guard_not_system(conn, id)?;
    conn.execute("DELETE FROM tags WHERE id = ?1", params![id])?;
    Ok(())
}

/// ワークスペースのシステムタグを作成/更新
pub fn upsert_system_tag(conn: &Connection, tag: &Tag) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO tags (id, name, is_hidden, is_system, prefix, icon, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name",
        params![
            tag.id,
            tag.name,
            tag.is_hidden as i64,
            tag.is_system as i64,
            tag.prefix,
            tag.icon,
            tag.sort_order,
        ],
    )?;
    Ok(())
}

/// IDでシステムタグを削除（ワークスペース削除時用）
pub fn delete_system_tag_by_id(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM tags WHERE id = ?1 AND is_system = 1",
        params![id],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    fn make_tag(id: &str, name: &str) -> Tag {
        Tag {
            id: id.to_string(),
            name: name.to_string(),
            is_hidden: false,
            is_system: false,
            prefix: None,
            icon: None,
            sort_order: 0,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        }
    }

    fn make_system_tag(id: &str, name: &str) -> Tag {
        Tag {
            id: id.to_string(),
            name: name.to_string(),
            is_hidden: false,
            is_system: true,
            prefix: None,
            icon: None,
            sort_order: -100,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn test_insert_find_all() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_tag("tag-001", "favorite")).unwrap();
        insert(&conn, &make_tag("tag-002", "work")).unwrap();

        let tags = find_all(&conn).unwrap();
        // system tags from migration + 2 user tags
        let user_tags: Vec<_> = tags.iter().filter(|t| !t.is_system).collect();
        assert_eq!(user_tags.len(), 2);
    }

    #[test]
    fn test_is_hidden_roundtrip() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let mut tag = make_tag("tag-001", "secret");
        tag.is_hidden = true;
        insert(&conn, &tag).unwrap();

        let found = find_by_id(&conn, "tag-001").unwrap();
        assert!(found.is_hidden);
    }

    #[test]
    fn test_update() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_tag("tag-001", "fav")).unwrap();
        update(&conn, "tag-001", "favorite", true).unwrap();

        let found = find_by_id(&conn, "tag-001").unwrap();
        assert_eq!(found.name, "favorite");
        assert!(found.is_hidden);
    }

    #[test]
    fn test_delete() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_tag("tag-001", "fav")).unwrap();
        delete(&conn, "tag-001").unwrap();

        let result = find_by_id(&conn, "tag-001");
        assert!(result.is_err());
    }

    #[test]
    fn test_system_tag_cannot_be_updated() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        // system tags are created by migration, use one of those
        let result = update(&conn, "sys-type-exe", "renamed", false);
        assert!(result.is_err());
    }

    #[test]
    fn test_system_tag_cannot_be_deleted() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let result = delete(&conn, "sys-type-exe");
        assert!(result.is_err());
    }

    #[test]
    fn test_find_all_with_counts() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_tag("tag-001", "games")).unwrap();

        let counts = find_all_with_counts(&conn).unwrap();
        // Should include system tags + user tags (all non-hidden)
        assert!(!counts.is_empty());
        let games = counts.iter().find(|t| t.name == "games");
        assert!(games.is_some());
        assert_eq!(games.unwrap().item_count, 0);
    }

    #[test]
    fn test_find_by_item_id() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_tag("tag-001", "favorite")).unwrap();

        // Create item and link
        conn.execute(
            "INSERT INTO items (id, item_type, label, target) VALUES ('item-001', 'exe', 'App', 'C:/app.exe')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO item_tags (item_id, tag_id) VALUES ('item-001', 'tag-001')",
            [],
        )
        .unwrap();

        let tags = find_by_item_id(&conn, "item-001").unwrap();
        // System tags assigned by migration won't exist for this item (manually inserted)
        // but the user tag should be there
        assert!(tags.iter().any(|t| t.name == "favorite"));
    }

    #[test]
    fn test_upsert_system_tag() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let tag = make_system_tag("sys-ws-test", "TestWorkspace");
        upsert_system_tag(&conn, &tag).unwrap();

        let found = find_by_id(&conn, "sys-ws-test").unwrap();
        assert_eq!(found.name, "TestWorkspace");
        assert!(found.is_system);

        // Update name via upsert
        let mut updated = tag.clone();
        updated.name = "RenamedWorkspace".to_string();
        upsert_system_tag(&conn, &updated).unwrap();

        let found = find_by_id(&conn, "sys-ws-test").unwrap();
        assert_eq!(found.name, "RenamedWorkspace");
    }

    #[test]
    fn test_delete_system_tag_by_id() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let tag = make_system_tag("sys-ws-del", "ToDelete");
        upsert_system_tag(&conn, &tag).unwrap();

        delete_system_tag_by_id(&conn, "sys-ws-del").unwrap();
        let result = find_by_id(&conn, "sys-ws-del");
        assert!(result.is_err());
    }

    #[test]
    fn test_find_system_tags() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let system_tags = find_system_tags(&conn).unwrap();
        // Migration creates 5 system tags (exe, url, folder, script, command)
        assert_eq!(system_tags.len(), 5);
        assert!(system_tags.iter().all(|t| t.is_system));
    }
}
