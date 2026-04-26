use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::utils::error::AppError;

/// サブフォルダ内の exe + 任意の icon。LibraryCard 風に表示する 1 entry。
#[derive(Serialize, Default, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExeFolderEntry {
    pub folder_path: String,
    pub folder_name: String,
    pub exe_candidates: Vec<ExeCandidate>,
    pub icon_path: Option<String>,
}

#[derive(Serialize, Default, Debug, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExeCandidate {
    pub path: String,
    pub size_bytes: u64,
    pub name: String,
}

/// `root` 配下の各サブフォルダから .exe を見つけて entries を作る。
///
/// - `depth` は 1..=3 にクランプ（深すぎる scan を防止）
/// - exe が 0 件のサブフォルダは除外
/// - `*.ico` が同フォルダにあれば `icon_path` に最初の 1 件
/// - 不在 root は空 Vec を返す（best-effort、AppError なし）
pub fn scan_exe_folders(root: &str, depth: u8) -> Result<Vec<ExeFolderEntry>, AppError> {
    let depth = depth.clamp(1, 3);
    let root_path = Path::new(root);
    if !root_path.is_dir() {
        return Ok(Vec::new());
    }

    let mut entries = Vec::new();
    walk(root_path, depth, &mut entries);
    Ok(entries)
}

fn walk(dir: &Path, remaining_depth: u8, out: &mut Vec<ExeFolderEntry>) {
    let read = match fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return,
    };

    let mut subdirs: Vec<PathBuf> = Vec::new();
    let mut exes: Vec<ExeCandidate> = Vec::new();
    let mut ico: Option<String> = None;

    for entry in read.flatten() {
        let path = entry.path();
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        if meta.is_dir() {
            subdirs.push(path);
            continue;
        }
        if !meta.is_file() {
            continue;
        }
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_ascii_lowercase());
        match ext.as_deref() {
            Some("exe") => {
                let name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();
                let path_str = path.to_string_lossy().into_owned();
                exes.push(ExeCandidate {
                    path: path_str,
                    size_bytes: meta.len(),
                    name,
                });
            }
            Some("ico") if ico.is_none() => {
                ico = Some(path.to_string_lossy().into_owned());
            }
            _ => {}
        }
    }

    if !exes.is_empty() {
        // size_bytes 降順
        exes.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
        let folder_name = dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        out.push(ExeFolderEntry {
            folder_path: dir.to_string_lossy().into_owned(),
            folder_name,
            exe_candidates: exes,
            icon_path: ico,
        });
    }

    if remaining_depth > 1 {
        for sub in subdirs {
            walk(&sub, remaining_depth - 1, out);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn mk_temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("arcagate-exe-scan-{}", name));
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
        let r = scan_exe_folders("Z:/__never_exists__", 2).unwrap();
        assert!(r.is_empty());
    }

    #[test]
    fn scan_clamps_depth_to_1_3() {
        let dir = mk_temp_dir("clamp");
        // depth 0 でも 1 として動く（root 自身に exe があれば検出）
        write_file(&dir.join("a.exe"), b"\x4D\x5A");
        let r = scan_exe_folders(dir.to_str().unwrap(), 0).unwrap();
        assert_eq!(r.len(), 1);
        let r = scan_exe_folders(dir.to_str().unwrap(), 99).unwrap();
        assert_eq!(r.len(), 1);
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn scan_one_level_finds_exes_and_sorts_by_size() {
        let dir = mk_temp_dir("one-level");
        let game = dir.join("game1");
        write_file(&game.join("small.exe"), &vec![0u8; 100]);
        write_file(&game.join("big.exe"), &vec![0u8; 1000]);
        let r = scan_exe_folders(dir.to_str().unwrap(), 2).unwrap();
        assert_eq!(r.len(), 1);
        let entry = &r[0];
        assert_eq!(entry.folder_name, "game1");
        assert_eq!(entry.exe_candidates.len(), 2);
        assert_eq!(entry.exe_candidates[0].name, "big.exe"); // size 降順
        assert_eq!(entry.exe_candidates[1].name, "small.exe");
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn scan_skips_folders_without_exe() {
        let dir = mk_temp_dir("skip-no-exe");
        write_file(&dir.join("text-only").join("readme.txt"), b"hello");
        write_file(&dir.join("with-exe").join("a.exe"), b"\x4D\x5A");
        let r = scan_exe_folders(dir.to_str().unwrap(), 2).unwrap();
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].folder_name, "with-exe");
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn scan_picks_first_ico_as_icon_path() {
        let dir = mk_temp_dir("ico");
        let game = dir.join("game-with-icon");
        write_file(&game.join("a.exe"), b"\x4D\x5A");
        write_file(&game.join("game.ico"), b"\x00\x00\x01\x00");
        let r = scan_exe_folders(dir.to_str().unwrap(), 2).unwrap();
        assert_eq!(r.len(), 1);
        assert!(r[0].icon_path.as_deref().unwrap().ends_with("game.ico"));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn scan_depth_limits_recursion() {
        let dir = mk_temp_dir("depth");
        // depth=1 で root 直下のみ、サブフォルダの exe は検出しない
        write_file(&dir.join("level1").join("game.exe"), b"\x4D\x5A");
        write_file(
            &dir.join("level1").join("level2").join("deep.exe"),
            b"\x4D\x5A",
        );
        let r1 = scan_exe_folders(dir.to_str().unwrap(), 1).unwrap();
        // depth=1: root を walk するが remaining_depth=0 でサブに入らない
        assert_eq!(r1.len(), 0); // root に exe がない
        let r2 = scan_exe_folders(dir.to_str().unwrap(), 2).unwrap();
        assert_eq!(r2.len(), 1); // level1 まで
        let r3 = scan_exe_folders(dir.to_str().unwrap(), 3).unwrap();
        assert_eq!(r3.len(), 2); // level1 + level1/level2
        fs::remove_dir_all(&dir).ok();
    }
}
