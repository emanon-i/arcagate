// Bookmark service — Netscape Bookmark File Format (HTML) parser (U-2)。
//
// spec: docs/l0_ideas/screens-and-flows.md Library §
//   「ブックマークのファイルを取り込んで一部選択または一括選択などでアイテムとして
//    取り込める（取り込み時にタグも付与できる）」
//
// 設計:
// - HTML parser は dependency 増加避けたい → 正規表現で `<A HREF="..." [...]>title</A>` を抽出
// - 階層 (DL > DT > A) は無視 (flat list)、 folder 名は抽出しない (UI 側 で tag 別途付与)
// - 重複 URL は dedupe (HashSet で 1 回目のみ採用)

use crate::utils::error::AppError;
use serde::Serialize;
use std::collections::HashSet;
use std::fs;

#[derive(Serialize, Debug, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ParsedBookmark {
    pub url: String,
    pub title: String,
}

/// `bookmark.html` (Netscape Bookmark Format) を parse して URL リストを返す。
/// - HTTP(S) 以外は除外
/// - 同 URL 重複は最初の 1 件のみ
/// - title は HTML entity decode 済
pub fn parse_bookmark_file(path: &str) -> Result<Vec<ParsedBookmark>, AppError> {
    let content = fs::read_to_string(path)
        .map_err(|e| AppError::InvalidInput(format!("failed to read bookmark file: {}", e)))?;
    Ok(parse_bookmark_content(&content))
}

/// テスト用に分離した content parser。
pub fn parse_bookmark_content(content: &str) -> Vec<ParsedBookmark> {
    let mut out: Vec<ParsedBookmark> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();
    let lower = content.to_ascii_lowercase();
    let mut search_pos = 0;
    while let Some(rel_a) = lower[search_pos..].find("<a ") {
        let a_start = search_pos + rel_a;
        // <A 〜 > の末尾を探す
        let after_open = match lower[a_start..].find('>') {
            Some(i) => a_start + i + 1,
            None => break,
        };
        // <A 〜 > の中から HREF="..." (or HREF='...') を抽出
        let attrs = &lower[a_start..after_open];
        let href = match find_href(attrs) {
            Some(h) => {
                let original = &content[a_start..after_open];
                find_href_original(attrs, original, &h)
            }
            None => {
                search_pos = after_open;
                continue;
            }
        };
        // </A> までを title として抽出
        let end_a = match lower[after_open..].find("</a>") {
            Some(i) => after_open + i,
            None => break,
        };
        let title_raw = content[after_open..end_a].trim();
        search_pos = end_a + 4; // skip </A>

        if !(href.starts_with("http://") || href.starts_with("https://")) {
            continue;
        }
        if seen.contains(&href) {
            continue;
        }
        let title = if title_raw.is_empty() {
            href.clone()
        } else {
            decode_html_entities(title_raw)
        };
        seen.insert(href.clone());
        out.push(ParsedBookmark { url: href, title });
    }
    out
}

fn find_href(attrs_lower: &str) -> Option<String> {
    // case-insensitive 検索だが、 attrs_lower は既に lower、 caller は original を別途渡す
    // ここでは「lower 上で href=" or ' の位置」 を返すだけ
    let pos = attrs_lower.find("href=")?;
    let after_eq = &attrs_lower[pos + 5..];
    let quote = after_eq.chars().next()?;
    if quote != '"' && quote != '\'' {
        return None;
    }
    let end = after_eq[1..].find(quote)?;
    Some(after_eq[1..1 + end].to_string())
}

/// `attrs_lower` で見つけた href 位置を `attrs_original` から取り出す (大文字小文字保持)。
fn find_href_original(attrs_lower: &str, attrs_original: &str, _href_lower: &str) -> String {
    if let Some(pos) = attrs_lower.find("href=") {
        let after_eq = &attrs_original[pos + 5..];
        if let Some(quote) = after_eq.chars().next() {
            if quote == '"' || quote == '\'' {
                if let Some(end) = after_eq[1..].find(quote) {
                    return decode_html_entities(after_eq[1..1 + end].trim());
                }
            }
        }
    }
    String::new()
}

fn decode_html_entities(s: &str) -> String {
    s.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_simple_bookmark() {
        let content = r#"
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
<DT><A HREF="https://example.com/" ADD_DATE="123">Example</A>
<DT><A HREF="https://rust-lang.org/" ADD_DATE="456">Rust</A>
</DL>
"#;
        let r = parse_bookmark_content(content);
        assert_eq!(r.len(), 2);
        assert_eq!(r[0].url, "https://example.com/");
        assert_eq!(r[0].title, "Example");
        assert_eq!(r[1].url, "https://rust-lang.org/");
        assert_eq!(r[1].title, "Rust");
    }

    #[test]
    fn parse_skips_non_http_schemes() {
        let content = r#"
<DT><A HREF="javascript:void(0)">JS</A>
<DT><A HREF="mailto:x@y.com">Mail</A>
<DT><A HREF="https://ok.com">OK</A>
"#;
        let r = parse_bookmark_content(content);
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].url, "https://ok.com");
    }

    #[test]
    fn parse_dedupes_same_url() {
        let content = r#"
<DT><A HREF="https://dup.com/">First</A>
<DT><A HREF="https://dup.com/">Second</A>
"#;
        let r = parse_bookmark_content(content);
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].title, "First");
    }

    #[test]
    fn parse_decodes_entities() {
        let content = r#"<A HREF="https://a.com/?q=1&amp;b=2">A &amp; B</A>"#;
        let r = parse_bookmark_content(content);
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].url, "https://a.com/?q=1&b=2");
        assert_eq!(r[0].title, "A & B");
    }

    #[test]
    fn parse_handles_single_quote_href() {
        let content = r#"<A HREF='https://q.com'>Q</A>"#;
        let r = parse_bookmark_content(content);
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].url, "https://q.com");
    }

    #[test]
    fn parse_uses_url_when_title_empty() {
        let content = r#"<A HREF="https://no-title.com"></A>"#;
        let r = parse_bookmark_content(content);
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].title, "https://no-title.com");
    }

    #[test]
    fn parse_empty_returns_empty() {
        assert!(parse_bookmark_content("").is_empty());
        assert!(parse_bookmark_content("<html></html>").is_empty());
    }

    #[test]
    fn parse_handles_mixed_case() {
        let content = r#"<a HreF="https://m.com">M</a>"#;
        let r = parse_bookmark_content(content);
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].url, "https://m.com");
    }
}
