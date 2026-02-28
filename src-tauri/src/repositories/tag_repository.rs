use rusqlite::{params, Connection};

use crate::models::tag::Tag;
use crate::utils::error::AppError;

fn row_to_tag(row: &rusqlite::Row) -> rusqlite::Result<Tag> {
    let is_hidden_int: i64 = row.get(2)?;
    Ok(Tag {
        id: row.get(0)?,
        name: row.get(1)?,
        is_hidden: is_hidden_int != 0,
        created_at: row.get(3)?,
    })
}

pub fn insert(conn: &Connection, tag: &Tag) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO tags (id, name, is_hidden, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![tag.id, tag.name, tag.is_hidden as i64, tag.created_at],
    )?;
    Ok(())
}

pub fn find_all(conn: &Connection) -> Result<Vec<Tag>, AppError> {
    let mut stmt =
        conn.prepare("SELECT id, name, is_hidden, created_at FROM tags ORDER BY name")?;
    let tags = stmt
        .query_map([], row_to_tag)?
        .collect::<rusqlite::Result<Vec<Tag>>>()?;
    Ok(tags)
}

pub fn update(conn: &Connection, id: &str, name: &str, is_hidden: bool) -> Result<(), AppError> {
    conn.execute(
        "UPDATE tags SET name = ?1, is_hidden = ?2 WHERE id = ?3",
        params![name, is_hidden as i64, id],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM tags WHERE id = ?1", params![id])?;
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
        assert_eq!(tags.len(), 2);
    }

    #[test]
    fn test_is_hidden_roundtrip() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        let mut tag = make_tag("tag-001", "secret");
        tag.is_hidden = true;
        insert(&conn, &tag).unwrap();

        let tags = find_all(&conn).unwrap();
        assert!(tags[0].is_hidden);
    }

    #[test]
    fn test_update() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_tag("tag-001", "fav")).unwrap();
        update(&conn, "tag-001", "favorite", true).unwrap();

        let tags = find_all(&conn).unwrap();
        assert_eq!(tags[0].name, "favorite");
        assert!(tags[0].is_hidden);
    }

    #[test]
    fn test_delete() {
        let db = initialize_in_memory();
        let conn = db.0.lock().unwrap();

        insert(&conn, &make_tag("tag-001", "fav")).unwrap();
        delete(&conn, "tag-001").unwrap();

        let tags = find_all(&conn).unwrap();
        assert_eq!(tags.len(), 0);
    }
}
