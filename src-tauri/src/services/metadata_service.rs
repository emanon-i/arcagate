use std::fs;
use std::io::Read;
use std::path::Path;

use serde::Serialize;

use crate::db::DbState;
use crate::repositories::item_repository;
use crate::utils::error::AppError;

/// Library カードに表示するための item メタデータ。
///
/// item_type ごとに埋まるフィールドが異なる:
/// - folder: child_count + folder_total_bytes + modified_at_unix
/// - file/text: size_bytes + modified_at_unix
/// - url: url_domain
/// - 拡張子 png/jpg/jpeg/gif: image_width + image_height + image_format（追加）
///
/// `modified_at_unix` は UNIX_EPOCH からの秒数（外部 datetime crate に依存せず、
/// フロント側 Date で整形する）。
// `skip_serializing_if = "Option::is_none"` で None フィールドを JSON から除外。
// TypeScript 側 `ItemMetadata` (optional `?: T`) と整合し、test も `toBeUndefined()` を満たす。
// 旧仕様 (None → null 出力) は wire format mismatch で test 期待値とずれていた。
#[derive(Serialize, Default, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ItemMetadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified_at_unix: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub child_count: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub folder_total_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url_domain: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_width: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_height: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_format: Option<String>,
}

/// 複数 item_id の metadata を一括取得。LibraryCard 一覧表示で per-card IPC 並列を回避する用途。
///
/// - DB lookup は単一 Mutex lock (ids 件数 N に対して N 回の find_by_id だが lock 1 回)
/// - lock 解放後に filesystem stat を実行 (Mutex を握ったまま I/O しない)
/// - 該当 id が DB に無い場合はその id を結果に含めない (fail-soft)
/// - filesystem stat 失敗は空 ItemMetadata で埋める
pub fn get_items_metadata_batch(
    db: &DbState,
    ids: &[String],
) -> Result<Vec<(String, ItemMetadata)>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let mut found: Vec<(String, String, String)> = Vec::with_capacity(ids.len());
    for id in ids {
        match item_repository::find_by_id(&conn, id) {
            Ok(item) => {
                found.push((item.id, item.item_type.as_str().to_string(), item.target));
            }
            Err(AppError::NotFound(_)) => {
                // fail-soft: DB に無い id は結果から省く (caller が古い id を持つ可能性に備える)
            }
            Err(e) => {
                // それ以外の DB error (lock 失敗 / SQL error 等) は伝播させて隠蔽しない
                drop(conn);
                return Err(e);
            }
        }
    }
    drop(conn);

    let result = found
        .into_iter()
        .map(|(id, item_type, target)| (id, metadata_from_item_type(&item_type, &target)))
        .collect();
    Ok(result)
}

fn metadata_from_item_type(item_type: &str, target: &str) -> ItemMetadata {
    match item_type {
        "folder" => folder_metadata(target).unwrap_or_default(),
        "file" | "text" | "exe" | "script" => file_metadata(target).unwrap_or_default(),
        "url" => url_metadata(target),
        _ => ItemMetadata::default(),
    }
}

fn file_metadata(path_str: &str) -> Option<ItemMetadata> {
    let path = Path::new(path_str);
    let meta = fs::metadata(path).ok()?;
    if !meta.is_file() {
        return None;
    }
    let mut result = ItemMetadata {
        size_bytes: Some(meta.len()),
        modified_at_unix: meta.modified().ok().and_then(system_time_to_unix),
        ..Default::default()
    };

    // 画像ファイルなら寸法 + フォーマットを追加（外部依存なしのヘッダ直読み）
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        let ext_lower = ext.to_ascii_lowercase();
        if let Some((w, h, fmt)) = read_image_dimensions(path, &ext_lower) {
            result.image_width = Some(w);
            result.image_height = Some(h);
            result.image_format = Some(fmt.to_string());
        }
    }

    Some(result)
}

