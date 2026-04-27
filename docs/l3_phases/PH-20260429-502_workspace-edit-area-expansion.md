---
id: PH-20260429-502
title: Workspace 表示領域 — 常時 viewport-fill (PH-503 統合 / sidebar 折り畳み トグル化)
status: todo
batch: 109
era: per-widget-polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
  - src/lib/components/arcagate/AppShell.svelte (sidebar collapse トグル)
  - src/lib/components/arcagate/AppHeader.svelte (TitleBar 最小化検討)
  - src/lib/state/app-shell.svelte.ts (新規 or 既存、sidebar collapse state)
---

# PH-502: Workspace 表示領域 — 常時 viewport-fill (sidebar トグル化)

## 背景

ユーザー dev fb (2026-04-28、検収項目 #26):

> ウィジット編集時にもっと表示領域広げてくれもっっっとでかくていい

ユーザー追加 dev fb (2026-04-28、Workspace 大幅簡素化宣言):

> 正直Obsidian Canvasのほぼコピーでいいと思う。

→ **編集モード撤廃** (PH-503 で実装) により「編集時の sidebar 折りたたみ」概念は消滅。
本 plan は **常時 viewport-fill + sidebar collapse をユーザー操作可能なトグル化** に scope 縮小。

## 受け入れ条件

- [ ] **Workspace canvas が常時 viewport-fill** (sidebar / TitleBar の領域を除いた全空間を占有)
- [ ] **LibrarySidebar / SettingsPanel に collapse トグルボタン** 追加 (現状もあれば polish、無ければ新規)
  - 折り畳んだ状態は per-app 永続化 (localStorage or config)
  - キーボードショートカット: `Ctrl+B` (VS Code 慣習) で sidebar toggle
- [ ] **TitleBar 最小化トグル** (オプション): keyboard `Ctrl+Shift+B` で TitleBar hide/show
- [ ] **collapse animation**: 200ms ease-out、Reduced Motion 時 snap
- [ ] **canvas はフレーム外まで広がる風** (PH-503 dotted grid + 端 fade)
- [ ] **Esc キーで sidebar 復元** (オプション)
- [ ] E2E: sidebar toggle → workspace 領域変化 assert
- [ ] before/after スクショ取得

## 撤廃される要素 (PH-503 で対応)

- ❌ 編集モード時の自動 sidebar 折りたたみ (編集モード撤廃)
- ❌ 編集モード解除での自動復元
- ❌ 編集モード中の operation pill (常時編集なので不要)

## 実装ステップ

1. AppShell の sidebar collapse state 整理 (新規 store or 既存活用)
2. sidebar collapse トグルボタン追加 (各 sidebar header に)
3. キーボードショートカット (Ctrl+B / Ctrl+Shift+B)
4. WorkspaceLayout を viewport-fill に固定 (常時 h-full w-full)
5. collapse animation (CSS transition + Reduced Motion 配慮)
6. localStorage 永続化
7. E2E spec
8. before/after スクショ

## 規約参照

- ux_standards.md (Reduced Motion, sidebar 操作)
- engineering-principles §6 SFDIPOT (Operations: sidebar toggle UX、Time: 200ms)
- VS Code / Obsidian の sidebar 慣習
- PH-503 と整合 (編集モード撤廃)
