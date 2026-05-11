-- Phase 1 (2026-05-12 user 承認): path-key snapshot 機構を完全廃止。
--
-- 旧 PH-issue-023 Phase B (migration 019) で導入された widget_item_settings table:
--   key = item.target (path)、 value = {label, is_enabled, default_app} の JSON
--   write 経路: watched_path_service::remove_watched_path
--   read 経路: item_service::auto_register_folder_items
--
-- 廃止理由 (user フィードバック + 実コード trace):
--   1. widget 種別差: Projects (folder watch) のみ snapshot 経路、 他 widget は無関係 = 一貫性なし
--   2. 「勝手な復活」: widget 削除 → 同 path 新 widget 作成 chain で旧設定が予期せず復活
--      → user 意図 override 体験、 trust 破壊
--   3. per-widget hide が path-key global で実現できない (新 widget で前 widget の hide 状態継承)
--
-- 代替手段: Phase 2 で widget_item_hides (per-widget スコープ) を新規導入。
-- 詳細: E:/tmp/arcagate-delete-restore-ux.md rev 3 §1, §4

DROP INDEX IF EXISTS idx_widget_item_settings_seen;
DROP TABLE IF EXISTS widget_item_settings;
