use crate::models::item::ItemType;
use serde::{Deserialize, Serialize};

/// システムタグID: アイテムタイプ別 (e.g. "sys-type-exe")
pub fn sys_type_tag_id(item_type: &ItemType) -> String {
    format!("sys-type-{}", item_type.as_str())
}

// G-7 (2026-05-09 user 検収): workspace 名 system tag (sys-ws-*) 機能ごと撤去。
// 「workspace 名 = system tag」 自動付与は不要、widget item に勝手に tag が増える UX を解消。
// 関連 logic は workspace_service の create/update/delete + sync_workspace_item_tags 全廃止。
// migration 026 で既存 sys-ws-* row を削除。

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

impl Tag {
    /// rusqlite::Row → Tag への変換 (V2 解消、A3 PR-B)。
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        let is_hidden_int: i64 = row.get(2)?;
        let is_system_int: i64 = row.get(3)?;
        Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
            is_hidden: is_hidden_int != 0,
            is_system: is_system_int != 0,
            prefix: row.get(4)?,
            icon: row.get(5)?,
            sort_order: row.get(6)?,
            created_at: row.get(7)?,
        })
    }
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

    // G-7: sys_ws_tag_id 関連 test 撤去 (機能削除に伴う)。

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
