---
id: PH-20260429-499
title: Workspace per-workspace 背景壁紙 + Library 共通設定
status: todo
batch: 109
era: per-widget-polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src-tauri/migrations/ (new migration)
  - src-tauri/src/models/workspace.rs
  - src-tauri/src/repositories/workspace_repository.rs
  - src-tauri/src/commands/workspace_commands.rs
  - src/lib/types/workspace.ts
  - src/lib/state/workspace.svelte.ts
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
  - src/lib/components/settings/AppearanceSettings.svelte (new section: 背景画像)
---

# PH-499: Workspace per-workspace 背景壁紙 + Library 共通設定

## 背景

ユーザー dev fb (2026-04-27、検収項目 #9):

> ウィジットの背景壁紙設定したいな。これはライブラリ画面と共通でもいいけど＋Workspaceごとに背景変えれたらいいな。

batch-107 PH-476 は MVP として **Mica 半透明のみ実装**、壁紙個別設定は未着手。本 plan で完成。

## 受け入れ条件

- [ ] **Library 画面 default 背景画像**: Settings > 外観 で global 設定 (1 画像 + opacity + blur slider)
- [ ] **Workspace 別の上書き設定**: 各 Workspace に背景画像を設定可能 (Workspace 設定 dialog で choose、または編集モード右クリック menu)
- [ ] **未設定の Workspace は global default を継承** (cascade)
- [ ] **画像選択 UI**: Tauri file dialog で画像選択 (`*.png|*.jpg|*.jpeg|*.webp`)、サムネイルプレビュー
- [ ] **画像保存先**: `%LOCALAPPDATA%/Arcagate/wallpapers/<uuid>.<ext>` (DB には path string のみ)
- [ ] **CSS 適用**: AppShell or Workspace コンテナの `::before` pseudo-element で `background-image` + opacity + blur フィルタ
- [ ] **半透明 (Mica) との重ね順整合**: Mica 背景の上に画像、画像 opacity で混色
- [ ] **画像削除 / リセット**: 「壁紙なし」に戻すボタン
- [ ] **Reduced Motion**: blur アニメは Reduced Motion 時は無効
- [ ] **E2E**: workspace 作成 → 壁紙設定 → 切替 → 壁紙適用 assert
- [ ] before/after スクショ取得 (gallery)

## DB スキーマ

```sql
-- migration: workspace に wallpaper field 追加
ALTER TABLE workspaces ADD COLUMN wallpaper_path TEXT;
ALTER TABLE workspaces ADD COLUMN wallpaper_opacity REAL NOT NULL DEFAULT 1.0;
ALTER TABLE workspaces ADD COLUMN wallpaper_blur INTEGER NOT NULL DEFAULT 0; -- 0..40px

-- global default は config table or settings JSON
INSERT OR IGNORE INTO config (key, value) VALUES
  ('library_wallpaper_path', NULL),
  ('library_wallpaper_opacity', '0.7'),
  ('library_wallpaper_blur', '12');
```

## 実装ステップ

1. migration 追加 (workspaces table 拡張 + config defaults)
2. Rust workspace model に field 追加 + repository 更新
3. Rust commands: `cmd_set_workspace_wallpaper(workspace_id, path, opacity, blur)` / `cmd_clear_workspace_wallpaper(workspace_id)` / `cmd_set_library_wallpaper(...)`
4. ファイル保存 service: `wallpaper_service::save_wallpaper(src_path) -> stored_path` (LocalAppData にコピー、UUID 命名)
5. TS types/store 更新 (workspace store に wallpaper field)
6. WorkspaceLayout に background `::before` レイヤー追加
7. AppearanceSettings に「背景画像 (Library default)」section
8. WorkspaceSettingsDialog に「壁紙」section (global default 継承表示 + override)
9. E2E spec 追加
10. before/after スクショ取得

## 規約参照

- ux_standards.md (Reduced Motion, Mica 重ね順)
- engineering-principles §6 SFDIPOT (Data: 画像 path/opacity/blur range, Operations: 画像なし default behavior)
- desktop_ui_ux_agent_rules.md (file dialog UX)
