---
id: PH-20260428-493
title: FileSearch Widget — 検索バー sticky + ArrowUp/Down で結果選択
status: todo
batch: 108
era: polish-round2
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/widgets/file-search/FileSearchWidget.svelte
---

# PH-493: FileSearch Widget UX

## 背景

ユーザー dev fb (2026-04-28):

> ファイル検索、検索バーのところまでスクロールバーあるのだめです
> あとここもカーソル上下で検索で出てるファイルかフォルダ選択できるようにしよう

## 受け入れ条件

### (a) 検索バー sticky

- [ ] FileSearchWidget の root を `flex flex-col` + 検索 input を `sticky top-0 z-10 bg-[var(--ag-surface-opaque)]`
- [ ] 結果 list のみが scroll、検索バーは常に top に固定
- [ ] WidgetShell の overflow-y-auto と整合 (PH-487 で fix 済)

### (b) ArrowUp/Down で結果選択 + Enter で起動

- [ ] `selectedIndex = $state(0)`、結果が変わったら 0 reset
- [ ] input focus 時に ArrowDown / ArrowUp でインデックス更新 (clamp 0 to results.length-1)
- [ ] **IME 中は無視**: `e.isComposing` true のとき key handler skip
- [ ] 選択中行を highlight (`bg-[var(--ag-surface-3)]`)
- [ ] Enter で選択行を open (file/folder 起動 = `cmd_open_path` IPC)
- [ ] selected index が viewport 外なら scrollIntoView

### SFDIPOT

- F: ↑↓ で選択、Enter で起動、Esc で blur (既存)
- D: results: Array<Entry>、selectedIndex: number
- I: keyboard handler は input element に bind
- O: IME 中 / focus なし時は skip
- T: keystroke instant、scrollIntoView smooth

## 実装ステップ

1. FileSearchWidget.svelte 現状確認
2. 検索 input を `sticky top-0 z-10` 化、background = surface-opaque
3. selectedIndex state + ArrowUp/Down keydown handler (`e.isComposing` check)
4. 選択行 highlight class + scrollIntoView
5. Enter で `cmd_open_path` invoke
6. E2E: input focus → ↓→↓→ Enter で選択 entry 起動

## 規約参照

- ux_standards.md (keyboard navigation 必須)
- HICCUPPS [User] palette 同等の keyboard UX
- lessons.md (IME composition 中の key handler skip パターン)