/// PNG / JPEG / GIF のヘッダから width/height を抽出。
///
/// 外部 crate を使わず、各フォーマットの仕様に従い必要バイトのみ読む。
/// 失敗時は None。
///
/// 実機計測 (2026-05-19、 SMR HDD 上の 117 exe): 非画像拡張子の判定より **前**に
/// `fs::File::open` でハンドルを開くと、 exe を含む全 file item でハンドル open が走り、
/// Windows Defender の real-time scan が exe 本体を SMR HDD から読み込んで cold で
/// 計 19.5 秒 (Library 遷移を丸ごと freeze)。 画像拡張子でない限り file を開かない。
fn read_image_dimensions(path: &Path, ext: &str) -> Option<(u32, u32, &'static str)> {
    if !matches!(ext, "png" | "jpg" | "jpeg" | "gif") {
        return None;
    }
    let mut file = fs::File::open(path).ok()?;
    match ext {
        "png" => {
            // PNG: 8 byte signature + IHDR chunk (type 'IHDR' から 8byte が width, height、各 BE u32)
            let mut buf = [0u8; 24];
            file.read_exact(&mut buf).ok()?;
            // signature 8 byte: 89 50 4E 47 0D 0A 1A 0A
            if &buf[0..8] != b"\x89PNG\r\n\x1a\n" {
                return None;
            }
            // 8 byte: chunk length, 12-15: chunk type 'IHDR', 16-19: width, 20-23: height
            if &buf[12..16] != b"IHDR" {
                return None;
            }
            let w = u32::from_be_bytes(buf[16..20].try_into().ok()?);
            let h = u32::from_be_bytes(buf[20..24].try_into().ok()?);
            Some((w, h, "PNG"))
        }
        "gif" => {
            // GIF: signature "GIF87a" or "GIF89a" + 7-8 byte width LE u16, 9-10 height LE u16
            let mut buf = [0u8; 10];
            file.read_exact(&mut buf).ok()?;
            if &buf[0..3] != b"GIF" {
                return None;
            }
            let w = u16::from_le_bytes(buf[6..8].try_into().ok()?) as u32;
            let h = u16::from_le_bytes(buf[8..10].try_into().ok()?) as u32;
            Some((w, h, "GIF"))
        }
        "jpg" | "jpeg" => read_jpeg_dimensions(&mut file),
        _ => None,
    }
}

