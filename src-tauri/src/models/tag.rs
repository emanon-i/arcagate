use crate::models::item::ItemType;
use serde::{Deserialize, Serialize};

/// システムタグID: アイテムタイプ別 (e.g. "sys-type-exe")
pub fn sys_type_tag_id(item_type: &ItemType) -> String {
    format!("sys-type-{}", item_type.as_str())
}

/// システムタグID: ワークスペース別 (e.g. "sys-ws-<uuid>")
pub fn sys_ws_tag_id(workspace_id: &str) -> String {
    format!("sys-ws-{}", workspace_id)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub is_hidden: bool,
    pub is_system: bool,
    pub prefix: Option<String>,
    pub icon: Option<String>,
    pub sort_order: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTagInput {
    pub name: String,
    pub is_hidden: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagWithCount {
    pub id: String,
    pub name: String,
    pub is_system: bool,
    pub prefix: Option<String>,
    pub icon: Option<String>,
    pub item_count: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sys_type_tag_id() {
        assert_eq!(sys_type_tag_id(&ItemType::Exe), "sys-type-exe");
        assert_eq!(sys_type_tag_id(&ItemType::Url), "sys-type-url");
        assert_eq!(sys_type_tag_id(&ItemType::Folder), "sys-type-folder");
        assert_eq!(sys_type_tag_id(&ItemType::Script), "sys-type-script");
        assert_eq!(sys_type_tag_id(&ItemType::Command), "sys-type-command");
    }

    #[test]
    fn test_sys_ws_tag_id() {
        let ws_id = "01234567-89ab-cdef-0123-456789abcdef";
        assert_eq!(
            sys_ws_tag_id(ws_id),
            "sys-ws-01234567-89ab-cdef-0123-456789abcdef"
        );
    }

    #[test]
    fn test_sys_ws_tag_id_prefix_format() {
        let result = sys_ws_tag_id("any-id");
        assert!(result.starts_with("sys-ws-"));
    }

    #[test]
    fn test_sys_type_tag_id_prefix_format() {
        for item_type in &[
            ItemType::Exe,
            ItemType::Url,
            ItemType::Folder,
            ItemType::Script,
            ItemType::Command,
        ] {
            let result = sys_type_tag_id(item_type);
            assert!(result.starts_with("sys-type-"));
        }
    }
}
