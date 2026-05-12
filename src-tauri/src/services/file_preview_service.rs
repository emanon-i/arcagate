// File preview service — テキストファイルのメタデータ + 中身 + Markdown YAML frontmatter parse (U-6)。
//
// spec: docs/l0_ideas/screens-and-flows.md Workspace §
//   「text ファイルをドラックアンドドロップで配置できてファイル名や文字数、サイズ、
//    更新作成時間などのメタデータがわかり、中身を見れる
//    (Markdown 形式なら YAML フロントマターも表示)」

use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

use serde::Serialize;

use crate::utils::error::AppError;

const MAX_PREVIEW_BYTES: u64 = 256 * 1024; // 256 KB cap (UI 表示 / load 時間 cap)

#[derive(Serialize, Default, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FilePreview {
    /// file name (basename)
    pub name: String,
    /// 拡張子 (lowercase)、無ければ空文字
    pub ext: String,
    /// file size in bytes
    pub size_bytes: u64,
    /// 内容文字数 (UTF-8 char count、 binary fallback で None)
    pub char_count: Option<u64>,
    /// 更新時刻 (UNIX epoch seconds、取得失敗時 None)
    pub modified_at_unix: Option<u64>,
    /// 作成時刻 (UNIX epoch seconds、取得失敗時 None)
    pub created_at_unix: Option<u64>,
    /// preview content (UTF-8、 MAX_PREVIEW_BYTES で truncate)、 binary は空
    pub content: String,
    /// content が truncate されたか
    pub truncated: bool,
    /// content が binary 判定で空にされたか (NULL byte 検出)
    pub is_binary: bool,
    /// Markdown YAML frontmatter (--- で囲まれた head) を raw 文字列で返す。 無ければ空
    pub frontmatter: String,
}

/// path のテキストファイルを読んで preview metadata + content を返す。
/// - 不在 / read failure → InvalidInput
/// - binary (NULL byte) → content 空 + is_binary=true
/// - >MAX_PREVIEW_BYTES → 先頭 MAX_PREVIEW_BYTES で truncate=true
/// - Markdown (.md / .markdown) で head が `---` から始まる場合 frontmatter 抽出
pub fn read_file_preview(path_str: &str) -> Result<FilePreview, AppError> {
    let path = Path::new(path_str);
    if !path.is_file() {
        return Err(AppError::InvalidInput(format!(
            "file not found or not a file: {}",
            path_str
        )));
    }
    let meta = fs::metadata(path).map_err(AppError::Io)?;
    let size_bytes = meta.len();
    let modified_at_unix = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs());
    let created_at_unix = meta
        .created()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs());

    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .map(|s| s.to_string())
        .unwrap_or_default();
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_default();

    // 読み取り上限まで読む (binary 判定 + char_count + truncate flag)
    let bytes_to_read = size_bytes.min(MAX_PREVIEW_BYTES);
    let raw = read_first_n_bytes(path, bytes_to_read)?;
    let truncated = size_bytes > MAX_PREVIEW_BYTES;
    let is_binary = raw.iter().take(8192).any(|&b| b == 0);
    let (content, char_count) = if is_binary {
        (String::new(), None)
    } else {
        let s = String::from_utf8_lossy(&raw).into_owned();
        let count = s.chars().count() as u64;
        (s, Some(count))
    };
    let frontmatter = if !is_binary && (ext == "md" || ext == "markdown") {
        extract_yaml_frontmatter(&content)
    } else {
        String::new()
    };
    // audit batch (2026-05-13) #2.3: frontmatter は別 section で表示するため content から除去 (二重表示防止)。
    let content = if !frontmatter.is_empty() {
        strip_frontmatter_block(&content)
    } else {
        content
    };

    Ok(FilePreview {
        name,
        ext,
        size_bytes,
        char_count,
        modified_at_unix,
        created_at_unix,
        content,
        truncated,
        is_binary,
        frontmatter,
    })
}

fn read_first_n_bytes(path: &Path, n: u64) -> Result<Vec<u8>, AppError> {
    use std::io::Read;
    let mut file = fs::File::open(path).map_err(AppError::Io)?;
    let mut buf = vec![0u8; n as usize];
    let read = file.read(&mut buf).map_err(AppError::Io)?;
    buf.truncate(read);
    Ok(buf)
}

