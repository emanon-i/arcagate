use std::fs;
use std::path::Path;

use serde::Serialize;

use crate::db::DbState;
use crate::repositories::item_repository;
use crate::utils::error::AppError;

/// Library カードに表示するための item メタデータ。
///
/// item_type ごとに埋まるフィールドが異なる:
/// - folder: child_count + folder_total_bytes + modified_at
/// - file/text: size_bytes + modified_at
/// - url: url_domain
/// - 未対応: image / video / music / exe（後続バッチで追加）
#[derive(Serialize, Default, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ItemMetadata {
    pub size_bytes: Option<u64>,
    pub modified_at: Option<String>,
    pub child_count: Option<u32>,
    pub folder_total_bytes: Option<u64>,
    pub url_domain: Option<String>,
}

/// item_id から該当 item の type に応じたメタデータを取得。
///
/// 失敗時（パス不在など）は AppError ではなく **空 ItemMetadata** を返す。
/// メタデータ表示は best-effort であり、エラーで UI を崩さないため。
pub fn get_item_metadata(db: &DbState, item_id: &str) -> Result<ItemMetadata, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let item = item_repository::find_by_id(&conn, item_id)?;
    drop(conn);

    Ok(match item.item_type.as_str() {
        "folder" => folder_metadata(&item.target).unwrap_or_default(),
        "file" | "text" | "exe" | "script" => file_metadata(&item.target).unwrap_or_default(),
        "url" => url_metadata(&item.target),
        _ => ItemMetadata::default(),
    })
}

fn file_metadata(path_str: &str) -> Option<ItemMetadata> {
    let path = Path::new(path_str);
    let meta = fs::metadata(path).ok()?;
    if !meta.is_file() {
        return None;
    }
    Some(ItemMetadata {
        size_bytes: Some(meta.len()),
        modified_at: meta.modified().ok().and_then(format_system_time),
        ..Default::default()
    })
}

fn folder_metadata(path_str: &str) -> Option<ItemMetadata> {
    let path = Path::new(path_str);
    let meta = fs::metadata(path).ok()?;
    if !meta.is_dir() {
        return None;
    }

    // 直下のエントリ数だけカウント、再帰しない（パフォーマンス優先）
    let mut child_count: u32 = 0;
    let mut total_bytes: u64 = 0;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            child_count = child_count.saturating_add(1);
            if let Ok(m) = entry.metadata() {
                total_bytes = total_bytes.saturating_add(m.len());
            }
        }
    }

    Some(ItemMetadata {
        modified_at: meta.modified().ok().and_then(format_system_time),
        child_count: Some(child_count),
        folder_total_bytes: Some(total_bytes),
        ..Default::default()
    })
}

fn url_metadata(target: &str) -> ItemMetadata {
    // 軽量な host 抽出: scheme://host/... の host 部分のみ取り出す
    let after_scheme = target.split_once("://").map_or(target, |(_, rest)| rest);
    let domain = after_scheme
        .split('/')
        .next()
        .unwrap_or(after_scheme)
        .split('?')
        .next()
        .unwrap_or(after_scheme)
        .trim_start_matches("www.");
    let domain = if domain.is_empty() {
        None
    } else {
        Some(domain.to_string())
    };
    ItemMetadata {
        url_domain: domain,
        ..Default::default()
    }
}

fn format_system_time(t: std::time::SystemTime) -> Option<String> {
    use std::time::UNIX_EPOCH;
    let dur = t.duration_since(UNIX_EPOCH).ok()?;
    let secs = dur.as_secs();
    Some(format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        1970 + (secs / 31_557_600),
        ((secs % 31_557_600) / 2_629_800) + 1,
        ((secs % 2_629_800) / 86_400) + 1,
        (secs % 86_400) / 3_600,
        (secs % 3_600) / 60,
        secs % 60,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn url_metadata_extracts_domain_with_scheme() {
        let m = url_metadata("https://example.com/path?q=1");
        assert_eq!(m.url_domain, Some("example.com".to_string()));
    }

    #[test]
    fn url_metadata_strips_www_prefix() {
        let m = url_metadata("https://www.example.com/x");
        assert_eq!(m.url_domain, Some("example.com".to_string()));
    }

    #[test]
    fn url_metadata_no_scheme() {
        let m = url_metadata("example.com/path");
        assert_eq!(m.url_domain, Some("example.com".to_string()));
    }

    #[test]
    fn url_metadata_empty_returns_none() {
        let m = url_metadata("");
        assert_eq!(m.url_domain, None);
    }

    #[test]
    fn file_metadata_nonexistent_returns_none() {
        assert!(file_metadata("Z:/__no_such_file_for_test__.bin").is_none());
    }

    #[test]
    fn folder_metadata_nonexistent_returns_none() {
        assert!(folder_metadata("Z:/__no_such_folder_for_test__").is_none());
    }

    #[test]
    fn file_metadata_self_file_works() {
        // この test ファイル自身を target に使う
        let m = file_metadata(file!()).expect("test file should exist");
        assert!(m.size_bytes.unwrap_or(0) > 0);
    }
}
