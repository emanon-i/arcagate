pub mod migrations;

use rusqlite::Connection;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use self::migrations::{apply_pragmas, migrations};

#[allow(dead_code)]
pub struct DbState(pub Mutex<Connection>);

/// DB 初期化の結果を呼び出し側 (lib.rs setup) に伝えるための補助情報。
/// PH-PQ-100 T3: 破損時の自己修復が起きた場合、 user 通知 dialog を出すため
/// `recovered_from_corruption = Some(backup_path)` を返す。
pub struct InitOutcome {
    pub state: DbState,
    /// `Some(backup_path)` のとき、 既存 DB が破損していたため backup に退避して
    /// 新規 DB で再起動した状態 (T3 自己修復経路)。
    pub recovered_from_corruption: Option<PathBuf>,
}

/// 通常の `initialize` (テスト・後方互換)。 production 経路は `initialize_with_recovery`
/// を使うこと。
pub fn initialize(db_path: &str) -> Result<DbState, Box<dyn std::error::Error>> {
    let mut conn = Connection::open(db_path)?;
    apply_pragmas(&conn)?;
    migrations().to_latest(&mut conn)?;
    Ok(DbState(Mutex::new(conn)))
}

/// PH-PQ-100 T3: 2 段オープン + integrity_check による DB 破損 self-recovery。
///
/// 手順:
/// 1. `Connection::open(path)` を試行
/// 2. open 成功時は `PRAGMA integrity_check` を実行。 `ok` 以外なら破損扱い。
/// 3. open 失敗 or integrity NG の場合:
///    - 既存 file を `<path>.corrupted-<unix_ts>` に rename (WAL/SHM も)
///    - 新規 DB を作って migration を再走
///    - `recovered_from_corruption = Some(backup_path)` を返す
///    - 呼び出し側 (lib.rs) は user 通知 dialog を表示する
///
/// 既存 file が無い (新規 install) 場合は recovery 扱いにしない。
pub fn initialize_with_recovery(db_path: &str) -> Result<InitOutcome, Box<dyn std::error::Error>> {
    let path = Path::new(db_path);
    let file_existed = path.exists();

    // Step 1: 通常 open + integrity_check
    let mut needs_recovery_reason: Option<String> = None;

    if file_existed {
        match Connection::open(path) {
            Ok(conn) => {
                if let Err(e) = apply_pragmas(&conn) {
                    needs_recovery_reason = Some(format!("apply_pragmas failed: {}", e));
                } else if let Err(e) = check_integrity(&conn) {
                    needs_recovery_reason = Some(e);
                }
                drop(conn);
            }
            Err(e) => {
                needs_recovery_reason = Some(format!("open failed: {}", e));
            }
        }
    }

    if let Some(reason) = needs_recovery_reason {
        let backup = backup_corrupted_db(path, &reason)?;
        log::error!(
            "DB corruption detected ({}), moved to backup={:?}, starting with fresh DB",
            reason,
            backup
        );
        let state = fresh_initialize(db_path)?;
        return Ok(InitOutcome {
            state,
            recovered_from_corruption: Some(backup),
        });
    }

    // Step 2: 健全 (または file 不在 = 新規)
    let mut conn = Connection::open(path)?;
    apply_pragmas(&conn)?;
    // migration apply はここで再走。 失敗時は破損扱いで recovery。
    if let Err(e) = migrations().to_latest(&mut conn) {
        let reason = format!("migration failed: {}", e);
        drop(conn);
        let backup = backup_corrupted_db(path, &reason)?;
        log::error!(
            "migration apply failed ({}), backup={:?}, recovering",
            reason,
            backup
        );
        let state = fresh_initialize(db_path)?;
        return Ok(InitOutcome {
            state,
            recovered_from_corruption: Some(backup),
        });
    }

    Ok(InitOutcome {
        state: DbState(Mutex::new(conn)),
        recovered_from_corruption: None,
    })
}

fn check_integrity(conn: &Connection) -> Result<(), String> {
    let result: Result<String, _> = conn.query_row("PRAGMA integrity_check", [], |row| row.get(0));
    match result {
        Ok(s) if s == "ok" => Ok(()),
        Ok(other) => Err(format!("integrity_check returned '{}'", other)),
        Err(e) => Err(format!("integrity_check query failed: {}", e)),
    }
}

fn unix_ts() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn backup_corrupted_db(path: &Path, reason: &str) -> Result<PathBuf, std::io::Error> {
    let ts = unix_ts();
    let backup_name = format!(
        "{}.corrupted-{}",
        path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("arcagate.db"),
        ts
    );
    let backup_path = path
        .parent()
        .map(|p| p.join(&backup_name))
        .unwrap_or_else(|| PathBuf::from(&backup_name));

    if path.exists() {
        std::fs::rename(path, &backup_path)?;
    }
    // WAL / SHM も併せて退避 (rusqlite が古い state を再利用しないように)
    let exts = ["-wal", "-shm"];
    for ext in &exts {
        let sidecar = path.with_file_name(format!(
            "{}{}",
            path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("arcagate.db"),
            ext
        ));
        if sidecar.exists() {
            let target = backup_path.with_file_name(format!("{}{}", backup_name, ext));
            let _ = std::fs::rename(&sidecar, &target);
        }
    }
    log::warn!(
        "DB backed up due to corruption (reason='{}'): {:?}",
        reason,
        backup_path
    );
    Ok(backup_path)
}

