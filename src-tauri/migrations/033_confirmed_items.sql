-- audit F15 (2026-05-18): Command / Script アイテムの初回起動確認の永続化。
--
-- security model:
--   Command / Script タイプのアイテムは任意のコマンド / スクリプトを実行する。
--   未確認のまま起動された場合、 backend (launch_service) は起動を中断し
--   `launch.confirmation_required` を返す。 frontend が確認ダイアログを表示し、
--   ユーザーが承認すると本テーブルに item_id を記録する。 2 回目以降は確認なしで
--   起動する (daily-use の摩擦を避ける)。
--
--   CLI / MCP 起動 (source = "cli" / "mcp") は明示的な非対話操作のため gate 対象外。
--
-- forward-only migration: item 削除で確認状態も CASCADE 消去 (item に従属する状態)。

CREATE TABLE confirmed_items (
    item_id      TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
    confirmed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
