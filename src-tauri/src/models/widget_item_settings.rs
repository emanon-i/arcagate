// PH-504 batch-109: Per-item settings persistence (案 C、論理削除なし)
//
// Entries 自体は filesystem 由来の derived state で揮発、本テーブルは setting のみ。
// (widget_id, item_key) PK で widget 毎・item 毎の override を保持。
// unset しても残るので path 戻し時に旧設定が自動 resurrect する。

use serde::{Deserialize, Serialize};

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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WidgetItemSettingsPatch {
    pub opener: Option<Option<String>>,
    pub custom_label: Option<Option<String>>,
    pub custom_icon: Option<Option<String>>,
    pub favorite: Option<bool>,
}
