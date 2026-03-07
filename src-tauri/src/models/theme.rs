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
