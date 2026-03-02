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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWatchedPathInput {
    pub path: String,
    pub label: Option<String>,
}