fn fresh_initialize(db_path: &str) -> Result<DbState, Box<dyn std::error::Error>> {
    let mut conn = Connection::open(db_path)?;
    apply_pragmas(&conn)?;
    migrations().to_latest(&mut conn)?;
    Ok(DbState(Mutex::new(conn)))
}

#[cfg(test)]
pub fn initialize_in_memory() -> DbState {
    #[allow(clippy::expect_used)]
    let mut conn = Connection::open_in_memory().expect("in-memory conn");
    apply_pragmas(&conn).expect("apply_pragmas");
    migrations().to_latest(&mut conn).expect("migrations");
    DbState(Mutex::new(conn))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn temp_dir(suffix: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("arcagate-db-recovery-{}", suffix));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("temp dir create");
        dir
    }

    #[test]
    fn fresh_install_no_recovery() {
        let dir = temp_dir("fresh");
        let db_path = dir.join("arcagate.db");
        let outcome = initialize_with_recovery(db_path.to_str().unwrap()).unwrap();
        assert!(outcome.recovered_from_corruption.is_none());
        drop(outcome);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn healthy_db_no_recovery_on_second_open() {
        let dir = temp_dir("healthy");
        let db_path = dir.join("arcagate.db");
        // 1st open: 健全 DB を作成
        {
            let outcome = initialize_with_recovery(db_path.to_str().unwrap()).unwrap();
            assert!(outcome.recovered_from_corruption.is_none());
        }
        // 2nd open: 既存 DB を再 open しても recovery しないこと
        let outcome = initialize_with_recovery(db_path.to_str().unwrap()).unwrap();
        assert!(outcome.recovered_from_corruption.is_none());
        drop(outcome);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn zero_byte_db_opens_cleanly() {
        // T3 受入 (fixture 1): 0 byte file。 SQLite は 0 byte file を「空の有効な DB」
        // として扱うため backup までは不要 — migration を fresh に適用し panic せず起動できる
        // ことを pin (graceful degradation: データ損失なし、 そのまま使用可能)。
        let dir = temp_dir("zero");
        let db_path = dir.join("arcagate.db");
        std::fs::File::create(&db_path).unwrap();
        let outcome = initialize_with_recovery(db_path.to_str().unwrap()).unwrap();
        // DB が usable であること (query 可能) を確認
        {
            let conn = outcome.state.0.lock().unwrap();
            let n: i64 = conn
                .query_row("SELECT count(*) FROM sqlite_master", [], |row| row.get(0))
                .unwrap();
            assert!(n > 0, "migration applied to zero-byte DB");
        }
        drop(outcome);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn invalid_header_db_recovers() {
        // T3 受入 (fixture 2): 不正 SQLite header → backup 退避 + 新規 DB 再走
        let dir = temp_dir("invalid");
        let db_path = dir.join("arcagate.db");
        let mut f = std::fs::File::create(&db_path).unwrap();
        f.write_all(b"NOT a SQLite database file, just garbage data padding to >100 bytes XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX").unwrap();
        drop(f);
        let outcome = initialize_with_recovery(db_path.to_str().unwrap()).unwrap();
        let backup = outcome.recovered_from_corruption.clone();
        drop(outcome); // open connection を閉じてから dir 掃除
        assert!(backup.is_some(), "invalid header DB should be recovered");
        assert!(backup.unwrap().exists(), "corrupted file backed up");
        assert!(db_path.exists(), "fresh DB created at original path");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn truncated_db_recovers() {
        // T3 受入 (fixture 3): 健全 DB を作成 → header だけ残して truncate
        // (WAL 不整合 / 物理破損 相当) → recovery
        let dir = temp_dir("truncated");
        let db_path = dir.join("arcagate.db");
        {
            // 健全 DB を作る
            let outcome = initialize_with_recovery(db_path.to_str().unwrap()).unwrap();
            // checkpoint して WAL を flush
            {
                let conn = outcome.state.0.lock().unwrap();
                let _: rusqlite::Result<i64> =
                    conn.query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |row| row.get(2));
            }
            drop(outcome);
        }
        // file の中間を破損させる (16 bytes → header すら不完全)
        let bytes = std::fs::read(&db_path).unwrap();
        let truncated = &bytes[..16.min(bytes.len())];
        std::fs::write(&db_path, truncated).unwrap();

        let outcome = initialize_with_recovery(db_path.to_str().unwrap()).unwrap();
        let recovered = outcome.recovered_from_corruption.is_some();
        drop(outcome);
        assert!(recovered, "truncated DB should be recovered");
        let _ = std::fs::remove_dir_all(&dir);
    }
}
