// Process launch logic (per item type)

use std::io;
use std::path::Path;
use std::process::Command;

use crate::utils::error::AppError;

/// 実行を許可するスクリプト拡張子の allowlist (audit F15 2026-05-18)。
///
/// security model: 旧 `launch_script` は未知拡張子も `cmd /c <path>` で起動する
/// fallback (`_ =>` arm) を持っていた。 これを明示 allowlist 化し、 想定外拡張子の
/// 起動経路を塞ぐ。 `launch_exe` の .bat/.cmd 委譲もこの allowlist に整合する。
pub const ALLOWED_SCRIPT_EXTENSIONS: &[&str] = &["ps1", "bat", "cmd"];

/// std::io::Error → AppError 分類 (Nielsen H9 launch エラー診断)
fn map_spawn_error(e: io::Error) -> AppError {
    match e.kind() {
        io::ErrorKind::NotFound => AppError::LaunchFileNotFound(e.to_string()),
        io::ErrorKind::PermissionDenied => AppError::LaunchPermissionDenied(e.to_string()),
        _ => AppError::LaunchFailed(e.to_string()),
    }
}

/// 制御文字 (C0 / DEL / unicode 制御) を含む文字列を拒否する (audit F3/F8 2026-05-18)。
///
/// path / URL に制御文字が現れる正当な用途はなく、 process spawn 前の防御的検証として
/// 早期拒否する。 空文字も同時に拒否する。
fn reject_control_chars(value: &str, what: &str) -> Result<(), AppError> {
    if value.is_empty() {
        return Err(AppError::InvalidInput(format!("{what} is empty")));
    }
    if value.chars().any(char::is_control) {
        return Err(AppError::InvalidInput(format!(
            "{what} contains control characters"
        )));
    }
    Ok(())
}

/// frontend から渡された raw path が起動に使える実在パスか検証する (audit F8 2026-05-18)。
///
/// security model: `cmd_open_path` / `cmd_reveal_in_explorer` / `cmd_launch_with_opener` は
/// item id ではなく path 文字列を WebView から直接受け取る。 制御文字を拒否し、 実在
/// (file / dir) を確認することで、 インジェクション目的の細工文字列 (実在パスにならない)
/// を起動コードに到達させない。
pub fn validate_existing_path(path: &str) -> Result<(), AppError> {
    reject_control_chars(path, "path")?;
    if !Path::new(path).exists() {
        return Err(AppError::LaunchFileNotFound(path.to_string()));
    }
    Ok(())
}

/// EXE ファイルを起動
pub fn launch_exe(
    target: &str,
    args: Option<&str>,
    working_dir: Option<&str>,
) -> Result<(), AppError> {
    // .bat / .cmd は cmd.exe 経由が必須
    let ext = Path::new(target)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    if ext == "bat" || ext == "cmd" {
        return launch_script(target, args, working_dir);
    }

    let mut cmd = Command::new(target);
    if let Some(a) = args {
        // PH-422 / Codex Q5 #6: shell-words::split で quoted args を正しく扱う
        // (split_whitespace では `--flag "value with space"` が破壊される)
        let parsed = shell_words::split(a)
            .map_err(|e| AppError::LaunchFailed(format!("invalid args quoting: {e}")))?;
        cmd.args(parsed);
    }
    if let Some(wd) = working_dir {
        cmd.current_dir(wd);
    }
    cmd.spawn().map_err(map_spawn_error)?;
    Ok(())
}

/// 引数を構造化 Vec で渡す EXE 起動（スペース入りパス対応）
pub fn launch_exe_args(
    target: &str,
    args: &[&str],
    working_dir: Option<&str>,
) -> Result<(), AppError> {
    let mut cmd = Command::new(target);
    cmd.args(args);
    if let Some(wd) = working_dir {
        cmd.current_dir(wd);
    }
    cmd.spawn().map_err(map_spawn_error)?;
    Ok(())
}

/// URL をデフォルトブラウザ / 関連付けハンドラで開く。
///
/// audit F3 (2026-05-18): 旧実装は `cmd /c start "" <url>` で、 cmd.exe が command line
/// を再パースするため URL 中の `&` `|` `^` `(` `)` 等で任意コマンド実行になりえた
/// (bookmark import 由来の URL が攻撃面)。 `explorer.exe` へ **構造化引数 1 個**として
/// 渡すことで shell の再パースを完全に排除する。 explorer は受け取った文字列を OS の
/// プロトコルハンドラ (http(s) → ブラウザ、 mailto → メール等) に委譲する。
pub fn launch_url(url: &str) -> Result<(), AppError> {
    reject_control_chars(url, "url")?;
    Command::new("explorer.exe")
        .arg(url)
        .spawn()
        .map_err(|e| AppError::LaunchFailed(e.to_string()))?;
    Ok(())
}

