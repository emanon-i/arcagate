---
id: PH-20260422-097
title: ディスパッチ状態整合性修復（branch 戦略改訂 + l3_phases クリーンアップ）
status: done
batch: reconcile
priority: critical
created: 2026-04-22
parallel_safe: false
scope_files:
  - docs/dispatch-operation.md
  - docs/dispatch-log.md
  - docs/l3_phases/
---

## 背景/目的

バッチ 16 以降のセッションが `dispatch-operation.md §4` の「develop ベース運用」に反して
`feature/batch-*` ブランチを main から切り、main を PR base として squash/rebase merge した。
その結果:

1. `origin/main` が batch-20 (PH-092〜096) まで進んでいる
2. `origin/develop` が batch-15 止まりで stale
3. `docs/l3_phases/` に実装済みの Plan が `status: wip` のまま残存
4. PH-090/091 の Plan ファイルが存在しないまま batch-19 がマージされた

本 Plan で上記をすべて解消し、今後は **main ベース運用** を正式採用する。

## 制約

- main へ直接 push / force push は禁止。PR 経由 merge のみ
- dispatch-operation.md §5 暴走ブレーキは引き続き有効
- `src/lib/components/ui/` 手動編集禁止

## 実装ステップ

### Step 1: l3_phases/ 残存 wip を整理

1. PH-088/089: archive に既にある → l3_phases/ 側を削除
2. PH-092〜096: status を `done` に書き換えて archive に移動
3. PH-090/091: 事後 Plan ファイルを archive に作成（batch-19 の実作業を記録）

### Step 2: dispatch-operation.md §4 改訂

「develop ベース運用」→「main ベース運用」に書き換え。
旧記述は「2026-04-22 以前の旧運用」として注記して残す。

### Step 3: dispatch-log.md 追記

バッチ 18/19/20 の完了エントリを追加（PR base が main だった旨を注記）。

## 受け入れ条件

- [ ] `docs/l3_phases/` 直下に wip / todo が残っていないこと
- [ ] `docs/l3_phases/archive/` に PH-086〜096 が全て揃っていること
- [ ] PH-090/091 の事後 Plan ファイルが archive に存在すること
- [ ] `dispatch-operation.md §4` が main ベース運用の内容になっていること
- [ ] `dispatch-log.md` にバッチ 18/19/20 完了エントリが存在すること
- [ ] `pnpm verify` が全通過すること
