# Release Readiness Audit — C 安定 + D パフォーマンス

**Predecessor**: [audit.md](./audit.md)

## C. 安定性

### C1. 起動 → 終了 flow crash 無し — **未検証 (user 手動)**

- **根拠**: 自動化された 5 回連続起動 test なし。dev 起動 1 回は agent 経験あり、log は `%LOCALAPPDATA%\arcagate\logs\arcagate.log` に出るが本 audit で 5 回連続検証は未実施。
- **gap**: J5 release-checklist で要求。

### C2. メモリリーク (idle 30 min) — **未検証 (user 手動)**

- **根拠**: agent 単独で 30 min 待機は context 浪費なため不可。
- **gap**: PowerShell で `tasklist` を 5 min 間隔で記録する script を gap-list に提案。user 手動実行。

### C3. メモリリーク (1 h heavy use) — **未検証 (user 手動)**

- **根拠**: 同上。1 h e2e 自動化スクリプトも未作成。
- **gap**: J5 release-checklist で要求 + 自動化 script 案を gap-list に提案。

### C4. IPC error / timeout の graceful degradation — **部分的**

- **根拠**: `formatIpcError` / `getErrorCode` / `ErrorState` component 存在、`AppError::DbLock` 等 Rust 側エラー code 充実 (`utils/error.rs` 16 variant)。Library で IPC 失敗時 toast + 再試行誘導 (refreshSidebarStats が allSettled で best-effort)。
- **gap**: DB 意図的 lock テストは **未実施**、特定 IPC 失敗時の UI freeze 0 を numeric で証明していない。

### C5. DB migration forward — **PASS**

- **根拠**: `cargo test --manifest-path src-tauri/Cargo.toml --lib` 256 tests pass、`db::migrations::tests` 含む。`migrations()` の `to_latest` 利用が `db/mod.rs` で確認。

### C6. DB migration rollback (down) — **部分的**

- **根拠**: `grep -rn "DownMigration\|Migration::U2D" src-tauri/src/db/` で down migration 定義の有無を確認 → grep 結果は別途実施必要。CLAUDE.md `include_str!` で migrations 埋め込み済 (forward only の傾向)。
- **gap**: down migration 意図 (forward only or rollback あり) が **明文化されていない**。release notes に「forward only、rollback 不可」明記が gap。

### C7. DB 破損時の fallback — **未検証 (user 手動)**

- **根拠**: 手動 DB 破壊テスト未実施。
- **gap**: J5 release-checklist で要求 + DB 破損時の dialog UI 実装が無ければ追加が gap。

### C8. unhandled rejection / panic 検知 — **FAIL (frontend 側 0)**

- **根拠**: Rust 側 `crash_monitor_service::register_panic_hook` 実装 (services/crash_monitor_service.rs L95)、`std::panic::set_hook` 経路あり。Frontend 側 `grep -rn "unhandledrejection\|window\.onerror" src/`: **0 件**。
- **gap**: Frontend で `window.addEventListener('unhandledrejection')` + `window.onerror` の実装が **欠落**。silent fail で user に届かない bug を見逃すリスク高。**release blocker 候補**。

## D. パフォーマンス

### D1-D9 全項目 — **未検証 (数値計測未実施)**

- **根拠**: 自動化 perf 計測スクリプト `scripts/perf-baseline.sh` 存在は未確認 (`scripts/` ディレクトリの audit-* のみ確認済)、cold/warm 起動の P95 / palette P95 / IPC P95 / 1000 item / 100 widget 計測は **本 audit で未実施**。
- **gap**: 9 項目すべて **数値計測未取得**。release 前に手動 stopwatch + CDP Performance.metrics で取得が必須。最低 D1 (cold P95) / D5 (idle メモリ) / D7 (1000 items) は user 手動で計測。それ以外は L4 distribution era で自動化提案。

#### 個別 N/A 化判断 (release 緊急度)

- D1 / D5 / D7: **release 必須計測** — gap-list で blocker 化
- D2-D4, D6, D8-D9: should-have / nice-to-have

### 補足: 既存の保証

- `pnpm verify` 末尾の `pnpm tauri build` で release バンドル生成は確認済 (本 PR で 1 回成功)。
- vitest 306 / cargo 256 tests pass (機械検証は green、ただし lessons.md C-1 「verify pass = 治った と書くな」 に従い perf 担保ではない)。
- L1 PR #284 で I3 batch IPC + spawn_blocking 実装、L3-A PR #290 で `content-visibility: auto` 適用済。これらの **効果計測は未実施** (D7/D9 の根拠化が必要)。
