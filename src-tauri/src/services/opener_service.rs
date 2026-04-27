// PH-505 batch-109: Opener registry service

use uuid::Uuid;

use crate::db::DbState;
use crate::models::opener::{CreateOpenerInput, Opener, UpdateOpenerInput};
use crate::repositories::opener_repository as repo;
use crate::utils::error::AppError;

pub fn list_openers(db: &DbState) -> Result<Vec<Opener>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::list(&conn)
}

pub fn get_opener(db: &DbState, id: &str) -> Result<Option<Opener>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::find(&conn, id)
}

pub fn create_opener(db: &DbState, input: CreateOpenerInput) -> Result<Opener, AppError> {
    if input.label.trim().is_empty() {
        return Err(AppError::InvalidInput("label must not be empty".into()));
    }
    if input.command.trim().is_empty() {
        return Err(AppError::InvalidInput("command must not be empty".into()));
    }
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let id = format!("custom-{}", Uuid::now_v7());
    let args = input
        .args_template
        .unwrap_or_else(|| "\"{path}\"".to_string());
    let next_sort_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM openers",
            [],
            |row| row.get(0),
        )
        .unwrap_or(100);
    repo::insert(
        &conn,
        &id,
        &input.label,
        &input.command,
        &args,
        input.icon.as_deref(),
        next_sort_order,
    )
}

pub fn update_opener(db: &DbState, id: &str, input: UpdateOpenerInput) -> Result<Opener, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let existing =
        repo::find(&conn, id)?.ok_or_else(|| AppError::NotFound(format!("opener({id})")))?;

    if existing.builtin {
        // builtin は label/command/args 変更を拒否 (アイコン/sort のみ許可)
        if input.label.is_some() || input.command.is_some() || input.args_template.is_some() {
            return Err(AppError::InvalidInput(
                "builtin opener fields cannot be modified (label / command / args_template)".into(),
            ));
        }
    }

    let label = input.label.unwrap_or(existing.label);
    let command = input.command.unwrap_or(existing.command);
    let args_template = input.args_template.unwrap_or(existing.args_template);
    let icon = match input.icon {
        Some(v) => v,
        None => existing.icon,
    };
    let sort_order = input.sort_order.unwrap_or(existing.sort_order);

    if label.trim().is_empty() {
        return Err(AppError::InvalidInput("label must not be empty".into()));
    }
    if command.trim().is_empty() {
        return Err(AppError::InvalidInput("command must not be empty".into()));
    }

    repo::update(
        &conn,
        id,
        &label,
        &command,
        &args_template,
        icon.as_deref(),
        sort_order,
    )
}

pub fn delete_opener(db: &DbState, id: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let existing =
        repo::find(&conn, id)?.ok_or_else(|| AppError::NotFound(format!("opener({id})")))?;
    if existing.builtin {
        return Err(AppError::InvalidInput(
            "builtin opener cannot be deleted".into(),
        ));
    }
    let removed = repo::delete(&conn, id)?;
    if !removed {
        return Err(AppError::NotFound(format!("opener({id})")));
    }
    Ok(())
}

/// {path} を実 path に置換した args を shell-words で分解して返す。
/// caller (launcher) が `Command::new(opener.command).args(parsed).spawn()` する想定。
pub fn build_args(opener: &Opener, path: &str) -> Result<Vec<String>, AppError> {
    let rendered = opener.args_template.replace("{path}", path);
    shell_words::split(&rendered)
        .map_err(|e| AppError::LaunchFailed(format!("invalid opener args quoting: {e}")))
}

/// opener registry 経由で path を起動。
pub fn launch_with_opener(db: &DbState, opener_id: &str, path: &str) -> Result<(), AppError> {
    use std::process::Command;

    let opener = get_opener(db, opener_id)?
        .ok_or_else(|| AppError::NotFound(format!("opener({opener_id})")))?;
    let args = build_args(&opener, path)?;

    Command::new(&opener.command)
        .args(args)
        .spawn()
        .map_err(|e| AppError::LaunchFailed(format!("opener `{}` failed: {e}", opener.label)))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::opener::Opener;

    fn make_opener(template: &str) -> Opener {
        Opener {
            id: "test".into(),
            label: "Test".into(),
            command: "test.exe".into(),
            args_template: template.into(),
            icon: None,
            builtin: false,
            sort_order: 0,
            created_at: 0,
            updated_at: 0,
        }
    }

    #[test]
    fn build_args_replaces_path_placeholder() {
        let op = make_opener("\"{path}\"");
        let args = build_args(&op, "C:/Program Files/foo").unwrap();
        assert_eq!(args, vec!["C:/Program Files/foo"]);
    }

    #[test]
    fn build_args_handles_quoted_template() {
        let op = make_opener("-NoExit -Command \"Set-Location -LiteralPath '{path}'\"");
        let args = build_args(&op, "C:/test/dir").unwrap();
        assert_eq!(
            args,
            vec![
                "-NoExit",
                "-Command",
                "Set-Location -LiteralPath 'C:/test/dir'",
            ]
        );
    }

    #[test]
    fn build_args_rejects_unclosed_quote() {
        let op = make_opener("-x '{path}");
        let result = build_args(&op, "C:/test");
        assert!(result.is_err());
    }
}
