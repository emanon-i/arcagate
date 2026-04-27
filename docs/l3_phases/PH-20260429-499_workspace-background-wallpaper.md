---
id: PH-20260429-499
title: Workspace per-workspace 背景壁紙 + Library 共通設定
status: done
batch: 109
era: per-widget-polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src-tauri/migrations/018_workspace_wallpaper.sql (new)
  - src-tauri/src/db/migrations.rs
  - src-tauri/src/models/workspace.rs (wallpaper fields + WallpaperSettings struct)
  - src-tauri/src/repositories/workspace_repository.rs (update_workspace_wallpaper)
  - src-tauri/src/services/wallpaper_service.rs (new - file copy + safe delete)
  - src-tauri/src/services/workspace_service.rs (set_workspace_wallpaper)
  - src-tauri/src/services/mod.rs
  - src-tauri/src/commands/wallpaper_commands.rs (new - 5 IPC commands)
  - src-tauri/src/commands/mod.rs
  - src-tauri/src/lib.rs (handler 登録)
  - src/lib/types/workspace.ts (Workspace + WallpaperSettings 拡張)
  - src/lib/ipc/workspace.ts (5 wallpaper IPC wrappers)
  - src/lib/state/workspace.svelte.ts (libraryWallpaper + 6 helpers)
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte (壁紙 layer)
  - src/lib/components/settings/WallpaperSettings.svelte (new)
  - src/lib/components/settings/SettingsPanel.svelte (Appearance タブで mount)
  - tests/e2e/workspace-wallpaper.spec.ts (new - IPC round-trip)
  - tests/helpers/ipc.ts (Workspace 型に wallpaper fields)
---

# PH-499: Workspace per-workspace 背景壁紙 + Library 共通設定

## 背景

ユーザー dev fb (2026-04-27、検収項目 #9):

> ウィジットの背景壁紙設定したいな。これはライブラリ画面と共通でもいいけど＋Workspaceごとに背景変えれたらいいな。

batch-107 PH-476 は MVP として **Mica 半透明のみ実装**、壁紙個別設定は未着手。本 plan で完成。

## 受け入れ条件

- [x] **Library 画面 default 背景画像**: Settings > 外観 で global 設定 (1 画像 + opacity + blur slider) — `WallpaperSettings.svelte`
- [x] **Workspace 別の上書き設定**: 同 Settings 画面で active workspace の override (UI は 1 ヶ所統合、Workspace 設定 dialog 別途は不要との判断)
- [x] **未設定の Workspace は global default を継承** (`WorkspaceLayout` の `activeWallpaper` $derived でカスケード)
- [x] **画像選択 UI**: `@tauri-apps/plugin-dialog` で `*.png|*.jpg|*.jpeg|*.webp` filter、選択後にサムネイル表示
- [x] **画像保存先**: `<app_data_dir>/wallpapers/<uuid v7>.<ext>` (DB には絶対 path のみ、`save_wallpaper` で copy)
- [x] **CSS 適用**: scroll しない overlay layer (`absolute inset-0 z-0`) で `background-image` + opacity + blur
- [x] **半透明 (Mica) との重ね順整合**: 壁紙 layer は Mica 背景の上、widget は z-10 で壁紙の上
- [x] **画像削除 / リセット**: 「背景なしに戻す」 / 「Library default に戻す」 button
- [x] **Reduced Motion**: `motion-reduce:!filter-none` で blur 無効化
- [x] **E2E**: `tests/e2e/workspace-wallpaper.spec.ts` で IPC round-trip 検証 (Library default / Workspace override / clear / 戻し)
- [ ] before/after スクショ取得 (CDP 自己検証は次回 main 反映後)

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
