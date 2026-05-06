use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Theme {
    pub id: String,
    pub name: String,
    pub base_theme: String,
    pub css_vars: String,
    pub is_builtin: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl Theme {
    /// rusqlite::Row → Theme への変換 (V2 解消、A3 PR-B)。
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateThemeInput {
    pub name: String,
    pub base_theme: String,
    pub css_vars: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateThemeInput {
    pub name: Option<String>,
    pub base_theme: Option<String>,
    pub css_vars: Option<String>,
}
