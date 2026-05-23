use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ItemType {
    Exe,
    Url,
    Folder,
    Script,
    Command,
}

impl ItemType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ItemType::Exe => "exe",
            ItemType::Url => "url",
            ItemType::Folder => "folder",
            ItemType::Script => "script",
            ItemType::Command => "command",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "exe" => Some(ItemType::Exe),
            "url" => Some(ItemType::Url),
            "folder" => Some(ItemType::Folder),
            "script" => Some(ItemType::Script),
            "command" => Some(ItemType::Command),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub item_type: ItemType,
    pub label: String,
    pub target: String,
    pub args: Option<String>,
    pub working_dir: Option<String>,
    pub icon_path: Option<String>,
    pub icon_type: Option<String>,
    pub aliases: Vec<String>,
    pub sort_order: i64,
    pub is_enabled: bool,
    pub is_tracked: bool,
    pub default_app: Option<String>,
    /// PH-290: per-card 背景・文字 override (JSON 文字列、NULL = global default)
    pub card_override_json: Option<String>,
    /// PH-CF-100: 監視ウィジェット由来の item の back-link。 NULL = user 作成 / 監視非由来。
    /// `source_entry_key` と 2 列セットで意味を持つ (片肺は契約違反)。
    pub source_widget_id: Option<String>,
    /// PH-CF-100: scan reconcile の entry id (正規化済 絶対パス)。
    /// `widget_item_hides.item_target` と同じ key 空間で揃える。
    pub source_entry_key: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Item {
    /// rusqlite::Row → Item への変換 (V2 解消、A3 PR-B)。
    /// 列順序は repository 側 SELECT の順序 (id, item_type, label, target, args,
    /// working_dir, icon_path, icon_type, aliases, sort_order, is_enabled,
    /// is_tracked, default_app, card_override_json, source_widget_id, source_entry_key,
    /// created_at, updated_at) と一致。
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        let item_type_str: String = row.get(1)?;
        let item_type = ItemType::from_str(&item_type_str).unwrap_or(ItemType::Command);
        let aliases_json: Option<String> = row.get(8)?;
        let aliases: Vec<String> = aliases_json
            .as_deref()
            .and_then(|s| serde_json::from_str(s).ok())
            .unwrap_or_default();
        let is_enabled_int: i64 = row.get(10)?;
        let is_tracked_int: i64 = row.get(11)?;
        Ok(Item {
            id: row.get(0)?,
            item_type,
            label: row.get(2)?,
            target: row.get(3)?,
            args: row.get(4)?,
            working_dir: row.get(5)?,
            icon_path: row.get(6)?,
            icon_type: row.get(7)?,
            aliases,
            sort_order: row.get(9)?,
            is_enabled: is_enabled_int != 0,
            is_tracked: is_tracked_int != 0,
            default_app: row.get(12)?,
            card_override_json: row.get(13)?,
            source_widget_id: row.get(14)?,
            source_entry_key: row.get(15)?,
            created_at: row.get(16)?,
            updated_at: row.get(17)?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateItemInput {
    pub item_type: ItemType,
    pub label: String,
    pub target: String,
    pub args: Option<String>,
    pub working_dir: Option<String>,
    pub icon_path: Option<String>,
    pub aliases: Vec<String>,
    pub tag_ids: Vec<String>,
    #[serde(default = "default_true")]
    pub is_tracked: bool,
}

fn default_true() -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_item_type_as_str() {
        assert_eq!(ItemType::Exe.as_str(), "exe");
        assert_eq!(ItemType::Url.as_str(), "url");
        assert_eq!(ItemType::Folder.as_str(), "folder");
        assert_eq!(ItemType::Script.as_str(), "script");
        assert_eq!(ItemType::Command.as_str(), "command");
    }

    #[test]
    fn test_item_type_from_str_valid() {
        assert_eq!(ItemType::from_str("exe"), Some(ItemType::Exe));
        assert_eq!(ItemType::from_str("url"), Some(ItemType::Url));
        assert_eq!(ItemType::from_str("folder"), Some(ItemType::Folder));
        assert_eq!(ItemType::from_str("script"), Some(ItemType::Script));
        assert_eq!(ItemType::from_str("command"), Some(ItemType::Command));
    }

    #[test]
    fn test_item_type_from_str_invalid() {
        assert_eq!(ItemType::from_str("unknown"), None);
        assert_eq!(ItemType::from_str("EXE"), None);
        assert_eq!(ItemType::from_str(""), None);
    }

    #[test]
    fn test_item_type_roundtrip() {
        let types = [
            ItemType::Exe,
            ItemType::Url,
            ItemType::Folder,
            ItemType::Script,
            ItemType::Command,
        ];
        for t in &types {
            let s = t.as_str();
            let back = ItemType::from_str(s);
            assert_eq!(back.as_ref(), Some(t));
        }
    }
}

/// `Option<Option<T>>` に対する double-option deserializer。
/// JSON 既定の serde では `null` → outer `None`、field 不在 → outer `None` で区別不能。
/// 本 helper で field 不在 → `None` (= 変更なし)、`null` → `Some(None)` (= 明示クリア)、
/// 値あり → `Some(Some(v))` (= 値設定) を区別する。`#[serde(default)]` と併用必須。
fn deserialize_double_option<'de, T, D>(d: D) -> Result<Option<Option<T>>, D::Error>
where
    T: serde::Deserialize<'de>,
    D: serde::Deserializer<'de>,
{
    Option::<T>::deserialize(d).map(Some)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateItemInput {
    pub label: Option<String>,
    pub target: Option<String>,
    pub args: Option<String>,
    pub working_dir: Option<String>,
    /// `null` 渡しで icon を明示的に解除する。double_option で field 不在 (= 変更なし) と
    /// `null` (= クリア) を区別する (serde 既定では両者を区別できず「アイコン削除」が無効化されていた)。
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub icon_path: Option<Option<String>>,
    pub aliases: Option<Vec<String>>,
    pub is_enabled: Option<bool>,
    pub is_tracked: Option<bool>,
    pub default_app: Option<String>,
    pub tag_ids: Option<Vec<String>>,
    /// PH-290: per-card override JSON (`null` 渡しで明示的に解除)。
    /// `Option<Option<String>>` を JSON 上で field 不在 / null / 値 と 3 通りに区別するため
    /// double_option deserializer を使う (serde 既定では null と field 不在を区別できない)。
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub card_override_json: Option<Option<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryStats {
    pub total_items: i64,
    pub total_tags: i64,
    pub recent_launch_count: i64,
}
