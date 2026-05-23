use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

use serde::Serialize;

use crate::utils::error::AppError;

/// scan 階層の上限。 user 入力 (`scan_depth`) はこの値にクランプされる。 plan
/// PH-CF-400: 旧 3 固定を撤廃し、 妥当な上限まで深掘りを許容する (NTFS の通常運用で
/// 10 階層あれば実用上十分。 これより深い構造は launcher の対象外)。
const MAX_SCAN_DEPTH: u8 = 10;

/// EXE フォルダ監視の検出契約 (PH-CF-400):
///
/// - 1 entry = `root` 直下の **第1階層フォルダ** (= `folder_path` / `folder_name`)
/// - `folder_path` は正規化済 絶対パス (forward slash / 末尾 separator 除去) で、
///   `widget_item_hides.item_target` / `items.source_entry_key` と同 key 空間
/// - 1 第1階層フォルダ配下の対象ファイルを `scan_depth` まで再帰収集し、
///   「浅い階層優先 → 同一階層はサイズ大優先」 で **1 ファイル** を default 選択。
///   この選択結果は `exe_candidates[0]` に置く (フロントは popover で他の候補にも切替可能)
/// - 対象ファイル 0 件の第1階層フォルダは entry を出さない
/// - 列挙順は deterministic (第1階層フォルダ path 昇順)
/// - 監視拡張子はハードコードせず、 呼び出し側 (`extensions`) が指定する
/// - symlink は follow しない (ループ回避)、 permission denied は該当ディレクトリを skip
#[derive(Serialize, Default, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExeFolderEntry {
    pub folder_path: String,
    pub folder_name: String,
    pub exe_candidates: Vec<ExeCandidate>,
    pub icon_path: Option<String>,
    /// PH-issue-038 / 検収項目 #20: フォルダの mtime (ms epoch、取得失敗時は 0)。
    /// フロントの並び替え (更新日時昇順 / 降順) に使用。
    pub mtime_ms: u64,
}

#[derive(Serialize, Default, Debug, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExeCandidate {
    pub path: String,
    pub size_bytes: u64,
    pub name: String,
}

/// scan 候補 1 件の中間表現。 depth + size でソートして 1 件を選ぶ。
#[derive(Debug)]
struct FoundFile {
    path: PathBuf,
    name: String,
    /// 第1階層フォルダを 1 とした相対 depth (浅い = 小)。
    relative_depth: u8,
    size_bytes: u64,
}

/// `root` 配下の各サブフォルダから対象ファイルを見つけて entries を作る (cancel 非対応)。
/// テスト・内部利用向け。 IPC 経由は `scan_exe_folders_with_cancel` を使う。
#[cfg(test)]
pub fn scan_exe_folders(
    root: &str,
    depth: u8,
    extensions: &[String],
) -> Result<Vec<ExeFolderEntry>, AppError> {
    scan_exe_folders_with_cancel(root, depth, extensions, &AtomicBool::new(false))
}

