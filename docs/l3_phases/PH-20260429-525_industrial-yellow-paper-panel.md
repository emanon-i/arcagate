---
id: PH-20260429-525
title: White Industrial Paper Panel Components (Card 系拡張)
status: todo
batch: 111
era: design-overhaul
parent_l1: REQ-007_visual-language
scope_files:
  - src/lib/components/industrial/PaperPanel.svelte (new)
  - src/lib/components/industrial/PaperHeader.svelte (new)
  - src/lib/components/industrial/PaperRow.svelte (new)
---

# PH-489: White Industrial Paper Panel Components

## 背景

仕様: `industrial-yellow-spec.md` UI 要素別「白パネル」+ レイアウト・構図。

**白い技術資料・管理票・カード**を Industrial Yellow theme の主要パネルとして配置。
黒地の上に白い技術資料パネルを浮かせ、蛍光黄ハイライトでセクション区切り・選択を強調。
仕様の禁忌「黒パネルだらけ」回避のため、Industrial Yellow theme では白パネル併用必須。

## 受け入れ条件

### 機能

- [ ] **PaperPanel**: `<PaperPanel><snippet header /><snippet body /></PaperPanel>` で 白地カード (`bg-[var(--ag-paper)]` 角少し丸 4-8px、上端に黒細罫線、右上に小さなドットフェード装飾)
- [ ] **PaperHeader**: パネル上端の黒帯 + 白文字タイトル + 右端に菱形マーカー or chip
- [ ] **PaperRow**: パネル内の行 (label : value 構造、border-bottom 細罫線)
- [ ] **完全角丸禁止**: `--ag-radius-card` を Industrial Yellow theme 時に 4px に上書き (PH-486 で token 切替)
- [ ] **dot-fade 角装飾**: 各 paper panel の右下 / 右上に PH-487 utility `endfield-dot-fade` を sub-element で適用
- [ ] **theme-agnostic but optimal in Industrial Yellow**: Light/Dark でも render 可能、視覚最適は Industrial Yellow

### 横展開チェック

- [ ] 既存 shadcn Card と独立 (industrial 配下に分離)
- [ ] PH-474 LibraryItemPicker / WidgetSettingsDialog 等で paper panel 採用検討 (PH-493)
- [ ] WidgetShell (PH-475) と style 統合: Industrial Yellow theme 時は WidgetShell も白 paper 化 (PH-493)

### SFDIPOT

- **F**unction: snippet で header/body content、style は theme で自動切替
- **D**ata: props は title? children のみ (シンプル)
- **I**nterface: Svelte 5 snippet ベース
- **P**latform: WebView2 で CSS gradient + radial gradient OK
- **T**ime: paint cost 軽微

### HICCUPPS

- [Image] 仕様の「白い技術資料・管理票」モチーフ直訳
- [Comparable] Notion / Linear の白カードと差別化 (黒帯 + dot-fade)

## 実装ステップ

1. `src/lib/components/industrial/PaperPanel.svelte`: ルート div (`bg-[var(--ag-paper)] text-[var(--ag-text-on-paper)] border border-black/20 rounded-[4px]`) + header snippet + body snippet
2. `PaperHeader.svelte`: `bg-black text-white px-3 py-1.5 flex items-center justify-between`、右端に DiamondMarker (PH-488) slot
3. `PaperRow.svelte`: `flex items-center justify-between border-b border-black/10 py-2 px-3`
4. dot-fade 装飾: PaperPanel 右上に absolute pseudo `<div class="endfield-dot-fade absolute top-0 right-0 w-12 h-12">`
5. unit test で render snapshot + a11y

## 規約参照

- `industrial-yellow-spec.md` UI 要素別 (白パネル) + 禁忌 §4 (完全角丸 NG)
- CLAUDE.md `src/lib/components/ui/` 手動編集禁止 → industrial 配下に新規

## 参考

- WidgetShell.svelte (パネル構造の参考)
- shadcn Card (構造比較)