/// JPEG SOF0/SOF2 marker から width/height を抽出。
fn read_jpeg_dimensions(file: &mut fs::File) -> Option<(u32, u32, &'static str)> {
    // 最大 64KB まで読む（最初の SOF marker までを想定）
    let mut buf = vec![0u8; 65536];
    let n = file.read(&mut buf).ok()?;
    let buf = &buf[..n];

    if buf.len() < 4 || buf[0] != 0xFF || buf[1] != 0xD8 {
        return None; // SOI not found
    }
    let mut i = 2;
    while i + 8 < buf.len() {
        if buf[i] != 0xFF {
            i += 1;
            continue;
        }
        let marker = buf[i + 1];
        // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
        if (0xC0..=0xC3).contains(&marker) {
            // segment length [i+2..i+4] BE, height [i+5..i+7] BE, width [i+7..i+9] BE
            let h = u16::from_be_bytes(buf[i + 5..i + 7].try_into().ok()?) as u32;
            let w = u16::from_be_bytes(buf[i + 7..i + 9].try_into().ok()?) as u32;
            return Some((w, h, "JPEG"));
        }
        // skip segment: length は marker の次の 2byte BE
        let seg_len = u16::from_be_bytes(buf[i + 2..i + 4].try_into().ok()?) as usize;
        i += 2 + seg_len;
    }
    None
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
        modified_at_unix: meta.modified().ok().and_then(system_time_to_unix),
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

fn system_time_to_unix(t: std::time::SystemTime) -> Option<u64> {
    use std::time::UNIX_EPOCH;
    t.duration_since(UNIX_EPOCH).ok().map(|d| d.as_secs())
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

    #[test]
    fn read_image_dimensions_png_minimal() {
        // 最小 PNG: 1x1 png signature + IHDR
        let png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x05\x00\x00\x00\x03";
        let tmp = std::env::temp_dir().join("__test_meta_dim.png");
        std::fs::write(&tmp, png).unwrap();
        let r = read_image_dimensions(&tmp, "png");
        std::fs::remove_file(&tmp).ok();
        assert_eq!(r, Some((5, 3, "PNG")));
    }

    #[test]
    fn read_image_dimensions_gif_minimal() {
        // GIF89a 8x4
        let mut gif = b"GIF89a".to_vec();
        gif.extend_from_slice(&8u16.to_le_bytes());
        gif.extend_from_slice(&4u16.to_le_bytes());
        let tmp = std::env::temp_dir().join("__test_meta_dim.gif");
        std::fs::write(&tmp, &gif).unwrap();
        let r = read_image_dimensions(&tmp, "gif");
        std::fs::remove_file(&tmp).ok();
        assert_eq!(r, Some((8, 4, "GIF")));
    }

    #[test]
    fn read_image_dimensions_unknown_ext() {
        let tmp = std::env::temp_dir().join("__test_meta_dim.txt");
        std::fs::write(&tmp, b"hello").unwrap();
        let r = read_image_dimensions(&tmp, "txt");
        std::fs::remove_file(&tmp).ok();
        assert_eq!(r, None);
    }

    #[test]
    fn read_image_dimensions_non_image_ext_skips_without_existing_file() {
        // 2026-05-19 perf 修正: 非画像拡張子は file を一切開かないため、
        // 実在しない exe path でも (open error 経由ではなく) 拡張子判定で即 None。
        let r = read_image_dimensions(Path::new("Z:/__no_such__.exe"), "exe");
        assert_eq!(r, None);
    }

    mod batch {
        use super::*;
        use crate::db::initialize_in_memory;
        use crate::models::item::{Item, ItemType};
        use crate::repositories::item_repository;

        fn make_url_item(id: &str, target: &str) -> Item {
            Item {
                id: id.to_string(),
                item_type: ItemType::Url,
                label: format!("label-{id}"),
                target: target.to_string(),
                args: None,
                working_dir: None,
                icon_path: None,
                icon_type: None,
                aliases: vec![],
                sort_order: 0,
                is_enabled: true,
                is_tracked: false,
                default_app: None,
                card_override_json: None,
                created_at: "2026-05-04T00:00:00Z".to_string(),
                updated_at: "2026-05-04T00:00:00Z".to_string(),
            }
        }

        #[test]
        fn empty_ids_returns_empty() {
            let db = initialize_in_memory();
            let result = get_items_metadata_batch(&db, &[]).unwrap();
            assert!(result.is_empty());
        }

        #[test]
        fn returns_metadata_for_existing_ids() {
            let db = initialize_in_memory();
            {
                let conn = db.0.lock().unwrap();
                item_repository::insert(&conn, &make_url_item("a", "https://example.com")).unwrap();
                item_repository::insert(&conn, &make_url_item("b", "https://www.foo.test/x"))
                    .unwrap();
            }
            let result = get_items_metadata_batch(&db, &["a".into(), "b".into()]).unwrap();
            assert_eq!(result.len(), 2);
            assert_eq!(result[0].0, "a");
            assert_eq!(result[0].1.url_domain.as_deref(), Some("example.com"));
            assert_eq!(result[1].0, "b");
            assert_eq!(result[1].1.url_domain.as_deref(), Some("foo.test"));
        }

        #[test]
        fn missing_ids_are_skipped_fail_soft() {
            let db = initialize_in_memory();
            {
                let conn = db.0.lock().unwrap();
                item_repository::insert(&conn, &make_url_item("a", "https://example.com")).unwrap();
            }
            let result =
                get_items_metadata_batch(&db, &["a".into(), "missing".into(), "ghost".into()])
                    .unwrap();
            assert_eq!(result.len(), 1);
            assert_eq!(result[0].0, "a");
        }

        #[test]
        fn duplicate_ids_each_yield_an_entry() {
            let db = initialize_in_memory();
            {
                let conn = db.0.lock().unwrap();
                item_repository::insert(&conn, &make_url_item("a", "https://example.com")).unwrap();
            }
            let result =
                get_items_metadata_batch(&db, &["a".into(), "a".into(), "a".into()]).unwrap();
            assert_eq!(result.len(), 3);
            for row in &result {
                assert_eq!(row.0, "a");
                assert_eq!(row.1.url_domain.as_deref(), Some("example.com"));
            }
        }
    }
}

/// V1 解消 (A3 PR-A): AppServices 集約パターン用の service struct。
/// 各 method は同 module の free function に delegate (scope 限定のため既存実装は維持)。
pub struct MetadataService {
    db: std::sync::Arc<crate::db::DbState>,
}

impl MetadataService {
    pub fn new(db: std::sync::Arc<crate::db::DbState>) -> Self {
        Self { db }
    }

    pub fn get_items_metadata_batch(
        &self,
        ids: &[String],
    ) -> Result<Vec<(String, ItemMetadata)>, AppError> {
        get_items_metadata_batch(&self.db, ids)
    }
}
