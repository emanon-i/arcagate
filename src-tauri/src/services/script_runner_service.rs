//! #11: スクリプト監視 widget のスキャン + 実行サービス。
//!
//! セキュリティモデル (PR description にも明記):
//! - 実行対象はカード (widget) に登録された監視フォルダ配下に限定。`run_script` は
//!   フォルダとスクリプト双方を `canonicalize` し、スクリプトがフォルダ配下に収まる
//!   ことを確認してから実行する (path traversal / symlink 脱出を防止)。
//! - 拡張子は `SCRIPT_EXTENSIONS` allowlist に **小文字一致** するもののみ実行可。
//! - 実行はインタプリタとスクリプトパスを **別々の argv 要素** として `Command` に
//!   渡す。shell 文字列結合・環境変数注入・shell 展開は一切行わない。
//! - 通常ファイルのみ実行 (canonicalize 後の実体が file であること)。
//! - 既存の Exe フォルダ監視 (任意 .exe を直接起動) と同等以上の posture。

use std::fs;
use std::path::Path;
use std::process::Command;

use serde::Serialize;

use crate::utils::error::AppError;

/// 実行を許可するスクリプト拡張子 allowlist (小文字・ドットなし)。
pub const SCRIPT_EXTENSIONS: &[&str] = &[
    "bat",
    "cmd",
    "ps1",
    "sh",
    "bash",
    "zsh",
    "fish",
    "vbs",
    "wsf",
    "py",
    "js",
    "ts",
    "rb",
    "pl",
    "lua",
    "applescript",
];

/// スクリプトフォルダ内の 1 スクリプトファイル。
#[derive(Serialize, Default, Debug, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScriptEntry {
    pub path: String,
    pub name: String,
    /// 拡張子 (小文字、ドットなし)。フロントの形式別アイコンに使う。
    pub ext: String,
    pub mtime_ms: u64,
}

fn ext_of(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase())
}

fn mtime_ms_of(meta: &fs::Metadata) -> u64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// `root` を `depth` 段まで走査し、allowlist 拡張子のスクリプトを列挙する。
/// 不在 root は空 Vec (best-effort、AppError なし)。symlink は除外。
pub fn scan_script_folder(root: &str, depth: u8) -> Result<Vec<ScriptEntry>, AppError> {
    let depth = depth.clamp(1, 3);
    let root_path = Path::new(root);
    if !root_path.is_dir() {
        return Ok(Vec::new());
    }
    let mut out = Vec::new();
    walk(root_path, depth, &mut out);
    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(out)
}

fn walk(dir: &Path, remaining: u8, out: &mut Vec<ScriptEntry>) {
    let read = match fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return,
    };
    for entry in read.flatten() {
        let path = entry.path();
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        if meta.is_dir() {
            if remaining > 1 {
                walk(&path, remaining - 1, out);
            }
            continue;
        }
        // symlink (is_file=false on symlink_metadata path) や非通常ファイルは除外。
        if !meta.is_file() {
            continue;
        }
        let ext = match ext_of(&path) {
            Some(e) if SCRIPT_EXTENSIONS.contains(&e.as_str()) => e,
            _ => continue,
        };
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default()
            .to_string();
        out.push(ScriptEntry {
            path: path.to_string_lossy().to_string(),
            name,
            ext,
            mtime_ms: mtime_ms_of(&meta),
        });
    }
}

/// 拡張子 → 実行インタプリタの argv (先頭=プログラム名、以降=固定引数)。
/// スクリプトパスは呼び出し側が別 argv 要素として append する。
fn interpreter_for(ext: &str) -> Option<&'static [&'static str]> {
    Some(match ext {
        "bat" | "cmd" => &["cmd", "/C"],
        "ps1" => &[
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
        ],
        "sh" | "bash" => &["bash"],
        "zsh" => &["zsh"],
        "fish" => &["fish"],
        "vbs" | "wsf" => &["wscript"],
        "py" => &["python"],
        "js" | "ts" => &["node"],
        "rb" => &["ruby"],
        "pl" => &["perl"],
        "lua" => &["lua"],
        "applescript" => &["osascript"],
        _ => return None,
    })
}

