/// PH-issue-024: Opener registry の service layer。
/// builtin (compiled-in) と custom (DB) を統一して resolve / launch する。
///
/// 設計原則 (CLAUDE.md):
/// - Service Layer が共通経路、launch_service / IPC commands から本 service を呼ぶ
/// - Repository は本 service 経由でのみアクセス、command から直接触らない
use uuid::Uuid;

use crate::db::DbState;
use crate::launcher;
use crate::models::opener::{builtin_openers, Opener, SaveOpenerInput};
use crate::repositories::opener_repository;
use crate::utils::error::AppError;

/// builtin + custom を merge した一覧 (sort 済)。
pub fn list_all(db: &DbState) -> Result<Vec<Opener>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let mut all = builtin_openers();
    let custom = opener_repository::list(&conn)?;
    all.extend(custom);
    all.sort_by(|a, b| {
        a.sort_order
            .cmp(&b.sort_order)
            .then_with(|| a.name.cmp(&b.name))
    });
    Ok(all)
}

/// id から resolve。builtin → DB の順で lookup、見つからない場合は explorer fallback。
pub fn resolve(db: &DbState, opener_id: &str) -> Result<Opener, AppError> {
    if let Some(b) = builtin_openers().into_iter().find(|o| o.id == opener_id) {
        return Ok(b);
    }
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    resolve_with_conn(&conn, opener_id)
}

/// 既存 lock 保持下で呼ぶ場合の resolve (launch_service::launch_item のように
/// 既に conn lock を取っている path 用、deadlock 回避)。
pub fn resolve_with_conn(conn: &rusqlite::Connection, opener_id: &str) -> Result<Opener, AppError> {
    if let Some(b) = builtin_openers().into_iter().find(|o| o.id == opener_id) {
        return Ok(b);
    }
    if let Some(o) = opener_repository::find_by_id(conn, opener_id)? {
        return Ok(o);
    }
    // fallback: explorer (default)
    Ok(builtin_openers()
        .into_iter()
        .find(|o| o.id == "builtin:explorer")
        .expect("builtin:explorer must exist"))
}

/// command_template の `<path>` placeholder を target で substitute して shell 起動する。
///
/// 例:
///   template = `code "<path>"`
///   target   = `C:/Users/foo/My Project`
///   → `code "C:/Users/foo/My Project"`
///
/// shell-words::split で quoting に対応、Windows パス内のスペースを正しく扱う。
pub fn launch_with(opener: &Opener, target: &str) -> Result<(), AppError> {
    let cmd = substitute_template(&opener.command_template, target)?;
    launcher::launch_command(&cmd, None)
}

/// `<path>` placeholder を target で substitute。template 側の quoting は保持。
/// PH-422 の shell-words 移行と一貫させるため、target 側の quoting は呼び出し側で template に書く。
fn substitute_template(template: &str, target: &str) -> Result<String, AppError> {
    if !template.contains("<path>") {
        return Err(AppError::LaunchFailed(format!(
            "opener template missing <path> placeholder: {template}"
        )));
    }
    Ok(template.replace("<path>", target))
}

pub fn save(db: &DbState, input: SaveOpenerInput) -> Result<Opener, AppError> {
    if input.command_template.is_empty() {
        return Err(AppError::InvalidInput(
            "command_template が空です".to_string(),
        ));
    }
    if !input.command_template.contains("<path>") {
        return Err(AppError::InvalidInput(
            "command_template に <path> プレースホルダーが必要です".to_string(),
        ));
    }
    if input.name.trim().is_empty() {
        return Err(AppError::InvalidInput("name が空です".to_string()));
    }
    let id = match input.id {
        Some(existing) if existing.starts_with("builtin:") => {
            return Err(AppError::InvalidInput(
                "builtin opener は編集できません".to_string(),
            ));
        }
        Some(existing) => existing,
        None => format!("user:{}", Uuid::now_v7()),
    };
    let opener = Opener {
        id: id.clone(),
        name: input.name.trim().to_string(),
        command_template: input.command_template,
        icon_path: input.icon_path,
        sort_order: input.sort_order.unwrap_or(0),
        is_builtin: false,
    };
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    opener_repository::upsert(&conn, &opener)?;
    Ok(opener)
}

