use serde::{Deserialize, Serialize};

/// PH-issue-024: Opener registry.
/// builtin (compiled-in) と user-defined (DB) を統一表現。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Opener {
    pub id: String,
    pub name: String,
    /// `<path>` placeholder が target に置換される command 文字列。
    /// 例: `code "<path>"`, `wt -d "<path>"`, `cmd /K cd /d "<path>"`
    pub command_template: String,
    pub icon_path: Option<String>,
    pub sort_order: i64,
    pub is_builtin: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveOpenerInput {
    pub id: Option<String>, // None = 新規 (UUID 採番)、Some = 既存 update
    pub name: String,
    pub command_template: String,
    pub icon_path: Option<String>,
    pub sort_order: Option<i64>,
}

/// builtin opener の定義 (compiled-in)。
/// 起動時に `opener_service::list_all()` で custom と merge。
pub fn builtin_openers() -> Vec<Opener> {
    vec![
        Opener {
            id: "builtin:explorer".to_string(),
            name: "Explorer".to_string(),
            // cmd /c start "" "<path>" は OS デフォルト動作 (folder → Explorer / file → 関連付けアプリ)
            command_template: r#"cmd /c start "" "<path>""#.to_string(),
            icon_path: None,
            sort_order: 0,
            is_builtin: true,
        },
        Opener {
            id: "builtin:vscode".to_string(),
            name: "VSCode".to_string(),
            command_template: r#"code "<path>""#.to_string(),
            icon_path: None,
            sort_order: 10,
            is_builtin: true,
        },
        Opener {
            id: "builtin:wt".to_string(),
            name: "Windows Terminal".to_string(),
            command_template: r#"wt -d "<path>""#.to_string(),
            icon_path: None,
            sort_order: 20,
            is_builtin: true,
        },
        Opener {
            id: "builtin:powershell".to_string(),
            name: "PowerShell".to_string(),
            command_template: r#"powershell -NoExit -Command "Set-Location -LiteralPath '<path>'""#
                .to_string(),
            icon_path: None,
            sort_order: 30,
            is_builtin: true,
        },
        Opener {
            id: "builtin:cmd".to_string(),
            name: "Command Prompt".to_string(),
            command_template: r#"cmd /K cd /d "<path>""#.to_string(),
            icon_path: None,
            sort_order: 40,
            is_builtin: true,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builtin_openers_has_5_entries() {
        let list = builtin_openers();
        assert_eq!(list.len(), 5);
    }

    #[test]
    fn builtin_openers_all_marked_builtin() {
        for o in builtin_openers() {
            assert!(o.is_builtin, "{} not marked builtin", o.id);
            assert!(o.id.starts_with("builtin:"), "{}", o.id);
        }
    }

    #[test]
    fn builtin_openers_have_path_placeholder() {
        for o in builtin_openers() {
            assert!(
                o.command_template.contains("<path>"),
                "{} missing <path>",
                o.id
            );
        }
    }
}
