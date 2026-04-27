---
id: PH-20260428-490
title: WatchFolder 監視先変更で内容リセット + 名前+アイコン重なり/はみ出し fix
status: todo
batch: 108
era: polish-round2
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte
  - src/lib/widgets/exe-folder/ExeFolderSettings.svelte
---

# PH-490: WatchFolder Widget 修正

## 背景

ユーザー dev fb (2026-04-28):

> ウォッチフォルダーとかみるフォルダ変えたら中身リセットしてほしい
> ウォッチフォルダの名前とアイコン被ってるのもやだね。あとはみ出るしアイコン

## 受け入れ条件

- [ ] **監視先変更で内容リセット**: settings dialog で path 変更 → 旧 file list 即時クリア + 新 path で再 scan
  - 現状: 旧 cache が残って混在表示
  - fix: config 変更時 `$effect` で `entries = []` reset + `loadEntries(newPath)` 呼び直し
- [ ] **名前+アイコン重なり**: file row の icon (左) と name (右) を `flex items-center gap-2` で確実に分離、`min-w-0` + name `truncate`
- [ ] **アイコンはみ出し**: icon `h-4 w-4 shrink-0` で固定、container `overflow-hidden`
- [ ] **長い filename**: `truncate` + `title=` (tooltip)
- [ ] container query で responsive (S サイズで file数 limit、icon hide option)

### SFDIPOT

- F: path 変更 → 即時 reset + 再 fetch
- D: ExeFolderConfig: `{ folder_path: string, max_items?: number }`、変更検知は config の hash or pathstring
- T: scan IPC で 100ms 程度、loading state 表示

## 実装ステップ

1. ExeFolderWatchWidget.svelte の `$derived(parseConfig)` に `path` 抽出
2. `$effect(() => { const p = config.folder_path; if (p !== lastPath) { entries = []; loadEntries(p); } })`
3. file row の DOM を `<div class="flex items-center gap-2 min-w-0"><Icon class="shrink-0 h-4 w-4" /><span class="flex-1 truncate" title={name}>{name}</span></div>` に
4. WidgetShell の overflow-x: hidden (PH-487 で済) と整合

## 規約参照

- 「アイコン+ラベルの整合性」(CLAUDE.md): icon と filename はちゃんと分離
- HICCUPPS [User] 監視先変更 → 即時反映
