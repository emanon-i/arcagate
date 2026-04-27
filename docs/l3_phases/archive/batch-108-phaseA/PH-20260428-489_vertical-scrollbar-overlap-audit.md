---
id: PH-20260428-489
title: 全 layout で縦スクロールバー被り audit + 修正
status: done
batch: 108
pr: 193
merged_at: 2026-04-27T16:48:59Z
era: polish-round2
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/components/arcagate/common/WidgetShell.svelte
  - src/lib/components/arcagate/library/LibraryMainArea.svelte
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
  - src/app.css
---

# PH-489: 縦スクロールバー被り audit + 修正

## 背景

ユーザー dev fb (2026-04-28):

> あと全体的に縦スクロールバーが被っててヤダ

content の横幅が container 幅一杯まで描画されると、scrollbar (6px) が content 上に被る。
`scrollbar-gutter: stable` で gutter 確保するが、適用漏れの場所がある。

## 受け入れ条件

- [ ] **`scrollbar-gutter: stable`** を全 scroll container に適用 (WidgetShell / LibraryMainArea / WorkspaceLayout / SettingsPanel / palette)
- [ ] **`scrollbar-width: thin` (or 既存 6px) を維持**、占有領域 stable
- [ ] **content の右端 padding/margin** で scrollbar 被り回避 (gutter なしの場合)
- [ ] **audit script** `scripts/audit-scrollbar-gutter.sh` (new): `overflow-y: auto/scroll` を持つ要素で `scrollbar-gutter` が無いものを警告
- [ ] CI / lefthook 統合

### 横展開チェック

- [ ] PH-487 の overflow-x: hidden 対応 (WidgetShell) と整合
- [ ] palette / Settings dialog でも適用

### SFDIPOT

- F: scrollbar 表示時も content が左にずれない (layout shift 排除)
- D: CSS のみ
- O: 通常 / scroll 中 / hover 中で gutter 一定

## 実装ステップ

1. global app.css の `::-webkit-scrollbar` 周りに `scrollbar-gutter: stable` 追加 (or 各 container 個別)
2. WidgetShell, LibraryMainArea, WorkspaceLayout, palette container 各々に `[scrollbar-gutter:stable]` Tailwind utility 適用
3. audit script で漏れ検出
4. lefthook + CI 統合

## 規約参照

- ux_standards.md (no layout shift)
