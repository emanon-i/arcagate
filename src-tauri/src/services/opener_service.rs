// PH-505: Opener registry — service layer
use std::process::Command;

use uuid::Uuid;

use crate::db::DbState;
use crate::models::opener::{CreateOpenerInput, Opener, UpdateOpenerInput};
use crate::repositories::opener_repository as repo;
use crate::utils::error::AppError;

pub fn list_openers(db: &DbState) -> Result<Vec<Opener>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::list_all(&conn)
}

pub fn get_opener(db: &DbState, id: &str) -> Result<Option<Opener>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::find_by_id(&conn, id)
}

pub fn create_opener(db: &DbState, input: CreateOpenerInput) -> Result<Opener, AppError> {
    if input.label.trim().is_empty() {
        return Err(AppError::InvalidInput(
            "label must not be empty".to_string(),
        ));
    }
    if input.command.trim().is_empty() {
        return Err(AppError::InvalidInput(
            "command must not be empty".to_string(),
        ));
    }
    let id = format!("opener-custom-{}", Uuid::now_v7());
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::create(&conn, &id, &input)
}

pub fn update_opener(db: &DbState, id: &str, input: UpdateOpenerInput) -> Result<Opener, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::update(&conn, id, &input)
}

pub fn delete_opener(db: &DbState, id: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    repo::delete(&conn, id)
}

/// args_template の `{path}` を実際の path に置換して shell-words で分解、
/// `Command::new(command).args(...).spawn()` で起動する。
pub fn launch_with_opener(db: &DbState, opener_id: &str, path: &str) -> Result<(), AppError> {
    let opener = {
        let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
        repo::find_by_id(&conn, opener_id)?
            .ok_or_else(|| AppError::NotFound(format!("opener `{opener_id}` not found")))?
    };
    let rendered = render_args(&opener.args_template, path);
    let parts = shell_words::split(&rendered).map_err(|e| {
        AppError::LaunchFailed(format!(
            "invalid args quoting in opener `{}`: {e}",
            opener.id
        ))
    })?;
    log::info!(
        target: "opener",
        "launching opener {} ({}) with path {}",
        opener.id,
        opener.command,
        path
    );
    let mut cmd = Command::new(&opener.command);
    if !parts.is_empty() {
        cmd.args(&parts);
    }
    match cmd.spawn() {
        Ok(_) => Ok(()),
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                Err(AppError::LaunchFileNotFound(opener.command.clone()))
            } else {
                Err(AppError::LaunchFailed(format!(
                    "spawn failed for opener `{}`: {e}",
                    opener.id
                )))
            }
        }
    }
}

fn render_args(template: &str, path: &str) -> String {
    template.replace("{path}", path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;

    #[test]
    fn render_args_substitutes_path() {
        assert_eq!(render_args("{path}", "C:/x/y"), "C:/x/y");
        assert_eq!(
            render_args("\"{path}\"", "C:/x with space/y"),
            "\"C:/x with space/y\""
        );
        assert_eq!(
            render_args("--config \"{path}/cfg.json\"", "C:/x"),
            "--config \"C:/x/cfg.json\""
        );
    }

    #[test]
    fn create_opener_validates_label() {
        let db = initialize_in_memory();
        let result = create_opener(
            &db,
            CreateOpenerInput {
                label: "  ".to_string(),
                command: "x.exe".to_string(),
                ..Default::default()
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn create_opener_validates_command() {
        let db = initialize_in_memory();
        let result = create_opener(
            &db,
            CreateOpenerInput {
                label: "MyTool".to_string(),
                command: "".to_string(),
                ..Default::default()
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn launch_with_opener_returns_not_found_for_missing_id() {
        let db = initialize_in_memory();
        let result = launch_with_opener(&db, "missing", "C:/x");
        assert!(result.is_err());
    }

    #[test]
    fn launch_with_opener_returns_not_found_for_missing_command() {
        let db = initialize_in_memory();
        // 存在しない command path で opener を作成 → spawn は LaunchFileNotFound
        let opener = create_opener(
            &db,
            CreateOpenerInput {
                label: "Bogus".to_string(),
                command: "Z:/never/exists/__bogus__.exe".to_string(),
                ..Default::default()
            },
        )
        .unwrap();
        let result = launch_with_opener(&db, &opener.id, "C:/x");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err().code(), "launch.file_not_found");
    }
}
