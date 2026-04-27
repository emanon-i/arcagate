---
id: PH-20260429-497
title: Industrial Yellow Token 定義 + Tailwind config 拡張
status: todo
batch: 109
era: design-overhaul
parent_l1: REQ-007_visual-language
scope_files:
  - src/lib/styles/arcagate-theme.css
  - src/app.css
  - src/lib/styles/industrial-yellow.css (new)
---

# PH-486: Industrial Yellow Token 定義

## 背景

仕様: `docs/l1_requirements/design/industrial-yellow-spec.md` カラー設計セクション。

主役は **蛍光イエロー (#ffe600)** + 黒地 + 白パネル + ごく少量の cyan/magenta + オレンジマーカー。
既存 `--ag-*` token と**共存** (Light/Dark テーマと並列で Industrial Yellow テーマを追加)。

## 受け入れ条件

### 機能

- [ ] **新 token 定義**: `--ag-primary` `--ag-primary-deep` `--ag-bg` `--ag-bg-2` `--ag-panel-dark` `--ag-panel-2a/2b` `--ag-panel-white` `--ag-paper` `--ag-paper-2` `--ag-text-on-paper` `--ag-text-on-dark` `--ag-mute-1/2` `--ag-accent-cyan` `--ag-accent-magenta` `--ag-accent-orange` を `arcagate-theme.css` に追加
- [ ] **Industrial Yellow theme block**: `[data-theme="theme-industrial-yellow"]` で全 token を Industrial Yellow 値に override する block を新規 CSS file (`src/lib/styles/industrial-yellow.css`) に分離、`app.css` で import
- [ ] **既存 token は維持**: Light/Dark テーマでの `--ag-surface-*` `--ag-text-*` `--ag-border-*` 等は不変
- [ ] **Tailwind v4 export**: `@theme inline` に必要な color token を export (`bg-[var(--ag-primary)]` 等で使えるように)
- [ ] **builtin theme 登録**: Rust 側 `theme_service.rs` か initial seed で `theme-industrial-yellow` を builtin として追加 (DB INSERT OR IGNORE)

### 横展開チェック

- [ ] 既存 `--ag-accent` を使ってる箇所 (PH-472 selection ring 等) で Industrial Yellow theme 時に蛍光黄が反映される
- [ ] `--text-ag-{xs..2xl}` (PH-475) は theme 共通、Industrial Yellow でも維持
- [ ] dark mode の `prefers-color-scheme` 自動切替と Industrial Yellow theme は **独立** (Industrial Yellow は明示選択のみ)

### SFDIPOT

- **F**unction: Settings でテーマ選択 → 即時反映 (CSS var で全 UI 切替)
- **D**ata: theme-industrial-yellow の `css_vars` JSON を Rust DB に seed
- **I**nterface: 既存 themeStore.setActiveMode(id) でテーマ切替
- **P**latform: WebView2 で `[data-theme=""]` selector + CSS var 描画 OK
- **T**ime: theme 切替は instant (CSS var update のみ)

### HICCUPPS

- [Image] Arknights:Endfield の工業端末 UI を直訳
- [User]「青シアン発光端末」ではなく「Industrial Yellow の技術資料 UI」の方向転換
- [Consistency] 既存 builtin themes (Endfield-builtin、Liquid Glass、Ubuntu Frosted) と並列の builtin theme 構造維持

## 実装ステップ

1. `src/lib/styles/industrial-yellow.css` 新規作成、`[data-theme="theme-industrial-yellow"]` block で 16 token を定義
2. `app.css` で `@import` 追加
3. `arcagate-theme.css` の :root に Industrial Yellow 用追加 token (`--ag-primary` `--ag-paper` 等) を default 値で定義 (Light theme でも参照可能に)
4. Rust `theme_service` で builtin theme `theme-industrial-yellow` を seed (`INSERT OR IGNORE`)
5. ts-rs bindings 更新 (themes 一覧に表示される)
6. Settings の Theme list にサムネイル + ラベル追加 (PH-487 以降の utility 完成後に)

## 規約参照

- `docs/l1_requirements/design/industrial-yellow-spec.md` (full spec)
- `docs/l1_requirements/design_system_architecture.md` (token 階層)
- engineering-principles §5 依存予算 (新規 dep なし、CSS のみ)

## 参考

- Existing builtin themes: `src/lib/styles/arcagate-theme.css` `[data-theme="theme-builtin-endfield"]` 等
- DB seed: `src-tauri/migrations/<latest>.sql` で initial themes
