-- R9-B: icon extraction の path-based dedup cache (Lessons.md C-2 派生対処)。
--
-- 目的:
--   1. 同じ exe path の重複 PowerShell 起動を回避 (再起動後 / 別 item 登録時)。
--   2. 既存 icon file が再利用可能か lookup できる機械可読な台帳を持つ。
--
-- exe_path をキーにする (canonicalize 後の絶対 path)、icon_path は appdata/icons 下の PNG。
-- 同じ exe を別 item で登録した場合、初回のみ extract、2 件目以降は cache hit。

CREATE TABLE icon_cache (
    exe_path TEXT PRIMARY KEY,
    icon_path TEXT NOT NULL,
    extracted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_icon_cache_extracted_at ON icon_cache(extracted_at);
