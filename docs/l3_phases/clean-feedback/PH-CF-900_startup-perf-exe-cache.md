---
id: PH-CF-900
status: planning
batch: clean-feedback
type: 性能改善
era: Distribution Hardening
parent: README.md
---

# PH-CF-900: 起動 perf — exe scan キャッシュ

## 元 user fb (検収項目)

- **A1**: 起動が遅い (`cmd_scan_exe_folders` のコールドが約 10.4 秒で主因)。 release exe で速くなるかも含め要計測

## 問題

EXE フォルダ監視 widget の scan がコールド時に秒級 (~10.4s) かかり、 体感の遅さの主因とされている。 ただし調査の結果、 **「起動シーケンスをブロックしている」 のは誤り** — root cause はキャッシュ不在による毎回 cold walk。

## 引用元 guideline doc

| Doc                                                            | Section                              | 採用判断への寄与                     |
| -------------------------------------------------------------- | ------------------------------------ | ------------------------------------ |
| `docs/l1_requirements/vision.md`                               | D1-D9 性能予算                       | 起動 P95 / scan 予算                 |
| `docs/l2_foundation/features/backend/exe-scanner.md`           | scan                                 | キャッシュ契約                       |
| `docs/l3_phases/audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md` | W-2                                  | 同指摘の既存 audit                   |
| `CLAUDE.md`                                                    | `feedback_perf_audit_before_measure` | 計測は実 DB / 実 target / 実 disk で |

## Fact 確認 (root cause)

### `cmd_scan_exe_folders` は起動シーケンスに含まれていない

- `cmd_scan_exe_folders` の唯一の呼び出し元は `ExeFolderWatchWidget.svelte:170` の `$effect`。 `lib.rs` setup には scan 呼び出しは無い (`lib.rs:111-353` は plugin / DB / watcher / hotkey / tray のみ)
- この `$effect` (`ExeFolderWatchWidget.svelte:153-204`) は widget が mount され `config.watch_path` 設定済の時のみ発火。 起動直後は `+page.svelte:38` で `activeView` が default `'library'` のため WorkspaceLayout は mount されない → **前回 Workspace タブを開いていた user のみ** 起動直後に scan が走る
- scan 自体は `exe_scanner_commands.rs:21` で `spawn_blocking` に逃がし済 (W-2/W-3 対処済)、 cancel token 付き。 main thread / event loop はブロックしない

### なぜ ~10.4s か

`exe_scanner_service.rs:64-169` の `walk()` は depth 1-3 の同期再帰 fs walk。 各 entry で `entry.metadata()` (`:85`)、 各 exe フォルダで `fs::metadata(dir)` (`:146`)。 **結果のキャッシュが一切無い** — DB 保存もメモリキャッシュも無く、 widget mount のたび毎回 cold walk。 Windows Defender のディレクトリ走査経路を踏むためコールド時は秒級 (audit W-2 が同指摘)。

### release vs dev

fs walk は I/O bound のため **release ビルドでも scan 自体は劇的には速くならない**。 debug → release で速くなるのは起動シーケンス側 (Rust コード最適化) であって scan の disk I/O ではない。 計測は release binary + 実 disk で行う必要がある (`feedback_perf_audit_before_measure`)。

## スコープ

- exe scan 結果をキャッシュし、 widget mount 時の毎回 cold walk を撤廃
- キャッシュ即表示 → background 差分 re-scan
- A1 の絶対値を release binary で計測し、 perf 予算を CI gate 化

## やらないこと

- exe scanner の検出ロジック再設計 — PH-CF-400 (本 PH は **400 で再設計済の scanner にキャッシュを載せる**)
- 起動シーケンス全体の最適化 — A1 の root cause はキャッシュ不在であり起動ブロックではない
- 他 widget の chrome / 設定 — PH-CF-500

## 具体タスク

1. **キャッシュ層の設計**: PH-CF-400 で再設計した scan の出力 (第1階層フォルダ単位 entry) を DB に persist する。 新テーブルか `watched_paths` 関連に格納。 cache key = watch_path + extensions + scan_depth
2. **mount 時の即表示**: `ExeFolderWatchWidget.svelte` の `$effect` を「キャッシュがあれば即表示 → background で差分 re-scan → 差分があれば更新」 へ。 cold walk を UI 経路から外す
3. **キャッシュ無効化**: watch_path / extensions / scan_depth 変更時、 および watcher がファイル変更を検知した時にキャッシュを invalidate
4. **release 計測**: A1 を release binary + 実 disk で計測。 cold / warm の内訳を取り、 perf-budgets doc に記録
5. **perf 予算の CI gate**: exe scan の cold / warm P95 を `tests/perf/` に予算化し CI hard gate へ

## 受け入れ条件 (機械検出)

- [ ] perf test: 2 回目以降の widget mount で scan がキャッシュヒットし、 cold walk が走らない (mount → first paint が cold の数分の 1)
- [ ] perf test: exe scan cold / warm の P95 が予算内 (予算値は release 計測後に確定し doc 化)
- [ ] CI: exe scan perf 予算が hard gate として実行される
- [ ] unit: cache key (watch_path + extensions + scan_depth) が変わるとキャッシュが invalidate される

## 機能契約の追記

`features/backend/exe-scanner.md`:

> **scan キャッシュ契約**: exe scan の結果は DB にキャッシュする。 widget mount 時はキャッシュを即表示し、 cold walk を UI 経路でブロックしない。 background で差分 re-scan し、 差分があれば更新する。 キャッシュは watch_path / extensions / scan_depth / watcher 検知のファイル変更で invalidate する。
>
> **perf 予算契約**: exe scan の cold / warm P95 は perf 予算を持ち、 CI hard gate で計測する。 計測は release binary + 実 disk で行う。

機械検出: 上記 perf test を CI hard gate に。

## 横展開

調査で判明した同型の「キャッシュ無し cold walk + sync 再帰」 を A1 と同じ方式で audit:

- `cmd_list_files` (File Search、 `file_search_commands.rs:12`)
- `cmd_scan_script_folder` (`script_commands.rs:11`)
- `cmd_auto_register_folder_items` (`item_service.rs:316` — audit W-9 で DB lock 保持中 walk も指摘)

これらもキャッシュ無し。 前回 Workspace 表示 user で複数 watch widget があれば mount 時に並列 walk。 本 PH では exe scan を確実にキャッシュ化し、 残りは doc に TODO として記録 (別 PR)。

## 工数感

| Task                               | 工数   |
| ---------------------------------- | ------ |
| キャッシュ層設計 + 実装            | 3-4 日 |
| mount 即表示 + background re-scan  | 2 日   |
| invalidation                       | 1 日   |
| release 計測 + perf 予算 + CI gate | 1-2 日 |

合計: 約 1.5 週間。

## 依存・着手順

- **先行**: PH-CF-400 (再設計後の scanner にキャッシュを載せる。 旧 scanner にキャッシュを載せると 400 で作り直しになる)
- **後続**: なし

## 参照

- `src-tauri/src/services/exe_scanner_service.rs:64-169` (`walk`)、 `:85, 146` (metadata)
- `src-tauri/src/commands/exe_scanner_commands.rs:21`
- `src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte:153-204` (`$effect`)
- `src/routes/+page.svelte:38` (`activeView` default)
- `docs/l3_phases/audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md` (W-2 / W-9)