/// audit batch (2026-05-13) #2.3: frontmatter ブロック (--- ... ---) を content から削除して
/// 後続 body のみ返す。 frontmatter 不在なら content をそのまま返す。
fn strip_frontmatter_block(content: &str) -> String {
    let after_open = if let Some(s) = content.strip_prefix("---\r\n") {
        s
    } else if let Some(s) = content.strip_prefix("---\n") {
        s
    } else {
        return content.to_string();
    };
    if let Some(end) = after_open.find("\n---") {
        // after_open[..end] = frontmatter body, 後ろは "\n---" + 改行 + body
        let rest = &after_open[end..]; // 先頭 = "\n---..."
                                       // "\n---\n" / "\n---\r\n" / "\n---" のいずれかの直後から body 開始
        if let Some(s) = rest.strip_prefix("\n---\r\n") {
            return s.to_string();
        }
        if let Some(s) = rest.strip_prefix("\n---\n") {
            return s.to_string();
        }
        if let Some(s) = rest.strip_prefix("\n---") {
            return s.trim_start_matches(['\r', '\n']).to_string();
        }
    }
    content.to_string()
}

/// Markdown frontmatter (--- ... ---) を抽出。 無ければ空文字。
fn extract_yaml_frontmatter(content: &str) -> String {
    // 先頭が "---\n" か "---\r\n" の場合のみ frontmatter とみなす
    let after_open = if let Some(s) = content.strip_prefix("---\r\n") {
        s
    } else if let Some(s) = content.strip_prefix("---\n") {
        s
    } else {
        return String::new();
    };
    // 次の "\n---\n" / "\n---\r\n" / EOF 直前 "---" を探す
    if let Some(end) = after_open.find("\n---") {
        after_open[..end].trim_end().to_string()
    } else {
        String::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn mk_temp_dir(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("arcagate-file-preview-{}", name));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write_file(path: &Path, content: &[u8]) {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        let mut f = fs::File::create(path).unwrap();
        f.write_all(content).unwrap();
    }

    #[test]
    fn reads_text_file() {
        let dir = mk_temp_dir("text");
        let p = dir.join("hello.txt");
        write_file(&p, b"hello world");
        let r = read_file_preview(p.to_str().unwrap()).unwrap();
        assert_eq!(r.name, "hello.txt");
        assert_eq!(r.ext, "txt");
        assert_eq!(r.size_bytes, 11);
        assert_eq!(r.char_count, Some(11));
        assert_eq!(r.content, "hello world");
        assert!(!r.truncated);
        assert!(!r.is_binary);
        assert_eq!(r.frontmatter, "");
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn detects_binary() {
        let dir = mk_temp_dir("bin");
        let p = dir.join("data.bin");
        write_file(&p, b"\x00\x01\x02\x03binary");
        let r = read_file_preview(p.to_str().unwrap()).unwrap();
        assert!(r.is_binary);
        assert_eq!(r.content, "");
        assert_eq!(r.char_count, None);
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn extracts_markdown_frontmatter() {
        let dir = mk_temp_dir("md");
        let p = dir.join("note.md");
        write_file(&p, b"---\ntitle: My Note\ntags: [a, b]\n---\n\n# Hello\n");
        let r = read_file_preview(p.to_str().unwrap()).unwrap();
        assert!(r.frontmatter.contains("title: My Note"));
        assert!(r.frontmatter.contains("tags: [a, b]"));
        // audit #2.3: content から frontmatter block が strip されている
        assert!(!r.content.contains("title: My Note"));
        assert!(r.content.contains("# Hello"));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn no_frontmatter_for_non_markdown() {
        let dir = mk_temp_dir("nofm");
        let p = dir.join("note.txt");
        write_file(&p, b"---\nnot really frontmatter\n---\n");
        let r = read_file_preview(p.to_str().unwrap()).unwrap();
        assert_eq!(r.frontmatter, "");
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn rejects_missing_file() {
        let result = read_file_preview("Z:/__never_exists__/x.txt");
        assert!(result.is_err());
    }

    #[test]
    fn truncates_large_file() {
        let dir = mk_temp_dir("large");
        let p = dir.join("big.txt");
        // 300 KB (超過分が truncate される)
        let content = "a".repeat(300 * 1024);
        write_file(&p, content.as_bytes());
        let r = read_file_preview(p.to_str().unwrap()).unwrap();
        assert!(r.truncated);
        assert_eq!(r.content.len(), MAX_PREVIEW_BYTES as usize);
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn extracts_frontmatter_crlf() {
        let dir = mk_temp_dir("crlf");
        let p = dir.join("note.md");
        write_file(&p, b"---\r\ntitle: CRLF\r\n---\r\nbody\r\n");
        let r = read_file_preview(p.to_str().unwrap()).unwrap();
        assert!(r.frontmatter.contains("title: CRLF"));
        fs::remove_dir_all(&dir).ok();
    }
}
