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
    // fallback: explorer (default)。 builtin リストは compile 時に固定されている (`builtin_openers()`)
    // ため通常 None にならない。 万一不在の場合は `AppError::NotFound` で graceful に縮退し、
    // 呼び出し側 (launch_with_opener / opener UI) は通常の opener 解決失敗 path に乗る。
    // PH-PQ-100 T1: 本番 panic 排除。
    builtin_openers()
        .into_iter()
        .find(|o| o.id == "builtin:explorer")
        .ok_or_else(|| AppError::NotFound("builtin:explorer".into()))
}

/// opener で target (file / folder) を起動する。
///
/// audit F2 (2026-05-18): 旧実装は `command_template.replace("<path>", target)` で組み立てた
/// 文字列を `launch_command` に渡していた。 builtin template が `<path>` を `cmd /c` /
/// PowerShell の引用符コンテキストに埋め込んでいたため、 アポストロフィを含む正規の
/// フォルダ名や、 `cmd_launch_with_opener` 経由の未検証 target でコマンド / PowerShell
/// インジェクションが成立した。
///
/// 新実装:
/// - builtin の explorer / cmd / powershell は id で特別扱いし、 target を引数文字列に
///   埋め込まず `current_dir` / 構造化引数で渡す (shell 再パースを完全排除)。
/// - それ以外 (vscode / wt / custom opener) は template を token 化 → `<path>` を **token
///   単位で**置換 → 構造化引数で実行。 target は単一 argv 要素になり shell 演算子として
///   再解釈されない。
pub fn launch_with(opener: &Opener, target: &str) -> Result<(), AppError> {
    if target.trim().is_empty() {
        return Err(AppError::InvalidInput("opener target is empty".to_string()));
    }

    match opener.id.as_str() {
        "builtin:explorer" => return launcher::launch_folder(target),
        "builtin:cmd" => return launcher::launch_terminal_in_dir("cmd", &[], target),
        "builtin:powershell" => {
            return launcher::launch_terminal_in_dir("powershell", &["-NoExit"], target)
        }
        _ => {}
    }

    let argv = build_opener_argv(&opener.command_template, target)?;
    launcher::launch_argv(&argv, None)
}

/// command_template を shell-words で token 化し、 各 token 内の `<path>` placeholder を
/// target で literal 置換した argv (program + args) を返す。
///
/// 置換は **token 分割後**に行うため、 target に空白 / `&` / `'` 等が含まれても単一 token
/// に収まり、 shell 再パースを受けない。
fn build_opener_argv(template: &str, target: &str) -> Result<Vec<String>, AppError> {
    if !template.contains("<path>") {
        return Err(AppError::LaunchFailed(format!(
            "opener template missing <path> placeholder: {template}"
        )));
    }
    let tokens = shell_words::split(template)
        .map_err(|e| AppError::LaunchFailed(format!("invalid opener template quoting: {e}")))?;
    let argv: Vec<String> = tokens
        .into_iter()
        .map(|token| token.replace("<path>", target))
        .collect();
    if argv.is_empty() {
        return Err(AppError::LaunchFailed(
            "opener template is empty".to_string(),
        ));
    }
    Ok(argv)
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
    fn build_opener_argv_splits_program_and_path() {
        let argv = build_opener_argv(r#"code "<path>""#, "C:/foo").unwrap();
        assert_eq!(argv, vec!["code", "C:/foo"]);
    }

    #[test]
    fn build_opener_argv_keeps_spaced_path_as_single_token() {
        // audit F2: token 分割後に置換するため、 空白入りパスでも 2 token のまま。
        let argv = build_opener_argv(r#"code "<path>""#, "C:/My Project").unwrap();
        assert_eq!(argv, vec!["code", "C:/My Project"]);
    }

    #[test]
    fn build_opener_argv_keeps_metachar_path_as_single_token() {
        // audit F2: `&` `'` を含むパスも単一 token に収まり、 shell 演算子化しない。
        let argv = build_opener_argv(r#"wt -d "<path>""#, "C:/a & b/o'brien").unwrap();
        assert_eq!(argv, vec!["wt", "-d", "C:/a & b/o'brien"]);
    }

    #[test]
    fn build_opener_argv_does_not_chain_commands() {
        // template に `&&` があっても、 token 化により literal 引数になりコマンド連鎖しない。
        let argv = build_opener_argv(r#"echo "<path>" && cd "<path>""#, "C:/x").unwrap();
        assert_eq!(argv, vec!["echo", "C:/x", "&&", "cd", "C:/x"]);
    }

    #[test]
    fn build_opener_argv_errors_when_placeholder_missing() {
        let err = build_opener_argv("notepad", "x").unwrap_err();
        assert!(matches!(err, AppError::LaunchFailed(_)));
    }

    #[test]
    fn launch_with_rejects_empty_target() {
        let opener = builtin_openers()
            .into_iter()
            .find(|o| o.id == "builtin:vscode")
            .unwrap();
        assert!(matches!(
            launch_with(&opener, "   "),
            Err(AppError::InvalidInput(_))
        ));
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

/// V1 解消 (A3 PR-A): AppServices 集約パターン用の service struct。
/// 各 method は同 module の free function に delegate (scope 限定のため既存実装は維持)。
/// 注: `resolve_with_conn` (内部 helper) と `launch_with` (db 不要) は struct method 化しない。
pub struct OpenerService {
    db: std::sync::Arc<crate::db::DbState>,
}

impl OpenerService {
    pub fn new(db: std::sync::Arc<crate::db::DbState>) -> Self {
        Self { db }
    }

    pub fn list_all(&self) -> Result<Vec<Opener>, AppError> {
        list_all(&self.db)
    }

    pub fn resolve(&self, opener_id: &str) -> Result<Opener, AppError> {
        resolve(&self.db, opener_id)
    }

    pub fn save(&self, input: SaveOpenerInput) -> Result<Opener, AppError> {
        save(&self.db, input)
    }

    pub fn delete(&self, id: &str) -> Result<(), AppError> {
        delete(&self.db, id)
    }
}
