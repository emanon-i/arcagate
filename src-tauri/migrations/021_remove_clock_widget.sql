-- 5/01 user 判断: ClockWidget 廃止 (4 回の fix で user 体感が改善せず、scope 外へ)。
-- 既存 DB 上の widget_type='clock' instance を削除して enum 不整合を防ぐ。
-- 関連する config / position 情報も同時に消滅 (cascade なし、widget 単独 row のため安全)。
DELETE FROM workspace_widgets WHERE widget_type = 'clock';