/// スクリプトが監視フォルダ配下の許可形式かを検証し、canonicalize 済みパスを返す。
/// (実行・テスト双方から使う純粋な検証ロジック。)
fn validate_script(
    folder: &str,
    script_path: &str,
) -> Result<(std::path::PathBuf, String), AppError> {
    let folder_canon = fs::canonicalize(folder)
        .map_err(|_| AppError::Validation("監視フォルダが解決できません".into()))?;
    let script_canon = fs::canonicalize(script_path)
        .map_err(|_| AppError::LaunchFileNotFound(script_path.to_string()))?;
    let meta = fs::metadata(&script_canon)
        .map_err(|_| AppError::LaunchFileNotFound(script_path.to_string()))?;
    if !meta.is_file() {
        return Err(AppError::Validation(
            "スクリプトが通常ファイルではありません".into(),
        ));
    }
    // confinement: canonicalize 後も監視フォルダ配下であること (traversal / symlink 脱出防止)。
    if !script_canon.starts_with(&folder_canon) {
        return Err(AppError::Validation(
            "スクリプトが監視フォルダの外を指しています".into(),
        ));
    }
    let ext = ext_of(&script_canon)
        .filter(|e| SCRIPT_EXTENSIONS.contains(&e.as_str()))
        .ok_or_else(|| AppError::Validation("許可されていないスクリプト形式です".into()))?;
    Ok((script_canon, ext))
}

/// #11: スクリプトを実行する。検証は `validate_script` 参照。
pub fn run_script(folder: &str, script_path: &str) -> Result<(), AppError> {
    let (script_canon, ext) = validate_script(folder, script_path)?;
    let interp = interpreter_for(&ext)
        .ok_or_else(|| AppError::Validation("許可されていないスクリプト形式です".into()))?;
    let mut cmd = Command::new(interp[0]);
    for fixed in &interp[1..] {
        cmd.arg(fixed);
    }
    // スクリプトパスは独立 argv。shell 文字列結合しないため injection は発生しない。
    cmd.arg(&script_canon);
    if let Some(parent) = script_canon.parent() {
        cmd.current_dir(parent);
    }
    cmd.spawn()
        .map(|_| ())
        .map_err(|e| AppError::LaunchFailed(format!("{}: {}", interp[0], e)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn write_file(path: &Path, content: &[u8]) {
        let mut f = fs::File::create(path).unwrap();
        f.write_all(content).unwrap();
    }

    #[test]
    fn test_scan_picks_allowlisted_scripts_only() {
        let dir = std::env::temp_dir().join(format!("arcagate-scan-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        write_file(&dir.join("a.ps1"), b"echo a");
        write_file(&dir.join("b.bat"), b"echo b");
        write_file(&dir.join("c.txt"), b"not a script");
        write_file(&dir.join("d.exe"), b"not allowlisted");
        let result = scan_script_folder(dir.to_str().unwrap(), 1).unwrap();
        let names: Vec<&str> = result.iter().map(|e| e.name.as_str()).collect();
        assert!(names.contains(&"a.ps1"));
        assert!(names.contains(&"b.bat"));
        assert!(!names.contains(&"c.txt"));
        assert!(!names.contains(&"d.exe"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_scan_missing_root_is_empty() {
        let result = scan_script_folder("Z:/no/such/arcagate/dir", 2).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn test_validate_rejects_script_outside_folder() {
        // フォルダ外のスクリプトを指すと Validation エラー (path traversal 防止)。
        let base = std::env::temp_dir().join(format!("arcagate-conf-{}", std::process::id()));
        let inside = base.join("inside");
        let outside = base.join("outside");
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&inside).unwrap();
        fs::create_dir_all(&outside).unwrap();
        write_file(&outside.join("evil.ps1"), b"echo evil");
        let res = validate_script(
            inside.to_str().unwrap(),
            outside.join("evil.ps1").to_str().unwrap(),
        );
        assert!(res.is_err(), "外部スクリプトは reject されるべき");
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn test_validate_rejects_non_allowlisted_extension() {
        let dir = std::env::temp_dir().join(format!("arcagate-ext-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        write_file(&dir.join("danger.exe"), b"x");
        let res = validate_script(
            dir.to_str().unwrap(),
            dir.join("danger.exe").to_str().unwrap(),
        );
        assert!(res.is_err(), "allowlist 外拡張子は reject されるべき");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_validate_accepts_allowlisted_inside_folder() {
        let dir = std::env::temp_dir().join(format!("arcagate-ok-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        write_file(&dir.join("ok.ps1"), b"echo ok");
        let res = validate_script(dir.to_str().unwrap(), dir.join("ok.ps1").to_str().unwrap());
        assert!(
            res.is_ok(),
            "フォルダ配下の allowlist スクリプトは許可されるべき"
        );
        assert_eq!(res.unwrap().1, "ps1");
        let _ = fs::remove_dir_all(&dir);
    }
}
