---
id: PH-20260429-500
title: WatchFolder Widget — 名前+アイコン被り解消 + はみ出し / layout 整理
status: done
batch: 109
era: per-widget-polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte
  - src/lib/widgets/exe-folder/index.ts (icon AppWindow)
  - tests/e2e/exefolder-polish.spec.ts (new spec)
  - tests/e2e/exefolder-watchpath-reset.spec.ts (UI string update + widget_type fix)
---

# PH-500: WatchFolder Widget — 名前+アイコン被り解消 + はみ出し / layout 整理

## 背景

ユーザー dev fb (2026-04-28、検収項目 #21):

> ウォッチフォルダの名前とアイコン被ってるのもやだね。あとはみ出るしアイコン

batch-108 PH-490 (path reset) + PH-492 (race fix) は完了したが、**layout の polish は未着手**。本 plan で完成。

## 受け入れ条件

- [x] **header layout fix**: WidgetShell の `flex min-w-0 + gap-2 + truncate` で title 安全 truncate 確認済 (PH-489)
- [x] **アイコン changes**: header / file row の icon を `Folder` → `AppWindow` に変更
  - widget meta (`src/lib/widgets/exe-folder/index.ts`) も `AppWindow`
  - 個別 EXE item の row icon も AppWindow (起動可能 = アプリの意味)
- [x] **file row 整理**: `icon (shrink-0 h-4 w-4) + name (flex-1 truncate min-w-0) + count badge (shrink-0)`
- [x] **空 state UI**: path 未設定時に centered button「監視フォルダを設定」(押下で settings dialog)
- [x] **scan 中 loading state**: AppWindow icon に `animate-pulse` (Reduced Motion 対応 `motion-reduce:animate-none`)
- [x] **error state**: 「スキャン失敗」+ error 詳細 + 「再試行」button (retryNonce で effect 再実行)
- [x] **S/M/L responsive**: container query で `<= 200px` で count badge 隠す
- [x] **横/縦スクロールバー出ない** (WidgetShell の overflow-x:hidden + overflow-y:auto + scrollbar-gutter:stable 既存)
- [x] **keyboard ナビ**: ul に tabindex=0、ArrowUp/Down で selectedIndex 移動、Enter で起動、Escape で popover close、IME 無視 (e.isComposing)
- [x] **reactive**: path 変更 → 即時 entries reset (PH-490 既存挙動 keep)
- [x] **E2E**: `tests/e2e/exefolder-polish.spec.ts` で空 state button + settings dialog open assert
- [ ] **before/after スクショ取得** (CDP 自己検証は次 batch、auto-merge 後 main で確認)

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
