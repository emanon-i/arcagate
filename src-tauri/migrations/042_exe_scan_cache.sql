-- PH-CF-900 A1-4: exe-folder 監視 widget の scan 結果を DB にキャッシュする。
--
-- 動機: `cmd_scan_exe_folders` は cold で 10s+ かかる (W-2 / W-9 audit、 perf-budgets 参照)。
-- 起動経路で widget mount 時に毎回 cold walk が走るため起動体感を悪化させる。 結果を
-- DB persist しておけば、 mount 時に「キャッシュ即表示 → background で差分 re-scan」 が
-- できる (`features/backend/exe-scanner.md` §scan キャッシュ契約)。
--
-- 設計:
--   - cache key = SHA-1 (or 同等) の 文字列キーで `<watch_path>|<scan_depth>|<extensions sorted>`
--     を frontend / IPC レイヤで合成して渡す (key 一致 = 同 scan 入力)
--   - 1 cache entry あたり JSON 1 本 (`ExeFolderEntry[]` を serde で round-trip)
--   - `scanned_at` は ISO8601 (launch_log と同 フォーマット、 hot path で `julianday()` 比較
--     はしないため strftime / datetime() の混在問題は無し)
--   - 上限 / TTL は持たない (key 単位で上書きされるため自然に bounded)
--   - cache key を変えると古い row は orphan として残るが、 reset_service が
--     `delete_all` で全消去するため累積上限は実用上問題なし

CREATE TABLE IF NOT EXISTS exe_scan_cache (
    cache_key   TEXT PRIMARY KEY,
    entries_json TEXT NOT NULL,
    scanned_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
