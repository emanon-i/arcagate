use std::fs;
use std::path::Path;

use serde::Serialize;

use crate::utils::error::AppError;

#[derive(Serialize, Default, Debug, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub size_bytes: u64,
}

/// `root` 配下の files / dirs を depth 制限つきで列挙する。
///
/// - `depth` は 1..=3 にクランプ
/// - `limit` を超えたら早期 return（UI ハング防止）
/// - 不在 root は空 Vec（best-effort）
/// - dotfiles (`.git`, `node_modules` 等) はスキップ
pub fn list_files(root: &str, depth: u8, limit: usize) -> Result<Vec<FileEntry>, AppError> {
    let depth = depth.clamp(1, 3);
    let limit = limit.clamp(1, 5000);
    let root_path = Path::new(root);
    if !root_path.is_dir() {
        return Ok(Vec::new());
    }
    let mut out = Vec::new();
    walk(root_path, depth, limit, &mut out);
    Ok(out)
}

fn walk(dir: &Path, remaining_depth: u8, limit: usize, out: &mut Vec<FileEntry>) {
    if out.len() >= limit {
        return;
    }
    let read = match fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return,
    };
    for entry in read.flatten() {
        if out.len() >= limit {
            return;
        }
        let path = entry.path();
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        if name.starts_with('.') || name == "node_modules" || name == "target" {
            continue;
        }
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let path_str = path.to_string_lossy().into_owned();
        if meta.is_dir() {
            out.push(FileEntry {
                path: path_str.clone(),
                name: name.clone(),
                is_dir: true,
                size_bytes: 0,
            });
            if remaining_depth > 1 {
                walk(&path, remaining_depth - 1, limit, out);
            }
        } else if meta.is_file() {
            out.push(FileEntry {
                path: path_str,
                name,
                is_dir: false,
                size_bytes: meta.len(),
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::path::PathBuf;

    fn mk_temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("arcagate-file-search-{}", name));
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
    fn list_returns_empty_for_nonexistent_root() {
        let r = list_files("Z:/__never_exists__", 2, 100).unwrap();
        assert!(r.is_empty());
    }

    #[test]
    fn list_includes_files_and_dirs() {
        let dir = mk_temp_dir("basic");
        write_file(&dir.join("a.txt"), b"hello");
        fs::create_dir_all(dir.join("sub")).unwrap();
        let r = list_files(dir.to_str().unwrap(), 1, 100).unwrap();
        let names: Vec<&str> = r.iter().map(|e| e.name.as_str()).collect();
        assert!(names.contains(&"a.txt"));
        assert!(names.contains(&"sub"));
        // file size matches content length
        let a = r.iter().find(|e| e.name == "a.txt").unwrap();
        assert!(!a.is_dir);
        assert_eq!(a.size_bytes, 5);
        let s = r.iter().find(|e| e.name == "sub").unwrap();
        assert!(s.is_dir);
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn list_depth_limits_recursion() {
        let dir = mk_temp_dir("depth");
        write_file(&dir.join("level1").join("file1.txt"), b"a");
        write_file(&dir.join("level1").join("level2").join("deep.txt"), b"b");
        let r1 = list_files(dir.to_str().unwrap(), 1, 100).unwrap();
        // depth=1: level1 dir のみ、中身は walk しない
        let names: Vec<&str> = r1.iter().map(|e| e.name.as_str()).collect();
        assert!(names.contains(&"level1"));
        assert!(!names.contains(&"file1.txt"));
        let r2 = list_files(dir.to_str().unwrap(), 2, 100).unwrap();
        let names2: Vec<&str> = r2.iter().map(|e| e.name.as_str()).collect();
        assert!(names2.contains(&"file1.txt"));
        assert!(!names2.contains(&"deep.txt"));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn list_skips_dotfiles_and_known_heavy_dirs() {
        let dir = mk_temp_dir("skip");
        write_file(&dir.join(".git").join("HEAD"), b"x");
        write_file(&dir.join("node_modules").join("pkg").join("a.js"), b"x");
        write_file(&dir.join("ok.txt"), b"x");
        let r = list_files(dir.to_str().unwrap(), 3, 100).unwrap();
        let names: Vec<&str> = r.iter().map(|e| e.name.as_str()).collect();
        assert!(names.contains(&"ok.txt"));
        assert!(!names.contains(&".git"));
        assert!(!names.contains(&"node_modules"));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn list_respects_limit() {
        let dir = mk_temp_dir("limit");
        for i in 0..20 {
            write_file(&dir.join(format!("f{}.txt", i)), b"x");
        }
        let r = list_files(dir.to_str().unwrap(), 1, 5).unwrap();
        assert_eq!(r.len(), 5);
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn list_clamps_depth_and_limit() {
        let dir = mk_temp_dir("clamp");
        write_file(&dir.join("a.txt"), b"x");
        // depth 0 → 1 にクランプ、limit 0 → 1 にクランプ
        let r = list_files(dir.to_str().unwrap(), 0, 0).unwrap();
        assert_eq!(r.len(), 1);
        let r = list_files(dir.to_str().unwrap(), 99, 99999).unwrap();
        assert_eq!(r.len(), 1);
        fs::remove_dir_all(&dir).ok();
    }
}
