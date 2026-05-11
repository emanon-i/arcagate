-- U-3 (2026-05-12 user 検収): Workspace 名 system tag (sys-ws-*) を新規実装。
-- screens-and-flows.md Library § 仕様
--   「タグには URL、 EXE やフォルダなど形式によるタグと workspace 名のタグの
--    システムタグをつける」
-- + Workspace § 仕様
--   「ウィジェットで workspace で追加されたアイテムは workspace 名のタグを
--    システムタグとしてつける」
--
-- 旧 G-7 (#410) で sys-ws-* は機能ごと撤去されたが、 新 spec で再導入。
-- v2 として別 design で実装 (旧 revert ではなく上書き)。
--
-- 変更点:
--   1. tags.name の UNIQUE 制約を drop (異なる workspace が同 name を許容するため)
--      → 既存 sys-* / user タグの name 重複は workspace 重複でも不発生 (sys-* は id で識別、
--         user タグは UI で重複拒否済)
--   2. 既存全 workspace について sys-ws-<id> tag を INSERT (idempotent)

-- Step 1: tags テーブルを UNIQUE 制約なしで再構築
CREATE TABLE tags_new (
    id          TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL,
    is_hidden   INTEGER NOT NULL DEFAULT 0,
    is_system   INTEGER NOT NULL DEFAULT 0,
    prefix      TEXT,
    icon        TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- 既存 data を copy (列順は 008_category_to_tag + その後の migration を経た現在の schema に整合)。
INSERT INTO tags_new (id, name, is_hidden, is_system, prefix, icon, sort_order, created_at)
SELECT id, name, is_hidden, is_system, prefix, icon, sort_order, created_at FROM tags;

DROP TABLE tags;
ALTER TABLE tags_new RENAME TO tags;

-- Step 2: 既存 workspace について sys-ws-<id> tag を INSERT。
INSERT OR IGNORE INTO tags (id, name, is_hidden, is_system, prefix, icon, sort_order, created_at)
SELECT
    'sys-ws-' || id,
    name,
    0,
    1,
    NULL,
    NULL,
    70,
    strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
FROM workspaces;
