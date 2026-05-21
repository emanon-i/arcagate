---
id: PH-PQ-100
status: planning
batch: paid-quality
type: 防衛
era: Polish → Distribution Hardening
parent: README.md
---

# PH-PQ-100: 信頼性 — panic 駆逐 + 故障時の自己修復 + heavy soak の客観計測

## 問題

Codex 値踏みが「商用品質に対して最も鋭い指摘」 と評したのは **panic 経路の残存** だった (`PRODUCT_VALUATION_CODEX_2026-05-21.md` §2 / §4)。 「機能の数」 では Arcagate は既に PowerToys Run / Flow を凌ぐ、 しかし「**落ちない**」 という商品の最低条件で B 評価に下がっている。

| Codex 指摘                  | 現状 (本 plan 着手前 fact 確認)                                                        | 商用品質 gap                                              |
| --------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `.unwrap()` 682 件          | grep raw 数字。 `#[cfg(test)]` を除外すると **production 経路は 11 件** (実 verify 済) | test 除外後でも本番 critical path に `expect/unwrap` 残存 |
| crash 時の DB 破損 fallback | `vision.md` C7 release-criteria が FAIL 想定                                           | 実装なし                                                  |
| 1h heavy soak               | C2 (idle 30 min) / C3 (1h heavy) が「user 手動検証」                                   | 自動 fixture なし                                         |
| panic_hook + user dialog    | E1 release-criteria の必須要件                                                         | 実装なし、 silent crash                                   |

「**売れる商品としての信頼性**」 = 「落ちない」 + 「落ちてもデータを失わない」 + 「落ちたら正直に伝える」。 3 つとも今 gap あり。

## スコープ

1. **本番経路 panic 経路ゼロ化** (production code の `.unwrap()` / `.expect()` を `Result` 連鎖へ)
2. **panic_hook + user-visible dialog** (silent crash 禁止、 release-criteria E1)
3. **DB 破損時の自己修復経路** (release-criteria C7)
4. **設定ファイル破損時の自己修復** (release-criteria E3)
5. **soak harness の自動化** (release-criteria C2/C3 の手動検証脱却)
6. **panic-clean を維持する CI gate** (clippy lint で `unwrap_used` 等を `-D` 化、 再発防止)

## やらないこと

- updater pubkey / Authenticode 署名 (別 PR、 README §範囲外)
- telemetry / crash 報告のサーバー実装本体 (PH-465/466 後続、 別 PR)
- test 内 `#[cfg(test)]` 配下の `.unwrap()` (671 件) は維持 (test 簡潔さ優先、 production 経路と区別)
- `arcagate_cli.rs` の `.unwrap()` (1319 LoC 中の CLI binary は配布対象外、 維持)

## 具体タスク

### T1. 本番経路 panic を全件 Result 化 (11 件 → 0 件)

実 grep で確認済の production 経路 panic は以下 4 file 11 件:

| File:line                                              | コード                                                   | 修正方針                                                                          |
| ------------------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src-tauri/src/lib.rs:137`                             | `.expect("failed to resolve app data dir")`              | recoverable error: user 通知 + 再起動推奨 dialog                                  |
| `src-tauri/src/lib.rs:173`                             | `.expect("database path contains non-UTF-8 characters")` | 同上、 default path にフォールバック                                              |
| `src-tauri/src/lib.rs:175`                             | `.expect("failed to initialize database")`               | DB 破損経路 (T3) と統合、 recovery dialog 提示                                    |
| `src-tauri/src/lib.rs:212`                             | `.icon(app.default_window_icon().unwrap().clone())`      | icon 取得失敗時は tray なしで起動継続 (log::warn)                                 |
| `src-tauri/src/lib.rs:368`                             | `.expect("error while running tauri application")`       | run() の戻り値を log + 通常 exit、 panic 化しない                                 |
| `src-tauri/src/services/file_search_state.rs:20,29,39` | `.lock().expect("cancel registry mutex poisoned")`       | poison recovery: `into_inner()` で復旧、 cancel 失敗は warn                       |
| `src-tauri/src/watcher/mod.rs:16,28`                   | `.expect("failed to create (noop) watcher")`             | watcher 失敗時は機能縮退モード (file-watch 機能のみ無効化、 起動継続)             |
| `src-tauri/src/services/opener_service.rs:51`          | `.expect("builtin:explorer must exist")`                 | builtin opener 不在は migration v? で防止可能、 unreachable!() に変えて意図を明示 |

**各修正後に inline test を追加**: 「該当 panic 経路が `Result::Err` を返すこと」 を検証する unit test を `#[cfg(test)]` で書く (foundation §9 migration safety 同様の pin)。

### T2. panic_hook + user-visible dialog (E1)

- `src-tauri/src/lib.rs` の `tauri::Builder::default()` の前段で `std::panic::set_hook(...)` を installation
- panic 時の処理:
  1. `panic_info` を log file (`tauri-plugin-log` の現状経路) へ書く
  2. Tauri がまだ起動していれば `tauri-plugin-dialog` で modal dialog (「予期しないエラー、 再起動してください、 log は <path>」)
  3. abort 前に WAL checkpoint を best-effort で実行 (PRAGMA wal_checkpoint(TRUNCATE))
