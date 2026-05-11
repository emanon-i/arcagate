-- Phase 2 (2026-05-12 user 承認): per-widget hide 機構の新設。
--
-- spec: docs/l0_ideas/screens-and-flows.md + delete/restore UX rev 3 §3
--   widget 単位で 「この widget からだけ外したい」 を実現する。
--   Library 一覧の global hide (F-1 `items.is_enabled=false`) とは別範囲。
--
-- key 設計:
--   widget_id: 該当 widget の id (workspace_widgets FK)、 widget 削除で CASCADE 自動消去
--   item_target: item.target (path / URL)、 user タグや UUID 変化に依らず安定
--
-- 重要: path-key global (widget_item_settings の旧設計) ではなく、
-- 必ず widget_id とのペアで識別する (= 別 widget で同 path 監視時に hide は独立)。
-- widget 削除で snapshot 全消去 = 新 widget = fresh state を保証 (= シナリオ 2 解消)。

CREATE TABLE widget_item_hides (
    widget_id   TEXT NOT NULL REFERENCES workspace_widgets(id) ON DELETE CASCADE,
    item_target TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    PRIMARY KEY (widget_id, item_target)
);

CREATE INDEX idx_widget_item_hides_widget ON widget_item_hides(widget_id);
