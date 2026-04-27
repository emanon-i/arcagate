---
id: PH-20260427-468
status: done
batch: 105
type: 改善
era: Distribution Era Hardening
---

# PH-468: kill-switch サービス skeleton (HTTP fetch は batch-106)

## 問題

PH-462 で設計した kill-switch (緊急時の version 無効化) の実装着手。HTTP client 統合 (PH-465 Telemetry / PH-466 Crash 監視と共有予定) は別 plan。本 plan では service skeleton + version 比較ロジック + unit test を先行実装。

## 改修

1. `src-tauri/src/services/kill_switch_service.rs` 新規作成
   - `DisabledJson` struct (disabled_versions / min_supported_version / message)
   - `KillSwitchResult` struct (disabled / message / current_version)
   - `pub fn check(current_version: &str) -> KillSwitchResult` (best-effort, fail-silent)
   - `fetch_disabled_json()` は **stub** (Err 返却、HTTP は batch-106)
   - `is_version_disabled` (disabled_versions list + min_supported_version 比較)
   - `version_lt` (簡素な major.minor.patch parser)
   - 4 unit tests
2. `src-tauri/src/services/mod.rs` に登録

## 受け入れ条件

- [x] kill_switch_service skeleton 実装
- [x] services/mod.rs 登録
- [x] 4 unit test (version_disabled_in_list / version_below_min_supported / version_lt_basic / check_offline_returns_not_disabled) 全 PASS
- [x] best-effort 失敗時 disabled=false (offline / parse error でアプリ停止しない)
- [x] DISABLED_JSON_URL / FETCH_TIMEOUT_SECS は batch-106 用に保持 (`#[allow(dead_code)]`)

## 別 plan (batch-106 以降)

- HTTP client 統合 (Telemetry / Crash 監視と共有)
- IPC `cmd_check_kill_switch` 公開
- フロント側 dialog component
- `lib.rs setup` での起動時呼び出し

## 横展開チェック

- 他 service との依存関係なし (独立) → OK
- AppError 経路使用なし (best-effort silent) → OK
- engineering-principles §3 エラーハンドリング標準と整合 → 「静かに失敗しない」例外として best-effort + warn log に該当 (HTTP 実装時に log 追加)
