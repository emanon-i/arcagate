# Library 画面 網羅的調査 — TOP / Index

**Status**: investigation only / 実装は STOP
**Scope**: Library 画面全体の UX overhaul、bug fix + 基礎 UX + 機能追加 の 3 段階を視野
**Date**: 2026-05-05
**Related**: workspace-canvas-rewrite (Phase 1 / 1.1) と同様の段階的 overhaul を Library にも適用

## 0. ゴール

Workspace は Phase 1 / 1.1 で抜本書き直し済 (PR #282 / #283)。
**Library は bug fix のみで UX 設計してきていない自覚あり** (user 認識)。
Workspace と同レベルで全面的に直す。

## 1. user 認識の既知 issue

| #    | 内容                                                                                           |
| ---- | ---------------------------------------------------------------------------------------------- |
| I1   | EXE 監視 widget からの起動が「最近起動」widget に記録されない                                  |
| I2   | ItemWidget でアイテム追加できない (クラッシュ系)                                               |
| I3   | 大量 item で重い (`cmd_extract_item_icon` 同期 IPC、Lessons.md C-2、69+ Game カードでブロック) |
| 認識 | bug fix だけで UX 設計してきてない、Workspace と同じく徹底的に直したい                         |

## 2. 文書構成 (本 file 含め 8 file 以下、各 200 行以内)

| File                                                   | 内容                                                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **investigation.md** (本 file)                         | TOP / Index / 要点サマリ                                                                                     |
| [inventory-1-files.md](./inventory-1-files.md)         | UI components / store / IPC / DB schema 全 inventory                                                         |
| [inventory-2-data-flow.md](./inventory-2-data-flow.md) | data flow / cross-screen integration / routing                                                               |
| [known-issues.md](./known-issues.md)                   | I1 / I2 / I3 + その他クラッシュの root cause trace                                                           |
| [ux-gaps.md](./ux-gaps.md)                             | add/edit/delete/sort/filter/search/empty/keyboard/icon/grouping/bulk/virtualization/persistence の現状と gap |
| [industry-comparison.md](./industry-comparison.md)     | Steam / Raycast / Alfred / Spotlight / Setapp / Notion / Windows 11 / Playnite との比較                      |
| [phase-plan.md](./phase-plan.md)                       | Phase L1 (bug fix) / L2 (基礎 UX) / L3 (機能追加) の段階的 plan                                              |
| [decisions.md](./decisions.md)                         | user decision needed な分岐点一覧                                                                            |

## 3. 要点サマリ (各 doc から抽出)

### 3.1 inventory (file 1-2)

- **Library UI 主要 8 component**: LibraryLayout / LibrarySidebar / LibraryMainArea / LibraryCard / LibraryDetailPanel / LibraryItemTagSection / ItemFormDialog / ItemForm
- **store**: `items.svelte.ts` (1 store で items / tags / libraryStats / tagWithCounts / tagItems)
- **IPC**: 25 件 commands (item CRUD / tag / bulk / registration / metadata / extract icon)
- **DB**: 8 table (items / tags / item_tags / launch_log / item_stats / watched_paths / widget_item_settings / openers)
- **routing**: `/+page.svelte` で activeView=library/workspace tab 切替、Library 専用 route なし

### 3.2 known issues (file 3)

- **I1** root cause: ExeFolderWatchWidget の `launchEntry` が `cmd_open_path` (DB 通らず) → 起動 record されない。FileSearchWidget も同じ pattern
- **I2** root cause: 要 dev 再現。仮説 = picker 経由の config 反映タイミング / 空 Library での挙動
- **I3** root cause: LibraryCard が item ごとに `cmd_get_item_metadata` を $effect で並列 fetch、69 cards = 69 IPC + Mutex<Connection> 競合 + filesystem IO + sync icon extract

### 3.3 UX gaps (file 5)

- **重大**: bulk operations が「全選択 + bulk star / bulk delete」しかない (任意組合せ tag 一括付与 / 一括移動 等が欠落)
- **欠落**: keyboard navigation 不完全 (矢印で card 間移動なし、Enter で起動なし)
- **欠落**: 大量 item virtualization なし
- **欠落**: 検索が prefix/substring のみ、fuzzy / 日本語かな-カナ揺れ未対応
- **欠落**: filter 状態が保存されない (リロード後リセット)
- **欠落**: undo (削除取消) なし

### 3.4 industry comparison (file 6)

- **subagent 調査中**、完成後追記

### 3.5 phase plan (file 7)

- **L1 (bug fix、~1-2 PR)**: I1 / I2 / I3 + その他クラッシュ。スコープ最小、test 重点。
- **L2 (基礎 UX、~3-5 PR)**: keyboard navigation / undo / filter persistence / 検索強化 / empty state 改善。
- **L3 (機能追加、~3-5 PR)**: virtualization / 高度 bulk ops / icon cache / dynamic collection / grouping。

### 3.6 user decision points (file 8)

- D1: Library と Workspace の カード共有 (LibraryCard 共通) vs 独立
- D2: icon cache location (DB BLOB / filesystem dir)
- D3: launcher UX 方向 (Steam-grid 寄り / Raycast-keyboard 寄り)
- D4: I3 の解決方法 (batch IPC / memory cache / spawn_blocking / 全部)
- D5: virtualization library 採用 vs 自作

## 4. 進行方針

1. 本投稿 (file 8 揃い) を user 共有
2. user が D1-D5 + L1/L2/L3 の優先順位を decide
3. Phase L1 から着手 (workspace-canvas-rewrite と同じ段階的 plan/実装/検収)

## 5. ルール再確認 (調査時)

- 1 file 200 行以内
- 「DOM 存在 = 治った」判定禁止
- 調査だけで止める、Plan / 実装に入らない
- 不明点は「user decision needed」として明示
