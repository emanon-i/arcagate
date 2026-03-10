use std::path::Path;

use crate::models::git::GitStatus;
use crate::utils::error::AppError;

/// 指定 cwd で git サブコマンドを実行し、stdout を返す。
fn run_git_command(args: &[&str], cwd: &str) -> Result<String, AppError> {
    let output = std::process::Command::new("git")
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::process::Command;

    fn init_git_repo(dir: &std::path::Path) {
        Command::new("git")
            .args(["init"])
            .current_dir(dir)
            .output()
            .expect("git init failed");
        Command::new("git")
            .args(["config", "user.email", "test@test.com"])
            .current_dir(dir)
            .output()
            .ok();
        Command::new("git")
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
        Command::new("git")
            .args(["commit", "--allow-empty", "-m", "init"])
            .current_dir(&tmp)
            .output()
            .unwrap();

        // 新ブランチ作成
        Command::new("git")
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
        Command::new("git")
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
        Command::new("git")
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
}
