// PH-505 batch-109: Opener registry model
//
// {path} placeholder で args を組み立てる shell 風 invocation registry。
// builtin = true は user 削除不可 (default 同梱)。
// per-item override は widget_item_settings.opener (= opener.id) で参照。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Opener {
    pub id: String,
    pub label: String,
    pub command: String,
    pub args_template: String,
    pub icon: Option<String>,
    pub builtin: bool,
    pub sort_order: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOpenerInput {
    pub label: String,
    pub command: String,
    pub args_template: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateOpenerInput {
    pub label: Option<String>,
    pub command: Option<String>,
    pub args_template: Option<String>,
    pub icon: Option<Option<String>>,
    pub sort_order: Option<i64>,
}
