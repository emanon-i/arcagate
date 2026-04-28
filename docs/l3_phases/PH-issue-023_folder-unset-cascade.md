---
id: PH-issue-023
title: フォルダ監視 unset で Library item 削除 + per-item settings 永続 (案 C)
status: planning
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-504 (per-item settings、rollback で revert、migration 019 orphan column 残存)
---

# Issue 23: フォルダ監視 unset cascade + per-item settings 永続

## 元 user fb (検収項目 #28)

> フォルダ監視を unset したら Library からも該当アイテム消すべき、ただし各アイテムの個別設定は残しておいて欲しい (再設定で復活)

## 引用元 doc

- `engineering-principles §3` データ整合性 / `§6 Operations` 復元シナリオ
- `desktop_ui_ux P2` 失敗前提

## Fact

旧 PH-504 で `widget_item_settings` table 設計済 (rollback で migration 019 が orphan column として残存)。

案 C: entries は揮発、settings は別 table 永続 (論理削除なし)。

## UX

- WatchFolder unset → Library から該当 items 自動削除
- per-item settings (opener / custom_label / favorite) は別 table に残る
- 再 set で同 path / item_key の settings が **resurrect**
- 「過去設定をクリア」ボタン (Settings 内で手動 prune、または 30 日 expiry auto)

## 横展開

PH-issue-006 (Widget collection cascade) の `cmd_count_item_references` / `cmd_delete_item` cascade と統合可能。

## Plan A: 「migration orphan 再活用 + 案 C 完全実装」

- migration 019 の orphan column を model + repository に reflect (新 migration 不要)
- `widget_item_settings_service` 再追加
- IPC: get / list / patch / touch_seen / delete / prune_orphans
- WatchFolder unset で Library items 削除 + last_seen_at 古い settings は 30 日 expiry で auto prune (option)
- WatchFolder Settings dialog に「過去設定をクリア」button

## 棄却 B (論理削除 deleted_at flag): user 「論理削除は辞めたほうがいい」明示棄却

## E2E

unset → Library items 消滅 → settings DB に残存 → 再 set で同 path items 復活、settings 引き継ぐ (opener 等)

## 規格 update

`ux_standards §6-1` に「Watch 系 widget は entries 揮発 / settings 永続 (案 C)」明記
