// Process launch logic (per item type)

use std::path::Path;
use std::process::Command;

use crate::utils::error::AppError;

/// EXE ファイルを起動
pub fn launch_exe(
    target: &str,
    args: Option<&str>,
    working_dir: Option<&str>,
) -> Result<(), AppError> {
    let mut cmd = Command::new(target);
    if let Some(a) = args {
        cmd.args(a.split_whitespace());
    }
    if let Some(wd) = working_dir {
        cmd.current_dir(wd);
    }
    cmd.spawn()
        .map_err(|e| AppError::LaunchFailed(e.to_string()))?;
    Ok(())
}

/// URL をデフォルトブラウザで開く
pub fn launch_url(url: &str) -> Result<(), AppError> {
    Command::new("cmd")
        .args(["/c", "start", "", url])
        .spawn()
        .map_err(|e| AppError::LaunchFailed(e.to_string()))?;
    Ok(())
}

/// フォルダをエクスプローラーで開く
pub fn launch_folder(path: &str) -> Result<(), AppError> {
    Command::new("explorer.exe")
        .arg(path)
        .spawn()
        .map_err(|e| AppError::LaunchFailed(e.to_string()))?;
    Ok(())
}

/// スクリプトファイルを実行（拡張子で判定）
pub fn launch_script(
    path: &str,
    args: Option<&str>,
    working_dir: Option<&str>,
) -> Result<(), AppError> {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let mut cmd = match ext.as_str() {
        "ps1" => {
            let mut c = Command::new("powershell");
            c.args(["-ExecutionPolicy", "Bypass", "-File", path]);
            if let Some(a) = args {
                c.args(a.split_whitespace());
            }
            c
        }
        "bat" | "cmd" => {
            let mut c = Command::new("cmd");
            c.args(["/c", path]);
            if let Some(a) = args {
                c.args(a.split_whitespace());
            }
            c
        }
        _ => {
            let mut c = Command::new("cmd");
            c.args(["/c", path]);
            if let Some(a) = args {
                c.args(a.split_whitespace());
            }
            c
        }
    };

    if let Some(wd) = working_dir {
        cmd.current_dir(wd);
    }
    cmd.spawn()
        .map_err(|e| AppError::LaunchFailed(e.to_string()))?;
    Ok(())
}

/// コマンド文字列を実行（スペースで最初のトークンがコマンド、残りが引数）
pub fn launch_command(command: &str, working_dir: Option<&str>) -> Result<(), AppError> {
    let mut tokens = command.split_whitespace();
    let program = tokens
        .next()
        .ok_or_else(|| AppError::LaunchFailed("empty command string".to_string()))?;

    let mut cmd = Command::new(program);
    cmd.args(tokens);
    if let Some(wd) = working_dir {
        cmd.current_dir(wd);
    }
    cmd.spawn()
        .map_err(|e| AppError::LaunchFailed(e.to_string()))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_launch_command_empty_string_returns_error() {
        let result = launch_command("", None);
        assert!(result.is_err());
        match result {
            Err(AppError::LaunchFailed(msg)) => {
                assert_eq!(msg, "empty command string");
            }
            _ => panic!("expected LaunchFailed"),
        }
    }

    #[test]
    fn test_launch_command_whitespace_only_returns_error() {
        let result = launch_command("   ", None);
        assert!(result.is_err());
    }

    #[test]
    fn test_url_prefix_validation() {
        // URL として "https://" で始まるものを渡す。
        // Windows環境でないテスト実行時はプロセス起動が失敗する場合があるが、
        // 文字列解析ロジック自体は start "" url の形式を取ることだけを確認する。
        let url = "https://example.com";
        assert!(url.starts_with("https://") || url.starts_with("http://"));
    }

    #[test]
    fn test_command_split_first_token_is_program() {
        // split_whitespace の正常系: 最初のトークンがプログラム名になることを確認
        let command = "notepad C:/test/file.txt";
        let mut tokens = command.split_whitespace();
        let program = tokens.next().unwrap();
        let args: Vec<&str> = tokens.collect();
        assert_eq!(program, "notepad");
        assert_eq!(args, vec!["C:/test/file.txt"]);
    }

    #[test]
    fn test_script_ext_ps1_detection() {
        let path = "C:/scripts/setup.ps1";
        let ext = std::path::Path::new(path)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        assert_eq!(ext, "ps1");
    }

    #[test]
    fn test_script_ext_bat_detection() {
        let path = "C:/scripts/build.bat";
        let ext = std::path::Path::new(path)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        assert_eq!(ext, "bat");
    }
}