/// フォルダ / ファイルを Explorer (OS デフォルト) で開く。
///
/// audit F3 (2026-05-18): `cmd /c start` を廃し explorer.exe + 構造化引数に変更。
/// path をシェル文字列に連結しないため `&` 等を含むパスでも安全に開ける。
pub fn launch_folder(path: &str) -> Result<(), AppError> {
    reject_control_chars(path, "path")?;
    Command::new("explorer.exe")
        .arg(path)
        .spawn()
        .map_err(|e| AppError::LaunchFailed(e.to_string()))?;
    Ok(())
}

/// PH-422: shell-words::split で quoted args を扱う helper
fn parse_args(a: &str) -> Result<Vec<String>, AppError> {
    shell_words::split(a).map_err(|e| AppError::LaunchFailed(format!("invalid args quoting: {e}")))
}

/// スクリプトファイルを実行（拡張子で判定）。
///
/// audit F15 (2026-05-18): 拡張子は `ALLOWED_SCRIPT_EXTENSIONS` allowlist で検証する。
/// allowlist 外の拡張子は `LaunchNotExecutable` で拒否し、 旧 `_ =>` fallback
/// (未知拡張子を `cmd /c` で実行) を廃止した。
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

    if !ALLOWED_SCRIPT_EXTENSIONS.contains(&ext.as_str()) {
        return Err(AppError::LaunchNotExecutable(format!(
            "script extension '{ext}' is not allowed (allowed: {})",
            ALLOWED_SCRIPT_EXTENSIONS.join(", ")
        )));
    }

    let parsed_args = match args {
        Some(a) => parse_args(a)?,
        None => Vec::new(),
    };

    let mut cmd = match ext.as_str() {
        "ps1" => {
            let mut c = Command::new("powershell");
            c.args(["-ExecutionPolicy", "Bypass", "-File", path]);
            c.args(&parsed_args);
            c
        }
        "bat" | "cmd" => {
            let mut c = Command::new("cmd");
            c.args(["/c", path]);
            c.args(&parsed_args);
            c
        }
        // allowlist 検証済のため到達しない
        other => unreachable!("script extension '{other}' passed allowlist but has no handler"),
    };

    if let Some(wd) = working_dir {
        cmd.current_dir(wd);
    }
    cmd.spawn().map_err(map_spawn_error)?;
    Ok(())
}

/// コマンド文字列を実行（最初のトークンがコマンド、残りが引数）。
/// PH-422: shell-words で quoting に対応し、スペース入りパスを安全に扱う。
/// shell を経由せず `Command` へ構造化引数として渡すため、 token 内の `&` 等は
/// シェル演算子として解釈されない。
pub fn launch_command(command: &str, working_dir: Option<&str>) -> Result<(), AppError> {
    let mut tokens = parse_args(command)?.into_iter();
    let program = tokens
        .next()
        .ok_or_else(|| AppError::LaunchFailed("empty command string".to_string()))?;

    let mut cmd = Command::new(&program);
    cmd.args(tokens);
    if let Some(wd) = working_dir {
        cmd.current_dir(wd);
    }
    cmd.spawn().map_err(map_spawn_error)?;
    Ok(())
}

/// 構造化トークン列を直接 process 起動する (shell 非経由)。
///
/// audit F2 (2026-05-18): opener template の token 化実行用。 `tokens[0]` を program、
/// 残りを引数として `Command` に渡す。 各 token は単一 argv 要素になるため、 token 内の
/// `&` `|` 等はシェル演算子として再解釈されない。
pub fn launch_argv(tokens: &[String], working_dir: Option<&str>) -> Result<(), AppError> {
    let (program, args) = tokens
        .split_first()
        .ok_or_else(|| AppError::LaunchFailed("empty command".to_string()))?;
    let mut cmd = Command::new(program);
    cmd.args(args);
    if let Some(wd) = working_dir {
        cmd.current_dir(wd);
    }
    cmd.spawn().map_err(map_spawn_error)?;
    Ok(())
}

