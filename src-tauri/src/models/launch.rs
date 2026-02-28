use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchLog {
    pub id: String,
    pub item_id: String,
    pub launched_at: String,
    pub launch_source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemStats {
    pub item_id: String,
    pub launch_count: i64,
    pub last_launched_at: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SortOrder {
    Alphabetical,
    Frequent,
    Recent,
    Manual,
}
