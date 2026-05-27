//! DB self-recovery 通知の永続化窓口。
//!
//! 動機: 旧実装は `initialize_with_recovery` が DB を `<path>.corrupted-<ts>` に
//! 退避した直後に native dialog を `blocking_show` するだけだった。 dialog は
//! 一度閉じると消えるため、 user が path を控えそびれた / dialog 自体に気づかなかった
//! ケースで「気づいたらデータが消えていた」 になり得た (実例あり 2026-05-27)。
//!
//! 本 module は app data dir に marker file (`db-recovery-notice.json`) を
//! 書き出し、 frontend が ack するまで起動毎に banner で再表示できるようにする。
//! marker は ack で物理削除する (= 確認済み flag を立てる代わりに file ごと消す)。

use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// marker file 名 (app_data_dir 直下に配置)。
pub const MARKER_FILE: &str = "db-recovery-notice.json";

/// frontend に返す通知 payload。 `backup_path` は隔離先 absolute path、
/// `recovered_at_unix` は recovery が起きた時刻 (UNIX 秒)。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DbRecoveryNotice {
    pub backup_path: String,
    pub recovered_at_unix: u64,
}

fn marker_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(MARKER_FILE)
}

fn unix_ts_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// recovery が起きたことを marker file に記録する。 既存 marker は上書きする
/// (連続復旧時は最新の backup_path を残す)。
pub fn write_marker(app_data_dir: &Path, backup_path: &Path) -> io::Result<()> {
    let notice = DbRecoveryNotice {
        backup_path: backup_path.to_string_lossy().into_owned(),
        recovered_at_unix: unix_ts_now(),
    };
    let json = serde_json::to_string_pretty(&notice).map_err(io::Error::other)?;
    fs::create_dir_all(app_data_dir)?;
    fs::write(marker_path(app_data_dir), json)
}

/// marker file を読み出す。 file 不在 / parse 失敗時は `None`。
pub fn read_marker(app_data_dir: &Path) -> Option<DbRecoveryNotice> {
    let path = marker_path(app_data_dir);
    let bytes = fs::read(&path).ok()?;
    serde_json::from_slice(&bytes).ok()
}

/// marker file を削除する。 file 不在は成功扱い (idempotent ack)。
pub fn clear_marker(app_data_dir: &Path) -> io::Result<()> {
    let path = marker_path(app_data_dir);
    match fs::remove_file(&path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(suffix: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("arcagate-db-recovery-notice-{}", suffix));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("temp dir create");
        dir
    }

    #[test]
    fn write_then_read_round_trips() {
        let dir = temp_dir("roundtrip");
        let backup = dir.join("arcagate.db.corrupted-1234");
        write_marker(&dir, &backup).unwrap();
        let got = read_marker(&dir).expect("marker present");
        assert_eq!(got.backup_path, backup.to_string_lossy());
        assert!(got.recovered_at_unix > 0);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn read_missing_returns_none() {
        let dir = temp_dir("missing");
        assert!(read_marker(&dir).is_none());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn clear_marker_is_idempotent() {
        let dir = temp_dir("clear-idempotent");
        // 不在状態で clear → Ok
        clear_marker(&dir).unwrap();
        // 書き込み → clear → 再 read で None
        write_marker(&dir, Path::new("X")).unwrap();
        assert!(read_marker(&dir).is_some());
        clear_marker(&dir).unwrap();
        assert!(read_marker(&dir).is_none());
        // 二度目 clear も Ok
        clear_marker(&dir).unwrap();
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn invalid_json_treated_as_absent() {
        let dir = temp_dir("invalid");
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join(MARKER_FILE), b"not json at all").unwrap();
        assert!(read_marker(&dir).is_none());
        let _ = fs::remove_dir_all(&dir);
    }
}
