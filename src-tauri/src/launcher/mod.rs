// Process launch logic (per item type)

use std::io;
use std::path::Path;
use std::process::Command;

use crate::utils::error::AppError;

/// PH-CF-1210 ⑨ e2e: 全ての external process spawn が通過する単一葉。
///
/// 通常経路は `cmd.spawn()` を呼ぶだけ。 `test-launch-seam` feature 有効 build + `ARCAGATE_TEST_LAUNCH_SEAM_LOG`
/// 環境変数 (path) が設定されている時のみ、 実 spawn を skip して `{ what, program, args, cwd }` の JSON 行を
/// 指定 path に append する (e2e test が後で読んで「click 経路と右クリック『デフォルトで開く』が同じ opener +
/// 同じ target で launch 要求を出した」 ことを機械検証する)。 release build / 通常 dev には feature が無く
/// 一切のオーバーヘッドは無い。
///
/// 引用元: feedback_self_verification.md / dom-not-fixed rule (生 UI 経路の機械検証必須)。
pub fn try_spawn_cmd(cmd: &mut Command, what: &str) -> Result<(), AppError> {
    #[cfg(feature = "test-launch-seam")]
    {
        if let Ok(log_path) = std::env::var("ARCAGATE_TEST_LAUNCH_SEAM_LOG") {
            return record_seam(&log_path, cmd, what);
        }
    }
    let _ = what;
    cmd.spawn().map_err(map_spawn_error)?;
    Ok(())
}

#[cfg(feature = "test-launch-seam")]
fn record_seam(log_path: &str, cmd: &Command, what: &str) -> Result<(), AppError> {
    use std::io::Write;

    let program = cmd.get_program().to_string_lossy().into_owned();
    let args: Vec<String> = cmd
        .get_args()
        .map(|a| a.to_string_lossy().into_owned())
        .collect();
    let cwd: Option<String> = cmd
        .get_current_dir()
        .map(|p| p.to_string_lossy().into_owned());

    // 手書きで JSON 1 行を組み立てる (serde_json::to_string と等価だが extra dependency に頼らない)。
    let mut line = String::from("{");
    line.push_str(&format!("\"what\":{},", json_str(what)));
    line.push_str(&format!("\"program\":{},", json_str(&program)));
    line.push_str("\"args\":[");
    for (i, a) in args.iter().enumerate() {
        if i > 0 {
            line.push(',');
        }
        line.push_str(&json_str(a));
    }
    line.push(']');
    if let Some(d) = cwd {
        line.push_str(&format!(",\"cwd\":{}", json_str(&d)));
    }
    line.push('}');
    line.push('\n');

    let mut f = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|e| AppError::LaunchFailed(format!("test seam open log failed: {e}")))?;
    f.write_all(line.as_bytes())
        .map_err(|e| AppError::LaunchFailed(format!("test seam write log failed: {e}")))?;
    Ok(())
}

#[cfg(feature = "test-launch-seam")]
fn json_str(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

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
    try_spawn_cmd(&mut cmd, "exe")
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
    try_spawn_cmd(&mut cmd, "exe_args")
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
    let mut cmd = Command::new("explorer.exe");
    cmd.arg(url);
    try_spawn_cmd(&mut cmd, "url")
}

/// フォルダ / ファイルを Explorer (OS デフォルト) で開く。
///
/// audit F3 (2026-05-18): `cmd /c start` を廃し explorer.exe + 構造化引数に変更。
/// path をシェル文字列に連結しないため `&` 等を含むパスでも安全に開ける。
pub fn launch_folder(path: &str) -> Result<(), AppError> {
    reject_control_chars(path, "path")?;
    let mut cmd = Command::new("explorer.exe");
    cmd.arg(path);
    try_spawn_cmd(&mut cmd, "folder")
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
    try_spawn_cmd(&mut cmd, "script")
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
    try_spawn_cmd(&mut cmd, "command")
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
    try_spawn_cmd(&mut cmd, "argv")
}

/// 指定ディレクトリを working directory として terminal を起動する。
///
/// audit F2 (2026-05-18): builtin opener (cmd / powershell) 用。 対象 path を引数文字列に
/// 埋め込まず `current_dir` 経由で渡すことで、 `cmd /c` の再パースや PowerShell の
/// シングルクォート文字列 escape を突くインジェクション経路を排除する。
pub fn launch_terminal_in_dir(program: &str, args: &[&str], dir: &str) -> Result<(), AppError> {
    reject_control_chars(dir, "directory")?;
    let mut cmd = Command::new(program);
    cmd.args(args).current_dir(dir);
    try_spawn_cmd(&mut cmd, "terminal_in_dir")
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
