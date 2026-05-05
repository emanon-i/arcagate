# Release Readiness Criteria — C 安定性 + D パフォーマンス

**Predecessor**: [criteria.md](./release-criteria.md)

## C. 安定性

### C1. 起動 → 終了 flow crash 無し

- **Verification**: dev / release build を 5 回連続で起動 → main window 表示 → Library / Workspace / Settings / Palette を一巡 → 終了。各起動で dev console / Tauri log に `panic` / `unhandled rejection` / `error` が出ないか確認
- **Pass criteria**: 5/5 回で crash / panic 0、`%LOCALAPPDATA%\arcagate\logs\arcagate.log` に新規 ERROR level 0
- **Tooling**: 手動起動 + log 確認、`bash scripts/perf-baseline.sh` (存在すれば) で起動時間も同時計測

### C2. メモリリーク (idle 30 min)

- **Verification**: app 起動 → 操作なしで 30 min 放置 → タスクマネージャでプライベートワーキングセット を 0 / 5 / 15 / 30 min に記録
- **Pass criteria**: 30 min 後の RSS 増加 ≤ 起動直後 +10MB (idle 状態でモノトニック増加しない)
- **Tooling**: `tasklist /FI "IMAGENAME eq arcagate.exe" /FO CSV` を 5 min 間隔で記録 (PowerShell スクリプト化可能)、agent 単独で 30 min 待機は context 浪費なため **user 手動検証** を明示

### C3. メモリリーク (1 h heavy use)

- **Verification**: 1) Library で 100+ item を scroll / sort / filter を繰り返す / 2) Workspace を 5 個切替 / 3) widget を 20 個追加削除 / 4) palette 50 回 open/close、を 1 h 繰り返し RSS 計測
- **Pass criteria**: 1 h 後の RSS 増加 ≤ 起動直後 +50MB
- **Tooling**: e2e で操作スクリプト化 + Performance.memory ログ取得、agent 単独 1h は不可能のため **user 手動検証** を明示

### C4. IPC error / timeout の graceful degradation

- **Verification**: Tauri DB を意図的に lock (read-only file) → 操作で IPC error が出る → UI が crash せず ErrorState / Toast で報告
- **Pass criteria**: DB 操作 IPC が失敗しても UI freeze 0、ErrorState component で再試行 button 表示、retry で復旧
- **Tooling**: dev で `chmod -w` (Win では DB ファイルを別 process で open) → 手動操作 + screenshot

### C5. DB migration forward

- **Verification**: 旧 DB (v0xx) を含めた fixture で起動 → migration apply → 全 schema が最新になる
- **Pass criteria**: `migrations().to_latest(&mut conn)` が `Ok(())`、test `db::migrations::tests` が pass
- **Tooling**: `cargo test --manifest-path src-tauri/Cargo.toml --lib db::migrations`、fixture DB は `test/fixtures/` 配下に配置

### C6. DB migration rollback (down)

- **Verification**: `rusqlite_migration` の down migration が定義されているか確認、定義されていれば適用 / 未定義なら release notes に「rollback 不可、forward のみ」明記
- **Pass criteria**: down migration **意図** が明文化されている (forward only でも明示なら PASS)
- **Tooling**: `grep -rn "DownMigration\|Migration::U2D" src-tauri/src/db/`、結果を audit.md に記載

### C7. DB 破損時の fallback

- **Verification**: app data dir の `arcagate.db` を破壊 (バイナリ書き換え) → 起動 → crash せず recovery 経路を提示 (新規 DB 作成 or backup から復元 dialog)
- **Pass criteria**: SQLite open error で panic せず、user に recovery 選択肢を提示する dialog が出る、または最低でも crash report ファイルを残す
- **Tooling**: 手動 DB 破壊 + 起動、ログ確認

### C8. unhandled rejection / panic 検知

- **Verification**: Rust 側 `panic_hook` で panic を log に書く + Frontend で `window.addEventListener('unhandledrejection')` で error report
- **Pass criteria**: 検知ハンドラが registered で、panic / unhandled rejection が log に残る (silent fail しない)
- **Tooling**: `grep -rn "panic_hook\|unhandledrejection\|onerror" src/ src-tauri/`、grep 結果を audit.md に記載

## D. パフォーマンス

### D1. アプリ起動 P95 (cold)

- **Verification**: app data dir を空にした状態 (cold) で 5 回起動 → 各起動の `app_ready` event までの elapsed を CDP Performance.timing で記録
- **Pass criteria**: P95 ≤ 1500ms (低スペック PC でも ≤ 2500ms、ux_standards.md §1)
- **Tooling**: `bash scripts/perf-baseline.sh` (既存) or 手動 stopwatch + cold-start 用テスト script、結果を audit.md に numerical で記載

### D2. アプリ起動 P95 (warm)

- **Verification**: cold 後の 2 回目以降 (DB / asset cache あり) で 5 回起動を計測
- **Pass criteria**: P95 ≤ 1000ms
- **Tooling**: 同上

### D3. パレット表示 P95

- **Verification**: Ctrl+Shift+Space を 20 回押下 → 各回の hotkey event → palette window visible までの elapsed
- **Pass criteria**: P95 ≤ 120ms (ux_standards.md §1)
- **Tooling**: `e2e/palette-hotkey.spec.ts` (存在すれば) + Performance API 計測

### D4. アイテム起動 P95

- **Verification**: Library で 20 回 launch → 各回の click → process spawn 完了までの elapsed (launch_log 記録 timestamp も併用)
- **Pass criteria**: P95 ≤ 200ms (起動先 process の表示までは除外、Arcagate 側の処理だけ計測)
- **Tooling**: 既存 `getItemStats` + 手動 stopwatch クロスチェック

### D5. idle メモリ

- **Verification**: 起動 5 min 後の RSS を記録
- **Pass criteria**: ≤ 120MB (ux_standards.md §1)
- **Tooling**: `tasklist /FI "IMAGENAME eq arcagate.exe" /FO CSV`

### D6. idle CPU

- **Verification**: 起動 5 min 後、無操作で 60 sec 平均 CPU% をタスクマネージャで記録
- **Pass criteria**: ≤ 1% (ux_standards.md §1)、常時アニメーション / poll が無いこと
- **Tooling**: タスクマネージャ + 60 sec 平均 (PowerShell `Get-Counter` でも可)

### D7. Library 1000 items でフリーズ無し

- **Verification**: fixture で 1000 item を seed → Library 開く → grid scroll / sort / filter / search を実行
- **Pass criteria**: scroll で 60fps 維持 (frame rate ≥ 50fps)、sort / filter 操作応答 ≤ 200ms
- **Tooling**: `cmd_create_item` を loop で 1000 回呼ぶ test fixture script + CDP `Performance.metrics` (Frames per Second)

### D8. Workspace 100 widget でフリーズ無し

- **Verification**: 100 widget を Workspace に配置 → zoom / pan / move / resize 操作
- **Pass criteria**: 操作応答 ≤ 200ms、scroll で frame rate ≥ 50fps
- **Tooling**: 同上、widget 配置 fixture script

### D9. 主要 IPC 応答時間 P95

- **Verification**: `cmd_list_items` / `cmd_search_items` / `cmd_get_items_metadata_batch` (1000 ids) / `cmd_launch_item` を各 50 回呼ぶ → P95 elapsed
- **Pass criteria**: 各 IPC P95 ≤ 100ms (1000 batch metadata は ≤ 500ms)
- **Tooling**: dev console で `console.time/timeEnd` ベンチ + 数値記録
