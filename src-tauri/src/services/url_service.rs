// URL service — Web ページの title 取得 (U-1: spec docs/l0_ideas/screens-and-flows.md Library §)。
//
// 設計:
// - http_client::get_text で blocking GET (5s timeout)、HTML body を返す
// - `<title>...</title>` を case-insensitive regex で抽出 (HTML parser は dependency 増加避けたい)
// - 失敗 / title 無し → host のみ返す (best-effort、 URL 登録は止めない)

use crate::utils::error::AppError;
use crate::utils::http_client;
use std::time::Duration;

const FETCH_TIMEOUT: Duration = Duration::from_secs(5);
const MAX_BODY_SCAN: usize = 64 * 1024; // 64KB until first <title>

/// URL のページ title を best-effort で取得。
/// - HTTP 失敗 / status 非 2xx → host を fallback
/// - body が `<title>` を含まない → host を fallback
/// - body が `<title></title>` (空) → host を fallback
/// - 取れた title が 200 char 超 → 先頭 200 文字に truncate (UI 安全)
pub fn fetch_url_title(url: &str) -> Result<String, AppError> {
    if !is_valid_url(url) {
        return Err(AppError::InvalidInput(format!("invalid URL: {}", url)));
    }
    let host = extract_host(url).unwrap_or_else(|| url.to_string());
    match http_client::get_text(url, FETCH_TIMEOUT) {
        Ok(body) => Ok(extract_title(&body)
            .filter(|t| !t.is_empty())
            .map(|t| truncate_chars(&t, 200))
            .unwrap_or(host)),
        Err(_) => Ok(host),
    }
}

fn is_valid_url(url: &str) -> bool {
    url.starts_with("http://") || url.starts_with("https://")
}

fn extract_host(url: &str) -> Option<String> {
    let after_scheme = url.split_once("://").map(|(_, rest)| rest)?;
    let host = after_scheme
        .split('/')
        .next()?
        .split('?')
        .next()?
        .trim_start_matches("www.");
    if host.is_empty() {
        None
    } else {
        Some(host.to_string())
    }
}

/// HTML body から `<title>...</title>` (case-insensitive) を抽出。
fn extract_title(body: &str) -> Option<String> {
    let scan = if body.len() > MAX_BODY_SCAN {
        &body[..MAX_BODY_SCAN]
    } else {
        body
    };
    let lower = scan.to_ascii_lowercase();
    let start_tag = lower.find("<title")?;
    // <title> or <title attr=...>
    let after_open = scan[start_tag..].find('>').map(|i| start_tag + i + 1)?;
    let end_tag = lower[after_open..].find("</title>")?;
    let title_raw = &scan[after_open..after_open + end_tag];
    let trimmed = title_raw.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(decode_html_entities(trimmed))
    }
}

/// 簡易 HTML entity decode (最小限 — &amp; / &lt; / &gt; / &quot; / &#39; / &nbsp; のみ)。
fn decode_html_entities(s: &str) -> String {
    s.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
}

fn truncate_chars(s: &str, max_chars: usize) -> String {
    let mut out = String::new();
    for (i, c) in s.chars().enumerate() {
        if i >= max_chars {
            break;
        }
        out.push(c);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_title_basic() {
        let body = "<html><head><title>Example Page</title></head></html>";
        assert_eq!(extract_title(body), Some("Example Page".to_string()));
    }

    #[test]
    fn extract_title_case_insensitive() {
        let body = "<HTML><HEAD><TITLE>Caps</TITLE></HEAD></HTML>";
        assert_eq!(extract_title(body), Some("Caps".to_string()));
    }

    #[test]
    fn extract_title_with_attrs() {
        let body = r#"<title dir="ltr">attr title</title>"#;
        assert_eq!(extract_title(body), Some("attr title".to_string()));
    }

    #[test]
    fn extract_title_decodes_entities() {
        let body = "<title>A &amp; B &lt;C&gt;</title>";
        assert_eq!(extract_title(body), Some("A & B <C>".to_string()));
    }

    #[test]
    fn extract_title_trims_whitespace() {
        let body = "<title>   spaced   </title>";
        assert_eq!(extract_title(body), Some("spaced".to_string()));
    }

    #[test]
    fn extract_title_empty_returns_none() {
        let body = "<title></title>";
        assert_eq!(extract_title(body), None);
    }

    #[test]
    fn extract_title_missing_returns_none() {
        let body = "<html><body>no title</body></html>";
        assert_eq!(extract_title(body), None);
    }

    #[test]
    fn extract_host_with_scheme() {
        assert_eq!(
            extract_host("https://example.com/path?q=1"),
            Some("example.com".to_string())
        );
    }

    #[test]
    fn extract_host_strips_www() {
        assert_eq!(
            extract_host("https://www.example.com/x"),
            Some("example.com".to_string())
        );
    }

    #[test]
    fn is_valid_url_check() {
        assert!(is_valid_url("https://x.com"));
        assert!(is_valid_url("http://x.com"));
        assert!(!is_valid_url("ftp://x.com"));
        assert!(!is_valid_url("not a url"));
    }

    #[test]
    fn truncate_chars_basic() {
        assert_eq!(truncate_chars("hello", 3), "hel");
        assert_eq!(truncate_chars("hi", 10), "hi");
    }

    #[test]
    fn truncate_chars_multibyte() {
        // 日本語 mixed: char 単位で切れる (byte 切れではない)
        assert_eq!(truncate_chars("日本語abc", 4), "日本語a");
    }

    #[test]
    fn fetch_url_title_invalid_url_returns_err() {
        let result = fetch_url_title("not a url");
        assert!(result.is_err());
    }
}