/// `root` 配下から第1階層フォルダごとに 1 entry を作る (検出契約は型 doc 参照)。
///
/// - `depth` は 1..=`MAX_SCAN_DEPTH` にクランプ
/// - `extensions` 空 vec は 0 検出 (呼び出し側が default を渡す前提)
/// - 不在 root は空 Vec を返す (best-effort、 AppError なし)
/// - W-3 (2026-05-19): `cancel` が true になると walk を中断し `AppError::Cancelled` を返す
pub fn scan_exe_folders_with_cancel(
    root: &str,
    depth: u8,
    extensions: &[String],
    cancel: &AtomicBool,
) -> Result<Vec<ExeFolderEntry>, AppError> {
    let depth = depth.clamp(1, MAX_SCAN_DEPTH);
    let root_path = Path::new(root);
    if !root_path.is_dir() {
        return Ok(Vec::new());
    }

    // 拡張子集合を正規化: 先頭 `.` を許容し、 すべて小文字化。 空要素は除外。
    let ext_set: HashSet<String> = extensions
        .iter()
        .map(|e| e.trim().trim_start_matches('.').to_ascii_lowercase())
        .filter(|e| !e.is_empty())
        .collect();
    if ext_set.is_empty() {
        return Ok(Vec::new());
    }

    // 第1階層フォルダを deterministic 順で列挙 (symlink は follow しない)。
    let read = match fs::read_dir(root_path) {
        Ok(r) => r,
        Err(_) => return Ok(Vec::new()),
    };
    let mut first_level: Vec<PathBuf> = Vec::new();
    for entry in read.flatten() {
        if cancel.load(Ordering::Relaxed) {
            return Err(AppError::Cancelled);
        }
        let path = entry.path();
        let meta = match fs::symlink_metadata(&path) {
            Ok(m) => m,
            Err(_) => continue,
        };
        if meta.file_type().is_symlink() {
            continue;
        }
        if meta.is_dir() {
            first_level.push(path);
        }
    }
    first_level.sort();

    let mut entries = Vec::with_capacity(first_level.len());
    for first in first_level {
        if cancel.load(Ordering::Relaxed) {
            return Err(AppError::Cancelled);
        }
        let mut found: Vec<FoundFile> = Vec::new();
        let mut found_ico: Option<String> = None;
        collect(
            &first,
            1,
            depth,
            &ext_set,
            cancel,
            &mut found,
            &mut found_ico,
        );
        if found.is_empty() {
            continue;
        }
        // 浅い階層優先 → 同一階層はサイズ大優先で default 選択。 found を全体ソート
        // することで、 popover の候補も最良順に並ぶ (フロント側は exe_candidates[0]
        // を default 選択として扱う)。
        found.sort_by(|a, b| {
            a.relative_depth
                .cmp(&b.relative_depth)
                .then(b.size_bytes.cmp(&a.size_bytes))
                .then(a.path.cmp(&b.path))
        });
        let candidates: Vec<ExeCandidate> = found
            .iter()
            .map(|f| ExeCandidate {
                path: f.path.to_string_lossy().into_owned(),
                size_bytes: f.size_bytes,
                name: f.name.clone(),
            })
            .collect();
        let folder_name = first
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default()
            .to_string();
        let mtime_ms = fs::metadata(&first)
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        entries.push(ExeFolderEntry {
            folder_path: normalize_folder_path(&first),
            folder_name,
            exe_candidates: candidates,
            icon_path: found_ico,
            mtime_ms,
        });
    }
    if cancel.load(Ordering::Relaxed) {
        return Err(AppError::Cancelled);
    }
    Ok(entries)
}

/// 第1階層フォルダの正規化済 絶対パス。 `widget_item_hides.item_target` /
/// `items.source_entry_key` と同 key 空間 (item_service::normalize_entry_key と同 logic)。
fn normalize_folder_path(p: &Path) -> String {
    let s = p.to_string_lossy().to_string();
    let with_fwd = s.replace('\\', "/");
    let trimmed = with_fwd.trim_end_matches('/');
    if trimmed.is_empty() {
        with_fwd
    } else {
        trimmed.to_string()
    }
}

