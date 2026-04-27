// PH-505: Opener registry
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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CreateOpenerInput {
    pub label: String,
    pub command: String,
    pub args_template: Option<String>,
    pub icon: Option<String>,
    pub sort_order: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateOpenerInput {
    pub label: Option<String>,
    pub command: Option<String>,
    pub args_template: Option<String>,
    pub icon: Option<String>,
    pub sort_order: Option<i64>,
}