/// 指定ディレクトリを working directory として terminal を起動する。
///
/// audit F2 (2026-05-18): builtin opener (cmd / powershell) 用。 対象 path を引数文字列に
/// 埋め込まず `current_dir` 経由で渡すことで、 `cmd /c` の再パースや PowerShell の
/// シングルクォート文字列 escape を突くインジェクション経路を排除する。
pub fn launch_terminal_in_dir(program: &str, args: &[&str], dir: &str) -> Result<(), AppError> {
    reject_control_chars(dir, "directory")?;
    Command::new(program)
        .args(args)
        .current_dir(dir)
        .spawn()
        .map_err(map_spawn_error)?;
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

    // PH-422 / Codex Q5 #6 — shell-words による quoted args 解析
    #[test]
    fn parse_args_handles_quoted_path_with_spaces() {
        let parsed = parse_args(r#""C:/Program Files/Foo/foo.exe" --flag value"#).unwrap();
        assert_eq!(parsed[0], "C:/Program Files/Foo/foo.exe");
        assert_eq!(parsed[1], "--flag");
        assert_eq!(parsed[2], "value");
    }

    #[test]
    fn parse_args_handles_flag_with_quoted_value() {
        let parsed = parse_args(r#"--config "C:/data/config file.json" --port 8080"#).unwrap();
        assert_eq!(parsed[0], "--config");
        assert_eq!(parsed[1], "C:/data/config file.json");
        assert_eq!(parsed[2], "--port");
        assert_eq!(parsed[3], "8080");
    }

    #[test]
    fn parse_args_returns_error_on_unclosed_quote() {
        let result = parse_args(r#"--flag "unclosed quote"#);
        assert!(matches!(result, Err(AppError::LaunchFailed(_))));
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

    // --- audit F15: スクリプト拡張子 allowlist ---

    #[test]
    fn launch_script_rejects_disallowed_extension() {
        // .vbs は allowlist 外 — 起動経路に到達せず NotExecutable で拒否される。
        let result = launch_script("C:/scripts/macro.vbs", None, None);
        assert!(matches!(result, Err(AppError::LaunchNotExecutable(_))));
    }

    #[test]
    fn launch_script_rejects_extensionless_path() {
        let result = launch_script("C:/scripts/noext", None, None);
        assert!(matches!(result, Err(AppError::LaunchNotExecutable(_))));
    }

    #[test]
    fn allowed_script_extensions_are_lowercase_and_known() {
        for ext in ALLOWED_SCRIPT_EXTENSIONS {
            assert_eq!(*ext, ext.to_lowercase());
        }
        assert!(ALLOWED_SCRIPT_EXTENSIONS.contains(&"ps1"));
        assert!(ALLOWED_SCRIPT_EXTENSIONS.contains(&"bat"));
        assert!(ALLOWED_SCRIPT_EXTENSIONS.contains(&"cmd"));
    }

    // --- audit F3: 制御文字拒否 ---

    #[test]
    fn launch_url_rejects_control_chars() {
        let result = launch_url("https://example.com\n&calc");
        assert!(matches!(result, Err(AppError::InvalidInput(_))));
    }

    #[test]
    fn launch_url_rejects_empty() {
        assert!(matches!(launch_url(""), Err(AppError::InvalidInput(_))));
    }

    #[test]
    fn launch_folder_rejects_control_chars() {
        let result = launch_folder("C:/tmp\u{0}/evil");
        assert!(matches!(result, Err(AppError::InvalidInput(_))));
    }

    // --- audit F8: raw path 検証 ---

    #[test]
    fn validate_existing_path_rejects_control_chars() {
        let result = validate_existing_path("C:/tmp\u{7}/x");
        assert!(matches!(result, Err(AppError::InvalidInput(_))));
    }

    #[test]
    fn validate_existing_path_rejects_missing_path() {
        let result = validate_existing_path("C:/__arcagate_audit_nonexistent__/x.txt");
        assert!(matches!(result, Err(AppError::LaunchFileNotFound(_))));
    }

    #[test]
    fn validate_existing_path_accepts_real_dir() {
        // crate manifest dir は必ず実在する
        let dir = env!("CARGO_MANIFEST_DIR");
        assert!(validate_existing_path(dir).is_ok());
    }

    // --- audit F2: 構造化引数実行 ---

    #[test]
    fn launch_argv_empty_returns_error() {
        let result = launch_argv(&[], None);
        assert!(matches!(result, Err(AppError::LaunchFailed(_))));
    }
}
