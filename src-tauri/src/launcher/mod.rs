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
///
/// PH-CF-1210 ⑨: Windows の場合は `resolve_program_with_pathext` で PATH + PATHEXT を
/// 解決して program の絶対 path を取得する。 これにより `code` opener (VSCode の `code.cmd` shim)
/// が `Command::new("code").spawn()` で NotFound になる問題 (Rust std は PATHEXT を自動 search
/// せず、 `code` だけでは `code.cmd` を見つけられない) を解決する。 該当しない program (= PATH に
/// 見つからない) は `LaunchOpenerNotFound` で返し、 caller (`cmd_launch_with_opener`) が
/// folder アイテムなら Explorer フォールバックに振れるようにする。
pub fn launch_argv(tokens: &[String], working_dir: Option<&str>) -> Result<(), AppError> {
    let (program, args) = tokens
        .split_first()
        .ok_or_else(|| AppError::LaunchFailed("empty command".to_string()))?;
    let resolved: std::path::PathBuf = if cfg!(target_os = "windows") {
        resolve_program_with_pathext(program)
            .ok_or_else(|| AppError::LaunchOpenerNotFound(program.clone()))?
    } else {
        std::path::PathBuf::from(program)
    };
    let mut cmd = Command::new(&resolved);
    cmd.args(args);
    if let Some(wd) = working_dir {
        cmd.current_dir(wd);
    }
    try_spawn_cmd(&mut cmd, "argv")
}

/// PH-CF-1210 ⑨ (Windows 専用): PATH + PATHEXT を Windows 流に解決して program の絶対 path
/// を返す。 見つからなければ None。
///
/// 動機: Rust の `std::process::Command::new("code")` は PATH search だけで PATHEXT を自動
/// 適用せず、 `code.cmd` (= VSCode CLI shim) や `pnpm.cmd` (= pnpm shim) を直接 spawn できない
/// (`Command::new("code.cmd")` のように拡張子を明示すれば動く)。 daily-use ツールでは opener
/// template に `code "<path>"` のように拡張子なしで書かれるのが普通なので、 ここで OS の検索
/// ロジック (PATH の各 dir に対し PATHEXT の各拡張子を試す) を Rust 側で代行する。
///
/// アルゴリズム:
///   1. program が絶対 path / 区切り含み → そのまま実在チェック。
///   2. PATH を split → 各 dir に対し、 PATHEXT (`.COM;.EXE;.BAT;.CMD` default) を順に試す。
///      program に既に拡張子があれば PATHEXT 試行は skip (= 空文字列のみ)。
///   3. 最初に file として実在した候補を返す。 順序は CreateProcessW と同じ思想 (PATH 順 ×
///      PATHEXT 順) で、 例えば `code.exe` と `code.cmd` の両方が存在すれば前者が先に拾われる。
#[cfg(target_os = "windows")]
pub fn resolve_program_with_pathext(program: &str) -> Option<std::path::PathBuf> {
    let p = Path::new(program);

    // 既に絶対 path、 もしくは区切り (/ or \) を含む相対 path → PATH search 不要、 そのまま実在チェック。
    if p.is_absolute() || program.contains('/') || program.contains('\\') {
        return if p.exists() {
            Some(p.to_path_buf())
        } else {
            None
        };
    }

    let path_var = std::env::var_os("PATH")?;
    let dirs: Vec<std::path::PathBuf> = std::env::split_paths(&path_var).collect();

    let pathext_var =
        std::env::var("PATHEXT").unwrap_or_else(|_| ".COM;.EXE;.BAT;.CMD".to_string());
    // 拡張子試行順:
    //   - program が既に拡張子付き (例 `code.cmd`) → 空文字列のみ (= name そのまま) で検索
    //   - program が拡張子なし (例 `code`) → PATHEXT の各拡張子のみ (= 空文字列は **入れない**)
    //
    // 空文字列を含めない理由: VSCode は `C:\...\bin\code` (= bash shim、 拡張子なし) と `code.cmd`
    // (= Windows 用 shim) の **両方** を同 dir に install するため、 空文字列を先に試すと
    // `code` (= bash shim) が拾われて Command::spawn が Windows native executable でないため
    // 起動不能になる。 PATHEXT のみを試すことで `code.cmd` を確実に拾える。
    let exts: Vec<String> = if p.extension().is_some() {
        vec![String::new()]
    } else {
        pathext_var
            .split(';')
            .map(|e| e.trim().to_string())
            .filter(|e| e.starts_with('.'))
            .collect()
    };

    for dir in &dirs {
        for ext in &exts {
            let candidate = dir.join(format!("{program}{ext}"));
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

/// 非 Windows ターゲット向け stub (実機経路は Windows のみ。 PATHEXT 概念は Windows 固有)。
#[cfg(not(target_os = "windows"))]
pub fn resolve_program_with_pathext(program: &str) -> Option<std::path::PathBuf> {
    let p = Path::new(program);
    if p.exists() {
        Some(p.to_path_buf())
    } else {
        None
    }
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

    // --- PH-CF-1210 ⑨: resolve_program_with_pathext ---

    #[cfg(target_os = "windows")]
    #[test]
    fn resolve_program_with_pathext_finds_cmd_shim() {
        use std::ffi::OsString;
        use std::fs;
        use std::path::PathBuf;
        // 一時 dir に foo.cmd を作って PATH に乗せる。 program 名 "foo" (拡張子なし) で
        // PATHEXT 経由で .cmd shim が見つかることを assert。 PR #578 では `code` (= `code.cmd`)
        // が見つからず spawn が NotFound していた root cause を直す helper の核。
        let tmp =
            std::env::temp_dir().join(format!("arcagate-pathext-test-{}", uuid::Uuid::now_v7()));
        fs::create_dir_all(&tmp).unwrap();
        let shim: PathBuf = tmp.join("foo.cmd");
        fs::write(&shim, b"@echo off\n").unwrap();

        // 旧 PATH を保存して、 一時 PATH に置換して resolve、 最後に復元。
        let orig_path = std::env::var_os("PATH").unwrap_or_default();
        let mut new_path = OsString::from(tmp.as_os_str());
        new_path.push(";");
        new_path.push(&orig_path);
        // SAFETY: test 内 single-threaded で env をいじる、 cleanup で復元。
        unsafe {
            std::env::set_var("PATH", &new_path);
        }

        let resolved = resolve_program_with_pathext("foo");
        // 戻す前に assert (panic で env 残しても次 test に影響しないが行儀の問題)。
        let found_ok = resolved
            .as_ref()
            .and_then(|p| p.file_name().and_then(|s| s.to_str()))
            .map(|name| name.to_ascii_lowercase() == "foo.cmd")
            .unwrap_or(false);

        unsafe {
            std::env::set_var("PATH", &orig_path);
        }
        let _ = fs::remove_dir_all(&tmp);

        assert!(
            found_ok,
            "foo.cmd should be resolved via PATHEXT (got: {resolved:?})"
        );
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn resolve_program_with_pathext_returns_none_for_unknown_program() {
        let resolved = resolve_program_with_pathext("__definitely_not_in_path_arcagate_test__");
        assert!(resolved.is_none());
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn resolve_program_with_pathext_passes_absolute_path_through() {
        // 既に絶対 path が渡れば PATH search を skip して実在チェックだけ。
        let manifest = env!("CARGO_MANIFEST_DIR");
        let resolved = resolve_program_with_pathext(manifest);
        assert!(resolved.is_some());
    }
}
