---
id: PH-20260429-504
title: Per-item settings persistence — widget_item_settings table (案 C、論理削除なし)
status: done
batch: 109
era: per-widget-polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src-tauri/migrations/019_widget_item_settings.sql (new)
  - src-tauri/src/db/migrations.rs
  - src-tauri/src/models/widget_item_settings.rs (new)
  - src-tauri/src/models/mod.rs
  - src-tauri/src/repositories/widget_item_settings_repository.rs (new、7 unit test)
  - src-tauri/src/repositories/mod.rs
  - src-tauri/src/services/widget_item_settings_service.rs (new、4 unit test)
  - src-tauri/src/services/mod.rs
  - src-tauri/src/commands/widget_item_settings_commands.rs (new、7 IPC commands)
  - src-tauri/src/commands/mod.rs
  - src-tauri/src/lib.rs (handler 登録)
  - src/lib/types/widget-item-settings.ts (new)
  - src/lib/ipc/widget-item-settings.ts (new、7 IPC wrappers)
  - src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte (settings lookup + merge + last_seen_at touch)
  - src/lib/widgets/exe-folder/ExeFolderSettings.svelte (「過去設定をクリア」 button + min-w-0 audit fix)
  - src/lib/components/arcagate/workspace/WidgetSettingsDialog.svelte (widgetId prop pass-through)
  - tests/e2e/widget-item-settings.spec.ts (new)
---

# PH-504: Per-item settings persistence

## 背景

ユーザー dev fb (2026-04-28、検収項目 #33):

> フォルダ監視のアンセットでライブラリからもアイテムは消すべきだけど、各アイテムの設定は残しておいて欲しい。
> 間違って消したり戻したくなったら過去の設定が残っててよみがえる。論理削除は辞めたほうがいいかな？

採用：**案 C = entries は揮発、per-item settings は別テーブルで永続 (論理削除なし)** (memory 29)

## 設計

- **Entries**: filesystem からの derived state、in-memory or 一時 cache。unset で消える、再 set で再構築
- **Per-item settings**: 別永続テーブル `widget_item_settings`、`(widget_id, item_key) → { opener, custom_label, custom_icon, favorite, last_seen_at, ... }`
  - `item_key` は relative path or hash で stable id
  - Unset しても settings は残る
  - 再 set で同じ files 出現時、`item_key` lookup で resurrect 自動
- **Orphan cleanup**: 「過去設定をクリア」UI ボタン (手動) + 任意で 30 日 expire (auto prune オプション)

## DB スキーマ

```sql
CREATE TABLE IF NOT EXISTS widget_item_settings (
  widget_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  opener TEXT,
  custom_label TEXT,
  custom_icon TEXT,
  favorite INTEGER NOT NULL DEFAULT 0,
  last_seen_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (widget_id, item_key)
);
CREATE INDEX IF NOT EXISTS idx_widget_item_settings_widget ON widget_item_settings(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_item_settings_last_seen ON widget_item_settings(last_seen_at);
```

## 受け入れ条件

- [x] migration 019 追加 (既存 schema に append)
- [x] Rust service: get_settings / upsert_settings (partial update) / delete_settings / delete_all_for_widget / prune_orphans / touch_last_seen
- [x] Rust commands: 7 IPC (get / list / upsert / delete / clear / prune / touch)
- [x] TS types + IPC wrappers (`src/lib/types/widget-item-settings.ts` + `src/lib/ipc/widget-item-settings.ts`)
- [x] **WatchFolder で entries 取得時に settings を lookup して merge** (`displayLabel(entry)` で custom_label を表示に反映)
- [x] **Unset / re-set シナリオで settings が persist** — E2E `widget-item-settings.spec.ts` で widget config を空にしても settings が残ることを assert
- [x] **「過去設定をクリア」UI ボタン** (ExeFolderSettings に `Eraser` icon ボタン、`cmd_clear_widget_item_settings` 呼び出し)
- [x] **論理削除なし** (`deleted_at` flag 不採用、削除は物理 DELETE)
- [x] **last_seen_at update**: scan 直後に visible item key を bulk `touch_last_seen` (transaction で N item を 1 lock)
- [x] **opener / custom_label / custom_icon は DB scheme のみ用意** (custom_label のみ最小 UI 適用、opener は PH-505 で接続)
- [ ] before/after スクショ取得 (CDP 自己検証は次回 main 反映後)

## 実装ステップ

1. migration `0027_widget_item_settings.sql` 追加
2. Rust model / repository / service / commands 実装 (TDD: integration test 先)
3. TS types / store 実装
4. WatchFolder widget で entries lookup + merge
5. Settings dialog に「過去設定をクリア」ボタン
6. E2E spec: unset / re-set サイクルで settings persist assert
7. before/after スクショ

## 規約参照

- engineering-principles §6 SFDIPOT (Data: PRIMARY KEY, Operations: orphan cleanup)
- engineering-principles §3 エラーハンドリング (DB lock retry)
- batch-108 PH-490b の延長
- memory 29 (案 C 採用記録)
