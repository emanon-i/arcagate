---
id: PH-20260429-500
title: WatchFolder Widget — 名前+アイコン被り解消 + はみ出し / layout 整理
status: wip
batch: 109
era: per-widget-polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte
  - src/lib/widgets/exe-folder/index.ts
  - tests/e2e/exefolder-polish.spec.ts (new)
  - tests/e2e/exefolder-watchpath-reset.spec.ts (typo fix)
---

# PH-500: WatchFolder Widget — 名前+アイコン被り解消 + はみ出し / layout 整理

## 背景

ユーザー dev fb (2026-04-28、検収項目 #21):

> ウォッチフォルダの名前とアイコン被ってるのもやだね。あとはみ出るしアイコン

batch-108 PH-490 (path reset) + PH-492 (race fix) は完了したが、**layout の polish は未着手**。本 plan で完成。

## 受け入れ条件

- [ ] **header layout fix**: widget タイトルとアイコン (現状重なってる) を 適切な spacing + flex layout で並べる
- [ ] **アイコン changes**: header / file row の icon を `Folder` → `AppWindow` に変更 (検収項目 #36 統合、PH-501 旧 plan に書かれてた内容)
  - widget meta (`src/lib/widgets/exe-folder/index.ts`) も `AppWindow`
  - 個別 EXE item の row icon も同様
- [ ] **file row 整理**: `icon (shrink-0 h-4 w-4) + name (flex-1 truncate min-w-0) + 余白`、name のはみ出し禁止
- [ ] **空 state UI**: path 未設定時に「監視フォルダを選択してください」ボタン (centered)
- [ ] **scan 中 loading state**: 監視中アニメ (subtle pulse)
- [ ] **error state**: path 不在 / 権限なしでエラーメッセージ + retry ボタン
- [ ] **S/M/L responsive**: container query で size 別の row 表示 (S: icon のみ / M: icon+name / L: icon+name+詳細)
- [ ] **横/縦スクロールバー出ない** (overflow-x: hidden + overflow-y: auto + scrollbar-gutter: stable)
- [ ] keyboard ナビ: ArrowUp/Down で row 選択、Enter で起動 (FileSearch と同 UX、PH-493 と整合)
- [ ] reactive: path 変更 → 即時 entries 更新 (PH-490 既存挙動 keep)
- [ ] E2E: watch path 設定 → entries 表示 → row 選択 → Enter で起動 → row layout はみ出しなし assert
- [ ] before/after スクショ取得

## 実装ステップ

1. ExeFolderWatchWidget.svelte 全 layout 再構築 (header / list / empty / loading / error)
2. icon 変更 (Folder → AppWindow) を全 path に
3. container query 追加 (S/M/L 切替)
4. keyboard ナビ追加
5. E2E spec 追加
6. before/after スクショ取得

## 規約参照

- ux_standards.md (responsive, keyboard nav)
- engineering-principles §6 SFDIPOT
- batch-108 PH-490/PH-492 の延長
