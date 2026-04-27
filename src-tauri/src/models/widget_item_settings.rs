// PH-504: Per-item settings persistence model
use serde::{Deserialize, Serialize};

/// 案 C 採用: per-item settings は別永続テーブル、entries は揮発。
/// `widget_id + item_key` の primary key で stable ID。
/// `item_key` は relative path (or hash) など、source-of-truth から再構築可能な値を front 側で決める。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WidgetItemSettings {
    pub widget_id: String,
    pub item_key: String,
    pub opener: Option<String>,
    pub custom_label: Option<String>,
    pub custom_icon: Option<String>,
    pub favorite: bool,
    pub last_seen_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// upsert 入力 (前段の Option<...> を活用して partial update を表す)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpsertWidgetItemSettingsInput {
    pub widget_id: String,
    pub item_key: String,
    pub opener: Option<String>,
    pub custom_label: Option<String>,
    pub custom_icon: Option<String>,
    pub favorite: Option<bool>,
    pub last_seen_at: Option<i64>,
}