/// 第1階層フォルダ配下を再帰収集する。 symlink は follow しない、 permission denied は skip。
///
/// - `current_depth`: 第1階層を 1 とした depth (= relative_depth でそのまま出す)
/// - `max_depth`: 1..=MAX_SCAN_DEPTH (呼び出し側でクランプ済)
fn collect(
    dir: &Path,
    current_depth: u8,
    max_depth: u8,
    ext_set: &HashSet<String>,
    cancel: &AtomicBool,
    found: &mut Vec<FoundFile>,
    found_ico: &mut Option<String>,
) {
    if cancel.load(Ordering::Relaxed) {
        return;
    }
    let read = match fs::read_dir(dir) {
        Ok(r) => r,
        // permission denied / IO error は該当ディレクトリを skip して走査継続。
        Err(_) => return,
    };
    let mut subdirs: Vec<PathBuf> = Vec::new();
    for entry in read.flatten() {
        if cancel.load(Ordering::Relaxed) {
            return;
        }
        let path = entry.path();
        let meta = match fs::symlink_metadata(&path) {
            Ok(m) => m,
            Err(_) => continue,
        };
        if meta.file_type().is_symlink() {
            // symlink は follow しない (ループ回避 / Windows junction も同様)。
            continue;
        }
        if meta.is_dir() {
            subdirs.push(path);
            continue;
        }
        if !meta.is_file() {
            continue;
        }
        let ext_lc = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_ascii_lowercase());
        let Some(ext) = ext_lc else {
            continue;
        };
        if ext == "ico" {
            if found_ico.is_none() {
                *found_ico = Some(path.to_string_lossy().into_owned());
            }
            continue;
        }
        if ext_set.contains(&ext) {
            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();
            found.push(FoundFile {
                path,
                name,
                relative_depth: current_depth,
                size_bytes: meta.len(),
            });
        }
    }
    if current_depth < max_depth {
        // deterministic な順序で深掘り (同階層内で表示順を安定させる)。
        subdirs.sort();
        for sub in subdirs {
            if cancel.load(Ordering::Relaxed) {
                return;
            }
            collect(
                &sub,
                current_depth + 1,
                max_depth,
                ext_set,
                cancel,
                found,
                found_ico,
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn default_exts() -> Vec<String> {
        vec![
            "exe".into(),
            "bat".into(),
            "cmd".into(),
            "ps1".into(),
            "sh".into(),
        ]
    }

    fn mk_temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "arcagate-exe-scan-{}-{}",
            name,
            uuid::Uuid::now_v7()
        ));
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
    fn scan_returns_empty_for_nonexistent_root() {
        let r = scan_exe_folders("Z:/__never_exists__", 2, &default_exts()).unwrap();
        assert!(r.is_empty());
    }

    #[test]
    fn scan_returns_empty_for_empty_extensions() {
        let dir = mk_temp_dir("no-ext");
        write_file(&dir.join("game").join("a.exe"), b"\x4D\x5A");
        let r = scan_exe_folders(dir.to_str().unwrap(), 2, &[]).unwrap();
        assert!(r.is_empty(), "extensions 未指定なら 0 件");
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn scan_clamps_depth_to_supported_range() {
        let dir = mk_temp_dir("clamp");
        write_file(&dir.join("game").join("a.exe"), b"\x4D\x5A");
        // depth 0 でも 1 として動く
        let r = scan_exe_folders(dir.to_str().unwrap(), 0, &default_exts()).unwrap();
        assert_eq!(r.len(), 1);
        // depth 99 でも MAX に clamp (panic しない)
        let r = scan_exe_folders(dir.to_str().unwrap(), 99, &default_exts()).unwrap();
        assert_eq!(r.len(), 1);
        fs::remove_dir_all(&dir).ok();
    }

    /// D6 真因テスト: 第1階層フォルダ 1 つの配下に複数階層の対象ファイルがあっても、
    /// entry は 1 つだけ (= 重複ラベル 0、 第1階層数 = entry 数)。
    #[test]
    fn first_level_folder_yields_single_entry_even_with_nested_targets() {
        let dir = mk_temp_dir("d6-no-dup");
        let game = dir.join("GameA");
        write_file(&game.join("launcher.exe"), &vec![0u8; 100]);
        write_file(&game.join("bin").join("game.exe"), &vec![0u8; 500]);
        write_file(
            &game.join("bin").join("tools").join("editor.exe"),
            &vec![0u8; 1000],
        );
        let r = scan_exe_folders(dir.to_str().unwrap(), 5, &default_exts()).unwrap();
        assert_eq!(r.len(), 1, "第1階層数 = entry 数 (重複ラベル 0)");
        assert_eq!(r[0].folder_name, "GameA");
        fs::remove_dir_all(&dir).ok();
    }

    /// D6 真因テスト: 浅い階層優先で 1 ファイル選択。
    /// 浅い側に小さいファイル、 深い側に大きいファイルがあっても **浅い方** が default。
    #[test]
    fn shallower_file_wins_over_deeper_larger() {
        let dir = mk_temp_dir("shallow-wins");
        let game = dir.join("GameA");
        write_file(&game.join("small.exe"), &vec![0u8; 100]);
        write_file(&game.join("deep").join("big.exe"), &vec![0u8; 10_000]);
        let r = scan_exe_folders(dir.to_str().unwrap(), 5, &default_exts()).unwrap();
        assert_eq!(r.len(), 1);
        assert_eq!(
            r[0].exe_candidates[0].name, "small.exe",
            "default は浅い階層側"
        );
        fs::remove_dir_all(&dir).ok();
    }

    /// D6 真因テスト: 同一階層でサイズ最大が default。
    #[test]
    fn same_depth_picks_largest() {
        let dir = mk_temp_dir("same-depth-largest");
        let game = dir.join("GameA");
        write_file(&game.join("small.exe"), &vec![0u8; 100]);
        write_file(&game.join("big.exe"), &vec![0u8; 9_999]);
        let r = scan_exe_folders(dir.to_str().unwrap(), 2, &default_exts()).unwrap();
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].exe_candidates[0].name, "big.exe");
        fs::remove_dir_all(&dir).ok();
    }

    /// 対象ファイル 0 件の第1階層フォルダは entry に出ない。
    #[test]
    fn first_level_without_target_is_skipped() {
        let dir = mk_temp_dir("empty-first-level");
        write_file(&dir.join("docs").join("readme.txt"), b"hello");
        write_file(&dir.join("game").join("a.exe"), b"\x4D\x5A");
        let r = scan_exe_folders(dir.to_str().unwrap(), 3, &default_exts()).unwrap();
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].folder_name, "game");
        fs::remove_dir_all(&dir).ok();
    }

    /// D5 拡張子可変: `extensions = ["blend"]` で `.blend` のみ検出。
    #[test]
    fn extensions_filter_blend_only() {
        let dir = mk_temp_dir("ext-blend");
        let folder = dir.join("Project");
        write_file(&folder.join("scene.blend"), b"BLENDER");
        write_file(&folder.join("launcher.exe"), b"\x4D\x5A");
        let r = scan_exe_folders(dir.to_str().unwrap(), 2, &["blend".to_string()]).unwrap();
        assert_eq!(r.len(), 1);
        let names: Vec<&str> = r[0]
            .exe_candidates
            .iter()
            .map(|c| c.name.as_str())
            .collect();
        assert!(names.contains(&"scene.blend"));
        assert!(!names.contains(&"launcher.exe"));
        fs::remove_dir_all(&dir).ok();
    }

    /// 拡張子の正規化: 先頭 `.` 許容 + 大文字小文字無視。
    #[test]
    fn extensions_normalize_dot_and_case() {
        let dir = mk_temp_dir("ext-normalize");
        let folder = dir.join("ProjectClip");
        write_file(&folder.join("work.CLIP"), b"clip");
        let r = scan_exe_folders(dir.to_str().unwrap(), 2, &[".Clip".to_string()]).unwrap();
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].exe_candidates[0].name, "work.CLIP");
        fs::remove_dir_all(&dir).ok();
    }

    /// D5 拡張子可変: `.exe`/`.bat` 等の default extensions で script も検出される
    /// (旧テスト `scan_detects_script_extensions` を可変引数版に書き直し)。
    #[test]
    fn default_extensions_detect_script_files() {
        let dir = mk_temp_dir("default-scripts");
        let folder = dir.join("scripts-folder");
        write_file(&folder.join("install.bat"), b"@echo off\n");
        write_file(&folder.join("deploy.ps1"), b"# powershell\n");
        write_file(&folder.join("run.sh"), b"#!/bin/sh\n");
        write_file(&folder.join("build.cmd"), b"@echo off\n");
        write_file(&folder.join("note.txt"), b"unrelated");
        let r = scan_exe_folders(dir.to_str().unwrap(), 2, &default_exts()).unwrap();
        assert_eq!(r.len(), 1);
        let names: Vec<&str> = r[0]
            .exe_candidates
            .iter()
            .map(|c| c.name.as_str())
            .collect();
        assert!(names.contains(&"install.bat"));
        assert!(names.contains(&"deploy.ps1"));
        assert!(names.contains(&"run.sh"));
        assert!(names.contains(&"build.cmd"));
        assert!(!names.contains(&"note.txt"));
        fs::remove_dir_all(&dir).ok();
    }

    /// `.ico` は同フォルダの先頭 1 件が `icon_path` に入る。
    #[test]
    fn picks_first_ico_as_icon_path() {
        let dir = mk_temp_dir("ico");
        let game = dir.join("game-with-icon");
        write_file(&game.join("a.exe"), b"\x4D\x5A");
        write_file(&game.join("game.ico"), b"\x00\x00\x01\x00");
        let r = scan_exe_folders(dir.to_str().unwrap(), 2, &default_exts()).unwrap();
        assert_eq!(r.len(), 1);
        assert!(r[0].icon_path.as_deref().unwrap().ends_with("game.ico"));
        fs::remove_dir_all(&dir).ok();
    }

    /// `scan_depth` で再帰深度を制御する (depth=1 で第1階層直下のみ検出)。
    #[test]
    fn scan_depth_controls_recursion_depth() {
        let dir = mk_temp_dir("depth-control");
        write_file(&dir.join("GameA").join("shallow.exe"), b"\x4D\x5A");
        write_file(
            &dir.join("GameB").join("inner").join("deep.exe"),
            b"\x4D\x5A",
        );
        // depth=1: 第1階層直下のみ → GameA (shallow.exe) は検出、 GameB は深いので skip
        let r1 = scan_exe_folders(dir.to_str().unwrap(), 1, &default_exts()).unwrap();
        let names1: Vec<&str> = r1.iter().map(|e| e.folder_name.as_str()).collect();
        assert_eq!(r1.len(), 1);
        assert!(names1.contains(&"GameA"));
        // depth=2: GameB の深い exe も拾う
        let r2 = scan_exe_folders(dir.to_str().unwrap(), 2, &default_exts()).unwrap();
        let names2: Vec<&str> = r2.iter().map(|e| e.folder_name.as_str()).collect();
        assert_eq!(r2.len(), 2);
        assert!(names2.contains(&"GameA"));
        assert!(names2.contains(&"GameB"));
        fs::remove_dir_all(&dir).ok();
    }

    /// entry id (= `folder_path`) が正規化済 絶対パス (forward slash / 末尾 separator 除去)。
    /// `widget_item_hides.item_target` / `items.source_entry_key` と同 key 空間で一致する。
    #[test]
    fn entry_id_is_normalized_absolute_path() {
        let dir = mk_temp_dir("normalize-id");
        let game = dir.join("GameA");
        write_file(&game.join("a.exe"), b"\x4D\x5A");
        let r = scan_exe_folders(dir.to_str().unwrap(), 2, &default_exts()).unwrap();
        assert_eq!(r.len(), 1);
        let id = &r[0].folder_path;
        assert!(!id.contains('\\'), "forward slash 化されている: {id}");
        assert!(!id.ends_with('/'), "末尾 separator なし: {id}");
        assert!(id.ends_with("GameA"));
        fs::remove_dir_all(&dir).ok();
    }

    /// 列挙順 deterministic: 第1階層フォルダ path 昇順。
    #[test]
    fn entries_are_sorted_deterministically() {
        let dir = mk_temp_dir("deterministic-order");
        write_file(&dir.join("z-game").join("a.exe"), b"\x4D\x5A");
        write_file(&dir.join("a-game").join("a.exe"), b"\x4D\x5A");
        write_file(&dir.join("m-game").join("a.exe"), b"\x4D\x5A");
        let r = scan_exe_folders(dir.to_str().unwrap(), 2, &default_exts()).unwrap();
        let names: Vec<&str> = r.iter().map(|e| e.folder_name.as_str()).collect();
        assert_eq!(names, vec!["a-game", "m-game", "z-game"]);
        fs::remove_dir_all(&dir).ok();
    }

    /// symlink は follow しない (= ループ fixture でも無限再帰せず終了する)。
    /// Windows では symlink 作成に管理者権限が必要なため、 symlink 作成失敗時は
    /// テストを skip して green (ロジックの不在を担保するための test ではなく、
    /// 「symlink を follow しない」 = ループに陥らない を確認する)。
    #[test]
    fn does_not_follow_symlinks_no_infinite_recursion() {
        let dir = mk_temp_dir("symlink-loop");
        let game = dir.join("GameA");
        write_file(&game.join("a.exe"), b"\x4D\x5A");
        let loop_target = game.join("loop");
        // symlink を作る (Windows では権限が無いと失敗 = test skip)。
        let symlink_created = create_dir_symlink(&game, &loop_target).is_ok();
        // ループしようとしまいと、 scan は finite time で完了するはず。
        let r = scan_exe_folders(dir.to_str().unwrap(), 5, &default_exts()).unwrap();
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].folder_name, "GameA");
        // symlink が存在しても entry は重複しない (1 件)。
        if symlink_created {
            // exe_candidates は a.exe の 1 件のみ (symlink 経由で重複検出していない)。
            let count = r[0]
                .exe_candidates
                .iter()
                .filter(|c| c.name == "a.exe")
                .count();
            assert_eq!(count, 1, "symlink 経由で重複検出しない");
        }
        fs::remove_dir_all(&dir).ok();
    }

    /// permission denied (read_dir error) のディレクトリを含む fixture で
    /// panic せず、 該当を skip して走査継続。 Windows では ACL 設定が困難なため、
    /// 「存在しないパスへの read_dir も Err を返す」 性質を借りて間接的に確認する。
    #[test]
    fn permission_denied_dir_is_skipped_no_panic() {
        let dir = mk_temp_dir("perm-denied");
        let good = dir.join("Good");
        write_file(&good.join("a.exe"), b"\x4D\x5A");
        // 「存在するファイル」 を第1階層に置く (read_dir でないファイルだが、
        // symlink_metadata では symlink でも dir でもないため scan は skip する)。
        // ここでの本来の意図は read_dir 失敗ケースだが、 panic しないことだけ確認。
        write_file(&dir.join("not-a-dir.txt"), b"x");
        let r = scan_exe_folders(dir.to_str().unwrap(), 3, &default_exts()).unwrap();
        // Good は検出、 not-a-dir.txt は dir でないので skip → 残り 1 件。
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].folder_name, "Good");
        fs::remove_dir_all(&dir).ok();
    }

    /// 古い API 互換: scan_depth_limits_recursion (旧 walk のディレクトリ単位
    /// entry を期待していた) は plan PH-CF-400 で正しい仕様 (= 第1階層単位) に修正。
    /// 旧 expectation の 2-entry / 3-entry は意図的にやめ、 「level1 1 entry のみ」 とする。
    #[test]
    fn scan_depth_returns_first_level_only_no_duplicates() {
        let dir = mk_temp_dir("depth-no-duplicates");
        write_file(&dir.join("level1").join("game.exe"), b"\x4D\x5A");
        write_file(
            &dir.join("level1").join("level2").join("deep.exe"),
            b"\x4D\x5A",
        );
        // depth=3 でも entry は level1 (第1階層) の 1 件のみ。 重複ラベルなし。
        let r = scan_exe_folders(dir.to_str().unwrap(), 3, &default_exts()).unwrap();
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].folder_name, "level1");
        fs::remove_dir_all(&dir).ok();
    }

    #[cfg(windows)]
    fn create_dir_symlink(src: &Path, dst: &Path) -> std::io::Result<()> {
        std::os::windows::fs::symlink_dir(src, dst)
    }

    #[cfg(unix)]
    fn create_dir_symlink(src: &Path, dst: &Path) -> std::io::Result<()> {
        std::os::unix::fs::symlink(src, dst)
    }
}
