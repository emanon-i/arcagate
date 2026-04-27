---
id: PH-20260428-488
title: Industrial Pill Button + L-Bracket + Orange Diamond Marker
status: todo
batch: 108
era: design-overhaul
parent_l1: REQ-007_visual-language
scope_files:
  - src/lib/components/ui/button/button.svelte (variant 拡張)
  - src/lib/components/industrial/LBracket.svelte (new)
  - src/lib/components/industrial/DiamondMarker.svelte (new)
  - src/lib/components/industrial/PillButton.svelte (new)
---

# PH-488: Pill Button + L-Bracket + Orange Diamond Marker

## 背景

仕様: `industrial-yellow-spec.md` 中核モチーフ §5, §6, §7。

3 種の Industrial Yellow 固有 UI element を component 化:

1. **ピル型物理ボタン** — フラット禁止、工業機械の押しボタン (border + 厚影 + 内ハイライト)
2. **L 字ブラケット** — 選択中フォーカス枠 (4 隅 L 字)
3. **オレンジ菱形マーカー** — 通知・注目バッジ (FF7A00 菱形)

## 受け入れ条件

### 機能

- [ ] **PillButton**: `<PillButton variant="primary|secondary" size="md|lg">` で `endfield-pill-button` style + 中央 hairline + 右端 round icon
- [ ] **LBracket**: `<LBracket size="sm|md|lg">` で 4 隅に L 字描画 (SVG 4 個 absolute positioned)、親 relative 必須
- [ ] **DiamondMarker**: `<DiamondMarker variant="orange|red" />` で 8×8px の菱形 (transform rotate 45deg + bg)、a11y label 付き
- [ ] **既存 button variant 拡張**: shadcn Button に `variant="industrial"` を追加、PillButton と統合可能 (もしくは独立 component で OK)
- [ ] **theme-agnostic**: Industrial Yellow theme 以外でも使えるが、推奨は Industrial Yellow 時のみ

### 横展開チェック

- [ ] 既存 button (shadcn Button、PH-472 WidgetHandles の × button 等) との衝突なし
- [ ] PH-477 Undo/Redo の HelpPanel 等で PillButton 流用検討 (今回 scope 外、PH-493 で横展開)
- [ ] L 字ブラケットは PH-472 selection ring と排他 (Industrial Yellow theme では L bracket、Light/Dark では ring)

### SFDIPOT

- **F**unction: PillButton click → onclick fire / LBracket は visual のみ / DiamondMarker は visual + aria-label
- **D**ata: variant prop で style 切替、children snippet で content
- **I**nterface: Svelte 5 Component の `$props()` 標準
- **P**latform: SVG + CSS、WebView2 OK
- **O**perations: click / hover / focus / disabled state 対応

### HICCUPPS

- [Image] Arknights:Endfield の工業 UI element 直訳
- [Comparable] Material Design FAB / Apple HIG segmented control とは別系統
- [Consistency] CLAUDE.md「アイコン+ラベル」原則: PillButton ラベルは「実行」「保存」等、機能名

## 実装ステップ

1. `src/lib/components/industrial/` フォルダ新設
2. `PillButton.svelte` を spec の `.endfield-pill-button` CSS で実装 (44px height、180px min-width、border 2px、box-shadow)
3. `LBracket.svelte` を 4 隅 SVG (12px L 字、stroke 2px、color: var(--ag-primary))
4. `DiamondMarker.svelte` を 8×8 div + transform rotate 45 + bg (FF7A00)
5. shadcn Button に variant 追加: `industrial-pill` で PillButton と同等 style (or 別 component)
6. unit test (vitest) で render + a11y label 検証
7. PH-491 ホーム画面、PH-493 横展開で実利用

## 規約参照

- `industrial-yellow-spec.md` 中核モチーフ §5-7
- CLAUDE.md「ラベルは機能/状態/アクション」 (PillButton ラベル指針)
- shadcn-svelte の手動編集禁止 → 既存 button.svelte 触らず industrial 配下に新規作成

## 参考

- src/lib/components/ui/button/button.svelte (shadcn variant 構造)
- WidgetHandles.svelte (PH-472、× button 実装パターン)