pub fn delete(db: &DbState, id: &str) -> Result<(), AppError> {
    if id.starts_with("builtin:") {
        return Err(AppError::InvalidInput(
            "builtin opener は削除できません".to_string(),
        ));
    }
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    opener_repository::delete(&conn, id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    #[test]
    fn substitute_template_replaces_path() {
        let r = substitute_template(r#"code "<path>""#, "C:/foo").unwrap();
        assert_eq!(r, r#"code "C:/foo""#);
    }

    #[test]
    fn substitute_template_handles_spaces_via_template_quoting() {
        let r = substitute_template(r#"code "<path>""#, "C:/My Project").unwrap();
        assert_eq!(r, r#"code "C:/My Project""#);
    }

    #[test]
    fn substitute_template_replaces_multiple_occurrences() {
        let r = substitute_template(r#"echo "<path>" && cd "<path>""#, "C:/x").unwrap();
        assert_eq!(r, r#"echo "C:/x" && cd "C:/x""#);
    }

    #[test]
    fn substitute_template_errors_when_placeholder_missing() {
        let err = substitute_template("notepad", "x").unwrap_err();
        assert!(matches!(err, AppError::LaunchFailed(_)));
    }

    #[test]
    fn list_all_includes_builtin_when_db_empty() {
        let db = initialize_in_memory();
        let list = list_all(&db).unwrap();
        assert!(list.iter().any(|o| o.id == "builtin:explorer"));
        assert!(list.iter().any(|o| o.id == "builtin:vscode"));
        assert_eq!(list.len(), 5);
    }

    #[test]
    fn list_all_merges_custom_with_builtin() {
        let db = initialize_in_memory();
        let saved = save(
            &db,
            SaveOpenerInput {
                id: None,
                name: "Cursor".to_string(),
                command_template: r#"cursor "<path>""#.to_string(),
                icon_path: None,
                sort_order: Some(15),
            },
        )
        .unwrap();
        assert!(saved.id.starts_with("user:"));
        let list = list_all(&db).unwrap();
        assert_eq!(list.len(), 6);
        assert!(list.iter().any(|o| o.name == "Cursor" && !o.is_builtin));
    }

    #[test]
    fn resolve_builtin_returns_compiled_in() {
        let db = initialize_in_memory();
        let o = resolve(&db, "builtin:vscode").unwrap();
        assert_eq!(o.name, "VSCode");
        assert!(o.is_builtin);
    }

    #[test]
    fn resolve_unknown_falls_back_to_explorer() {
        let db = initialize_in_memory();
        let o = resolve(&db, "user:nonexistent").unwrap();
        assert_eq!(o.id, "builtin:explorer");
    }

    #[test]
    fn save_rejects_builtin_id_edit() {
        let db = initialize_in_memory();
        let r = save(
            &db,
            SaveOpenerInput {
                id: Some("builtin:vscode".to_string()),
                name: "Hacked".to_string(),
                command_template: r#"evil "<path>""#.to_string(),
                icon_path: None,
                sort_order: None,
            },
        );
        assert!(matches!(r, Err(AppError::InvalidInput(_))));
    }

    #[test]
    fn save_rejects_missing_path_placeholder() {
        let db = initialize_in_memory();
        let r = save(
            &db,
            SaveOpenerInput {
                id: None,
                name: "Bad".to_string(),
                command_template: "notepad".to_string(),
                icon_path: None,
                sort_order: None,
            },
        );
        assert!(matches!(r, Err(AppError::InvalidInput(_))));
    }

    #[test]
    fn save_rejects_empty_name() {
        let db = initialize_in_memory();
        let r = save(
            &db,
            SaveOpenerInput {
                id: None,
                name: "  ".to_string(),
                command_template: r#"x "<path>""#.to_string(),
                icon_path: None,
                sort_order: None,
            },
        );
        assert!(matches!(r, Err(AppError::InvalidInput(_))));
    }

    #[test]
    fn delete_rejects_builtin() {
        let db = initialize_in_memory();
        assert!(matches!(
            delete(&db, "builtin:vscode"),
            Err(AppError::InvalidInput(_))
        ));
    }
}
