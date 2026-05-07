use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct GitStatus {
    pub branch: String,
    pub has_changes: bool,
    pub changed_count: usize,
}

/// Phase L-1 (2026-05-07 user 検収 Library 真因 #1): git_status batch IPC の戻り値。
/// 入力 paths と同じ順序で返す。`status: None` は git repo でない / エラーで silent skip。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatusBatchEntry {
    pub path: String,
    pub status: Option<GitStatus>,
}
