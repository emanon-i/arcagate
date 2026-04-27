---
id: PH-20260429-504
title: Per-item settings persistence — widget_item_settings table (案 C、論理削除なし)
status: todo
batch: 109
era: per-widget-polish
parent_l1: REQ-006_workspace-widgets
scope_files:
  - src-tauri/migrations/ (new migration)
  - src-tauri/src/models/widget_item_settings.rs (new)
  - src-tauri/src/repositories/widget_item_settings_repository.rs (new)
  - src-tauri/src/services/widget_item_settings_service.rs (new)
  - src-tauri/src/commands/widget_item_settings_commands.rs (new)
  - src/lib/types/widget-item-settings.ts (new)
  - src/lib/state/widget-item-settings.svelte.ts (new)
  - src/lib/widgets/exe-folder/ExeFolderWatchWidget.svelte (settings lookup + merge)
  - src/lib/widgets/exe-folder/ExeFolderSettings.svelte (orphan cleanup ボタン)
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

- [ ] migration 1 本追加 (既存 schema に append)
- [ ] Rust service: `get_settings(widget_id, item_key)` / `upsert_settings(widget_id, item_key, fields)` / `delete_settings(widget_id, item_key?)` / `prune_orphans(widget_id, expiry_days)`
- [ ] Rust commands: 上記 service の wrapper IPC
- [ ] TS types/store: `widgetItemSettingsStore`
- [ ] **WatchFolder で entries 取得時に settings を lookup して merge** (entry display に opener/custom_label/custom_icon 反映)
- [ ] **Unset / re-set シナリオで settings が persist** することを E2E で assert (path A → path B → path A 戻し → 旧 settings 復活)
- [ ] **「過去設定をクリア」UI ボタン** (widget settings dialog 内、watch_path で active な widget で見える)
- [ ] **論理削除なし** (`deleted_at` flag 不採用、user 直感通り)
- [ ] **last_seen_at update**: entries scan のたびに見えた item は last_seen_at 更新 (orphan 判定用)
- [ ] **opener / custom_label / custom_icon は本 plan では DB scheme のみ用意**、UI 編集は **PH-505 (opener registry)** で繋がる
- [ ] before/after スクショ取得 (re-set で settings 復活 demo)

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
