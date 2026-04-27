---
id: PH-20260428-486
title: Widget 削除ボタンを少し目立たせる
status: done
batch: 108
pr: 189
merged_at: 2026-04-27T16:39:54Z
era: polish-round2
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src/lib/components/arcagate/workspace/WidgetHandles.svelte
---

# PH-486: Widget 削除ボタンを少し目立たせる

## 背景

ユーザー dev fb (2026-04-28):

> 削除ボタンいい感じだけどもう少しだけ目立たせないか？

PH-472 で実装した floating × button (右上 -top-3 -right-3、bg surface + border、hover で destructive)
は概ね良いが、デフォルト状態のコントラスト不足で「削除可能」が直感的に分かりにくい。

## 受け入れ条件

- [ ] **デフォルト bg を destructive に**: `bg-[var(--ag-surface)]` → `bg-destructive/85` (常に赤系、白文字)
- [ ] **hover で更に強調**: `hover:bg-destructive hover:scale-110` (現状の transition 維持)
- [ ] **サイズ微増**: 24px → 26-28px square (視認性向上、隣接 widget との衝突なし維持)
- [ ] **focus visible 強化**: focus 時 ring 2px destructive 追加
- [ ] 既存「選択時のみ表示」(PH-472) ロジック不変

### 横展開チェック

- [ ] 他の close button (Settings dialog ✕、palette ✕) との視覚整合 — destructive 度合は widget 削除のみ強調 (close は中立色維持)

### SFDIPOT

- **F**unction: 削除トリガ動作不変、見た目強化のみ
- **I**nterface: WidgetHandles.svelte の delete button class 変更
- **O**perations: hover/focus/active 全 state で目立つ

## 実装ステップ

1. WidgetHandles.svelte の delete button class を `bg-destructive/85 text-white border-destructive` に
2. hover で `hover:bg-destructive hover:scale-110`
3. size を `h-6 w-6` → `h-7 w-7`、icon を `h-3.5 w-3.5` → `h-4 w-4`
4. E2E は既存 `getByRole('button', { name: 'ウィジェットを削除' })` で動作確認

## 規約参照

- ux_standards.md (色強調基準)
- HICCUPPS [User] 「削除可能」が一目で分かる