- 参照: [Catching Panics on Tauri Apps (Aptabase)](https://aptabase.com/blog/catching-panics-on-tauri-apps) の panic_hook + log + dialog の 3 段パターン

### T3. DB 破損時の self-recovery (C7)

- `db::initialize()` (`src-tauri/src/db/mod.rs`) を **2 段オープン** に変更:
  1. `Connection::open(path)` で通常 open
  2. open 失敗 or `PRAGMA integrity_check` が `ok` 以外を返したら:
     - 既存 DB を `arcagate.db.corrupted-<unix_ts>` に rename
     - 新規 DB を作って migration を再走、 default state で起動
     - user 通知 dialog: 「DB が破損していたため backup を <path> に退避、 一部データが失われた可能性あり」
- recovery 経路の test fixture: 0 byte file / 不正 SQLite header / WAL 不整合の 3 種を pre-populate して起動を verify (`#[cfg(test)]` inline)

### T4. 設定ファイル破損時の自己修復 (E3)

- 該当 file: `config_service.rs:178 LoC` の load 経路
- 不正 JSON / schema mismatch を検出したら:
  1. `arcagate.db` に保存している config 系 column は `to_default` で初期化 (in-memory)
  2. user 通知 toast: 「設定の一部が破損していたため default に戻しました」
  3. 重要な setting は backup column へ pre-write しておく (Settings 変更時に 1 generation 古い値も保持)

### T5. soak harness の自動化 (C2 / C3)

`scripts/release-checks/measure-memory-soak.ps1` が存在 (PowerShell soak script、 fact 確認済) が、 「user 手動実行」 前提。 これを **nightly CI** へ統合:

- `scripts/release-checks/measure-memory-soak.ps1` を CI 用に改修:
  - 30 min idle / 1h heavy use の 2 mode を切替えで実行可能に
  - heavy use mode: Library scroll / sort / workspace 切替 / palette open/close を 1h 自動 loop
  - RSS を 1 min 間隔でサンプル、 CSV 出力 → 線形回帰で leak rate (MB/h) を判定
- `.github/workflows/nightly-soak.yml` を新設 (現 3 workflow と独立、 cron `0 18 * * *` JST 03:00):
  - Windows runner で `pnpm tauri build` → 起動 → soak script → leak rate を assert
  - 失敗で GitHub issue を自動 open
- 受け入れ閾値は `vision.md` 既定値: idle 30 min ≤ +10MB / heavy 1h ≤ +50MB

### T6. clippy lint で panic 再発防止

`src-tauri/Cargo.toml` の `[lints.clippy]` セクション (foundation 既存) に:

```toml
[lints.clippy]
unwrap_used = "deny"
expect_used = "warn"
panic = "warn"
```

- `unwrap_used = "deny"`: production code の新規 `.unwrap()` は CI fail
- `expect_used = "warn"`: 既存 12 件は migration test 内、 lint OK
- 個別 `#[allow(clippy::unwrap_used)]` で例外を明示 (test 内 / migration test 内)
- 横展開: 既存 `lefthook.yml` の `clippy: cargo clippy ... -D warnings` step で自動 enforce

## 受け入れ条件

- [ ] `grep -rn "\.unwrap()\|\.expect(" src-tauri/src --include="*.rs" | <filter test/cli> | wc -l` → **0** (production 経路 panic 全廃)
- [ ] T2 panic_hook + dialog: 意図 panic を仕込んだ debug build で起動 → dialog 表示を CDP screenshot で verify
- [ ] T3 DB 破損 recovery: corrupt fixture 3 種で起動 → 全 case で recovery dialog + default state 起動 (inline test pass)
- [ ] T4 config 破損 recovery: corrupt config column を pre-populate → 起動 → toast 通知 + default state (e2e で verify)
- [ ] T5 soak harness: nightly CI が通る、 leak rate idle ≤ +10MB / heavy ≤ +50MB の閾値で fail/pass を機械判定
- [ ] T6 clippy: `cargo clippy -- -D clippy::unwrap_used` が pass、 新規 PR で `.unwrap()` 追加が CI で block されることを実 PR で確認
- [ ] `pnpm verify` 全段 pass を維持

## 工数感

| Task                       | 工数         | 依存       |
| -------------------------- | ------------ | ---------- |
| T1 panic Result 化 (11 件) | 3-4 日       | —          |
| T2 panic_hook + dialog     | 1-2 日       | T1         |
| T3 DB 破損 recovery        | 2-3 日       | T1         |
| T4 config 破損 recovery    | 1 日         | T1         |
| T5 soak harness            | 2-3 日       | — (並行可) |
| T6 clippy lint             | 0.5 日       | T1 完了後  |
| 合計                       | **2-3 週間** |            |

## 依存・着手順

1. **先行**: なし。 本 phase が他 phase の土台になる
2. **後続**: PQ-200 以降の全 phase が本 phase の panic-clean を前提にする
3. **並行可**: PQ-700 i18n (干渉ほぼなし)

## 横展開チェック

- `lessons.md` に「panic-clean は維持する」 を 1 行追記、 再発防止
- T6 clippy lint が「新規 contributor が `.unwrap()` を追加したら CI fail」 を保証 → process 化
- soak harness は将来の memory leak 再発を nightly で検知 → regression test の代替

## 参照

- 値踏み: [PRODUCT_VALUATION_CODEX §2 §4](../../../.claude/worktrees/gracious-leakey-504c9c/docs/l3_phases/audit/PRODUCT_VALUATION_CODEX_2026-05-21.md)
- Release criteria: [`docs/l1_requirements/vision.md`](../../l1_requirements/vision.md) §C2 §C3 §C7 §E1 §E3
- Lessons: [`docs/l2_foundation/lessons.md`](../../l2_foundation/lessons.md) 「verify pass = 治った」 critical rule
- Panic handling 業界事例: [Aptabase Tauri panic patterns](https://aptabase.com/blog/catching-panics-on-tauri-apps) / [Tauri tutorial: Error handling](https://tauritutorials.com/blog/handling-errors-in-tauri)
- Tauri error contract: [foundation.md §IPC 設計](../../l2_foundation/foundation.md) (`{ code, message }`)
