use std::path::Path;
use std::process::Command;
use std::thread;

use crate::models::git::{GitStatus, GitStatusBatchEntry};
use crate::utils::error::AppError;

/// 親プロセス（Tauri / lefthook 等）から漏れた GIT_* 環境変数を除去した Command を作る。
/// これらが設定されていると、`current_dir` を指定しても git は親 repo を操作してしまう。
fn git_cmd() -> Command {
    // 背景の git 走査。 走査ごとに git を多数 spawn するため、 background_command 経由で
    // Windows の console window ちらつきを抑止する (user 報告 2026-06: プロジェクトモーダルの
    // git 走査で大量の console が出る)。
    let mut c = crate::utils::process::background_command("git");
    for var in [
        "GIT_DIR",
        "GIT_WORK_TREE",
        "GIT_INDEX_FILE",
        "GIT_OBJECT_DIRECTORY",
        "GIT_NAMESPACE",
        "GIT_COMMON_DIR",
    ] {
        c.env_remove(var);
    }
    c
}

/// 指定 cwd で git サブコマンドを実行し、stdout を返す。
fn run_git_command(args: &[&str], cwd: &str) -> Result<String, AppError> {
    let output = git_cmd()
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| AppError::LaunchFailed(format!("git not found: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::LaunchFailed(stderr.trim().to_string()));
    }

    Ok(String::from_utf8_lossy(&output.stdout)
        .trim_end()
        .to_string())
}

/// 指定パスの Git リポジトリからブランチ名と変更状態を取得する。
/// `.git` が存在しないディレクトリではプロセスを起動せずエラーを返す。
pub fn git_status(path: &str) -> Result<GitStatus, AppError> {
    if !Path::new(path).join(".git").exists() {
        return Err(AppError::LaunchFailed("not a git repository".to_string()));
    }

    // `git status --porcelain -b` で 1 プロセスからブランチ名と変更を同時に取得
    let stdout = run_git_command(&["status", "--porcelain", "-b"], path)?;

    let mut lines = stdout.lines();

    // 1行目: "## branch...tracking" or "## branch"
    let branch = lines
        .next()
        .and_then(|line| line.strip_prefix("## "))
        .map(|s| {
            // "main...origin/main" → "main"
            s.split("...").next().unwrap_or(s).to_string()
        })
        .unwrap_or_default();

    let changed_count = lines.filter(|l| !l.is_empty()).count();

    Ok(GitStatus {
        branch,
        has_changes: changed_count > 0,
        changed_count,
    })
}

/// Phase L-1 (2026-05-07): git_status を **並列実行**で batch 化。
///
/// 真因: 旧実装は ProjectsWidget mount 時に各フォルダ別で `cmd_git_status` IPC を呼んでいたため、
/// IPC roundtrip + git process spawn × N フォルダ で累積数秒の遅延 (user 検収 Library freeze の主因)。
///
/// fix: 入力 `paths: Vec<String>` を受け、各 path に std::thread::spawn を立てて並列実行。
/// thread の join で結果回収、入力順序を保持して `Vec<GitStatusBatchEntry>` を返す。
///
/// エラー (.git なし / git 無 / process panic) は `status: None` で silent skip — ProjectsWidget
/// 側の旧 try/catch スキップ仕様と互換。
///
/// thread 並列度: paths.len() ぶん spawn (実用 N≤50 想定)。OS thread コストが軽微なため pool 不要。
pub fn git_statuses_batch(paths: Vec<String>) -> Vec<GitStatusBatchEntry> {
    let handles: Vec<_> = paths
        .into_iter()
        .map(|path| {
            let p = path.clone();
            (path, thread::spawn(move || git_status(&p)))
        })
        .collect();
    handles
        .into_iter()
        .map(|(path, handle)| {
            let status = match handle.join() {
                Ok(Ok(s)) => Some(s),
                Ok(Err(_)) => None,
                Err(_) => None,
            };
            GitStatusBatchEntry { path, status }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn init_git_repo(dir: &std::path::Path) {
        super::git_cmd()
            .args(["init"])
            .current_dir(dir)
            .output()
            .expect("git init failed");
        super::git_cmd()
            .args(["config", "user.email", "test@test.com"])
            .current_dir(dir)
            .output()
            .ok();
        super::git_cmd()
            .args(["config", "user.name", "Test"])
            .current_dir(dir)
            .output()
            .ok();
    }

    #[test]
    fn test_git_status_branch_name() {
        let tmp = std::env::temp_dir().join(format!("ag_git_test_{}", uuid::Uuid::now_v7()));
        fs::create_dir_all(&tmp).unwrap();
        init_git_repo(&tmp);

        // 初回コミットがないと HEAD が定まらないので空コミット
        super::git_cmd()
            .args(["commit", "--allow-empty", "-m", "init"])
            .current_dir(&tmp)
            .output()
            .unwrap();

        // 新ブランチ作成
        super::git_cmd()
            .args(["checkout", "-b", "feature/test"])
            .current_dir(&tmp)
            .output()
            .unwrap();

        let status = git_status(tmp.to_str().unwrap()).unwrap();
        assert_eq!(status.branch, "feature/test");

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_git_status_clean_no_changes() {
        let tmp = std::env::temp_dir().join(format!("ag_git_test_{}", uuid::Uuid::now_v7()));
        fs::create_dir_all(&tmp).unwrap();
        init_git_repo(&tmp);
        super::git_cmd()
            .args(["commit", "--allow-empty", "-m", "init"])
            .current_dir(&tmp)
            .output()
            .unwrap();

        let status = git_status(tmp.to_str().unwrap()).unwrap();
        assert!(!status.has_changes);
        assert_eq!(status.changed_count, 0);

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_git_status_has_changes() {
        let tmp = std::env::temp_dir().join(format!("ag_git_test_{}", uuid::Uuid::now_v7()));
        fs::create_dir_all(&tmp).unwrap();
        init_git_repo(&tmp);
        super::git_cmd()
            .args(["commit", "--allow-empty", "-m", "init"])
            .current_dir(&tmp)
            .output()
            .unwrap();

        // untracked file を追加
        fs::write(tmp.join("new_file.txt"), "hello").unwrap();

        let status = git_status(tmp.to_str().unwrap()).unwrap();
        assert!(status.has_changes);
        assert!(status.changed_count >= 1);

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_git_status_non_repo_error() {
        let tmp = std::env::temp_dir().join(format!("ag_git_test_{}", uuid::Uuid::now_v7()));
        fs::create_dir_all(&tmp).unwrap();

        let result = git_status(tmp.to_str().unwrap());
        assert!(result.is_err());

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_git_status_nonexistent_path() {
        let result = git_status("/nonexistent/path/to/repo");
        assert!(result.is_err());
    }

    #[test]
    fn test_git_statuses_batch_preserves_order_and_skips_errors() {
        // Phase L-1: 入力 paths と同じ順序で結果が返る、git repo でない path は status: None。
        let tmp_repo = std::env::temp_dir().join(format!("ag_batch_test_{}", uuid::Uuid::now_v7()));
        fs::create_dir_all(&tmp_repo).unwrap();
        init_git_repo(&tmp_repo);
        super::git_cmd()
            .args(["commit", "--allow-empty", "-m", "init"])
            .current_dir(&tmp_repo)
            .output()
            .unwrap();

        let tmp_non_repo =
            std::env::temp_dir().join(format!("ag_batch_test_nonrepo_{}", uuid::Uuid::now_v7()));
        fs::create_dir_all(&tmp_non_repo).unwrap();

        let paths = vec![
            tmp_repo.to_string_lossy().to_string(),
            tmp_non_repo.to_string_lossy().to_string(),
            "/nonexistent/foo".to_string(),
        ];
        let results = git_statuses_batch(paths.clone());

        assert_eq!(results.len(), 3);
        assert_eq!(results[0].path, paths[0]);
        assert_eq!(results[1].path, paths[1]);
        assert_eq!(results[2].path, paths[2]);
        assert!(results[0].status.is_some(), "git repo は status を持つ");
        assert!(results[1].status.is_none(), "non-repo は None");
        assert!(results[2].status.is_none(), "nonexistent も None");

        let _ = fs::remove_dir_all(&tmp_repo);
        let _ = fs::remove_dir_all(&tmp_non_repo);
    }

    #[test]
    fn test_git_statuses_batch_empty_input() {
        let results = git_statuses_batch(vec![]);
        assert_eq!(results.len(), 0);
    }
}
