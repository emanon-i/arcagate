---
id: PH-20260427-476
title: Window 半透明 (Mica/Acrylic) + Workspace 背景壁紙 [MVP: 半透明のみ]
status: done
batch: 107
era: polish
parent_l1: REQ-007_visual-language
scope_files:
  - src-tauri/tauri.conf.json
  - src-tauri/src/lib.rs (window effects)
  - src-tauri/src/models/workspace.rs (background_image_path field)
  - src-tauri/migrations/*.sql (new column)
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
  - src/lib/components/arcagate/library/LibraryMainArea.svelte
  - src/lib/components/settings/AppearanceSettings.svelte
---

# PH-476: Window 半透明 (Mica/Acrylic) + Workspace 背景壁紙

## 背景

ユーザー dev fb (2026-04-27):

> ウィジットの背景壁紙設定したいな。これはライブラリ画面と共通でもいいけど＋Workspaceごとに背景変えれたらいいな。
> あとウィンドウ自体を半透明にできないの？すりガラスが浮いてるみたいな視認性を確保しつつ、おしゃれ感を出したい。

現状:

- `tauri.conf.json` main window: `decorations: false`、transparent **未設定**
- Workspace / Library とも単色 `bg-[var(--ag-surface-opaque)]` で背景固定
- `workspaces` テーブルに background カラムなし

## 受け入れ条件

### 機能 (MVP scope: 半透明のみ、背景画像は後続 plan)

- [x] **Mica/Acrylic 適用**: `window-vibrancy = "0.6"` crate を Windows のみ `target.'cfg(target_os = "windows")'.dependencies` に追加。`lib.rs` setup で `apply_mica` (Win11) → fallback `apply_acrylic(18,18,18,125)` (Win10)
- [x] **`transparent: true`**: tauri.conf.json main window に追加
- [x] **body 背景半透明**: `app.css` で `color-mix(in srgb, var(--ag-surface-page) 88%, transparent)` → Mica が淡く透ける
- [x] **Reduced transparency 対応**: `@media (prefers-reduced-transparency: reduce)` で不透明 fallback (a11y)

### MVP 外 (PH-481 以降で対応予定)

- [ ] Workspace 背景画像 (per-workspace): migration + IPC + UI (scope 大、batch-108 候補)
- [ ] Library グローバル背景: app_config 拡張 + UI (上同様)
- [ ] AppearanceSettings に背景画像 section

### 横展開チェック

- [x] palette window: 既に transparent: true、Mica は palette には適用しない (frosted glass 既存スタイル維持)
- [x] Settings panel: dialog 背景は `--ag-surface-opaque` を使っており影響なし

### SFDIPOT

- **F**unction: 背景画像設定 → 即時反映 (再起動不要)
- **D**ata: workspaces.background_image_path schema migration
- **I**nterface: file picker dialog 経由、asset:// protocol で表示
- **P**latform: Win11 mica / Win10 acrylic / OS reduced transparency
- **O**perations: 設定 → 削除 → 別 workspace 切替で背景切替

### HICCUPPS

- [Image] Windows 11 Settings / Notion / Obsidian の vibrancy 慣習
- [User]「すりガラスが浮いてるみたいな視認性を確保しつつ、おしゃれ感」の翻訳
- [Statutes] OS reduced motion / reduced transparency 設定の尊重 (a11y)

## 実装ステップ

1. `Cargo.toml` に `window-vibrancy` crate 追加 (~5KB)
2. `lib.rs` setup で `apply_mica` / `apply_acrylic` を main window に適用 (Win 版分岐 try-fallback)
3. `tauri.conf.json` main window に `transparent: true`、CSS の `body` 背景を `--ag-surface-translucent` (新 token) に変更
4. migration: `ALTER TABLE workspaces ADD COLUMN background_image_path TEXT NULL`、`ALTER TABLE app_config ADD COLUMN library_background_image_path TEXT NULL`
5. Rust IPC: `cmd_set_workspace_background(id, path)` / `cmd_set_library_background(path)` / clear 系
6. Frontend: WorkspaceLayout / LibraryMainArea で background-image 適用、半透明 overlay
7. AppearanceSettings.svelte に背景画像 section 追加 (per-workspace + global)
8. Reduced transparency fallback: 不透明 surface に切替 (CSS media query `prefers-reduced-transparency`)
9. E2E: 背景画像設定 → 表示 → 削除 → 単色復帰 (画像 fixture 用意)

## 規約参照

- vision.md (visual language section)
- ux_standards.md (a11y reduced motion / transparency)
- engineering-principles §5 依存予算 (window-vibrancy ~5KB OK)

## 参考

- tauri.conf.json
- arcagate-visual-language.md (Endfield 等高線等の参照)
