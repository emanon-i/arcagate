---
id: PH-20260429-504
title: 既存全 widget / panel に Industrial Yellow 適用 (横展開)
status: todo
batch: 109
era: design-overhaul
parent_l1: REQ-007_visual-language
scope_files:
  - src/lib/widgets/**/*.svelte
  - src/lib/components/arcagate/**/*.svelte
  - src/lib/components/arcagate/common/WidgetShell.svelte
---

# PH-493: 既存全 widget / panel に Industrial Yellow 適用 (横展開)

## 背景

仕様: `industrial-yellow-spec.md` UI 要素別 + 全画面・横展開。

PH-486〜492 で token / utility / 新 component / theme 切替 / home redesign を実装。
本 plan で **既存全 widget / panel を Industrial Yellow theme でも違和感なく動く**ように
最終調整。具体:

- WidgetShell (PH-475 で text-ag-md 化済) を Industrial Yellow theme 時に paper panel 化 (背景 paper、上端黒帯、右上 dot-fade 装飾)
- LibraryItemPicker (PH-474) を Industrial Yellow 時に paper panel + 黄ライン選択
- WidgetHandles (PH-472) を Industrial Yellow 時に L-bracket + ピル削除 button
- HelpPanel (PH-477) を paper panel + 黄ライン
- Settings 系 dialog を paper panel
- 全 widget の選択 / hover / focus state を Industrial Yellow 系色 (黄 + オレンジ) に

**theme-conditional**: 既存 Light/Dark/Endfield-builtin/Liquid Glass/Ubuntu Frosted では現状維持、
Industrial Yellow theme 時のみ Industrial 専用 style 適用。CSS の `[data-theme="theme-industrial-yellow"]`
selector で override する形が基本。

## 受け入れ条件

### 機能 (theme: theme-industrial-yellow 時のみ適用)

- [ ] **WidgetShell**: 背景 `--ag-paper`、上端 8px 黒帯、右上に PH-487 dot-fade 装飾
- [ ] **WidgetHandles** (PH-472): selection ring → L-bracket (PH-488 LBracket)、× button → industrial pill (PH-488 PillButton 縮小版)
- [ ] **LibraryItemPicker** (PH-474): paper panel + sort/filter は黄 hairline で区切り、選択 checkbox overlay は黄菱形
- [ ] **HelpPanel** (PH-477): paper panel + ショートカット表は黒/白 monospace + 黄ハイライト
- [ ] **Settings dialog**: paper panel + 各 section header に黒帯 + DiamondMarker
- [ ] **toast (toastStore)**: success/error/info に対応する Industrial Yellow 色 (success: 黄、error: 赤菱形、info: 白 paper)
- [ ] **font tokens (PH-475)**: theme-agnostic、Industrial Yellow でも同 token 使用

### 横展開チェック

- [ ] **batch-107 機能との同居 (memory `project_arcagate_design_direction.md` 参照)**:
  - PH-472 ハンドル → L-bracket 化 ✅
  - PH-473 grid/canvas/crop → button のみ Industrial 系 (canvas 自体は theme 影響少)
  - PH-474 item picker → paper panel ✅
  - PH-475 font tokens → 共通維持 ✅
  - PH-476 mica/acrylic → Industrial Yellow 時は **無効化** (PH-490 と整合)
  - PH-477 undo/redo → HelpPanel ショートカット表示は paper panel
  - PH-478 edit state → UI 表現のみ追従、内部 logic 不変
  - PH-479 reactivity → UI 即時反映は theme 不変、Industrial Yellow でも同等動作
- [ ] 既存 5 builtin theme の動作 regression なし (theme switch back & forth で確認)
- [ ] custom theme (user 作成) でも Industrial Yellow CSS が干渉しない

### SFDIPOT

- **F**unction: theme 切替 → 全 widget が即時 Industrial Yellow style
- **D**ata: CSS のみ (各 component に code 変更なし、CSS override で完結)
- **I**nterface: `[data-theme="theme-industrial-yellow"] .widget-shell { ... }` パターンで component 触らず
- **P**latform: WebView2 で multi-selector 描画 OK
- **O**perations: theme 切替 → 全 widget 即時切替、操作中 (drag/resize) でも安全
- **T**ime: theme 切替で UI 即時切替 < 100ms

### HICCUPPS

- [Image] 仕様 全画面・横展開を全 widget で適用
- [User] 既存テーマも残しつつ、Industrial Yellow を選んだら一貫した工業端末 UI
- [Consistency] CLAUDE.md「同じ機能には同じアイコン+ラベル」: theme 違うだけで機能ラベル不変

## 実装ステップ

1. `src/lib/styles/industrial-yellow.css` に全 component の override CSS を追記
2. WidgetShell: `[data-theme="theme-industrial-yellow"] [data-component="widget-shell"] { ... }` で paper 化
3. WidgetHandles: 同上で L-bracket + pill 化 (新 svelte file は触らず CSS で外観差替)
4. LibraryItemPicker / HelpPanel / Settings dialog: 同様
5. toast: theme-aware color
6. theme switch test: 5 既存 + Industrial Yellow を順に切替、全 widget が安定動作することを E2E で確認
7. visual regression test (Playwright screenshot) は scope 外、後 plan で

## 規約参照

- `industrial-yellow-spec.md` 全画面・横展開
- memory `project_arcagate_design_direction.md` (batch-107 との同居)
- CLAUDE.md `src/lib/components/ui/` 手動編集禁止 → CSS override で対応
- 1 つの不整合を見つけたら横展開 (本 plan で全画面 audit 必須)

## 参考

- arcagate-theme.css の Endfield-builtin / Liquid Glass / Ubuntu Frosted の override パターン
- batch-107 PH-472〜479 全 component
