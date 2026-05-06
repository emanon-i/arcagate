use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchedPath {
    pub id: String,
    pub path: String,
    pub label: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl WatchedPath {
    /// rusqlite::Row → WatchedPath への変換 (V2 解消、A3 PR-B)。
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        let is_active_int: i64 = row.get(3)?;
        Ok(WatchedPath {
            id: row.get(0)?,
            path: row.get(1)?,
            label: row.get(2)?,
            is_active: is_active_int != 0,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWatchedPathInput {
    pub path: String,
    pub label: Option<String>,
}
