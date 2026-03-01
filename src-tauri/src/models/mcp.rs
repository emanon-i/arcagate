use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpPermission {
    pub id: String,
    pub tool_name: String,
    pub is_allowed: bool,
    pub created_at: String,
    pub updated_at: String,
}
