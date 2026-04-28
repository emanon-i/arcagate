-- PH-issue-024 Opener registry: user-defined openers (Explorer / VSCode / Terminal / etc).
--
-- builtin openers (Explorer, VSCode, Windows Terminal, PowerShell, Cmd) は
-- compiled-in (`opener_service::BUILTIN_OPENERS`) で DB には保存しない。
-- 本 table は user 追加 custom opener のみ。
--
-- id 例: "user:cursor" / "user:vim" など、user-prefix で衝突回避。
-- command_template 内の `<path>` placeholder が起動時に target に置換される。
CREATE TABLE IF NOT EXISTS openers (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    command_template  TEXT NOT NULL,
    icon_path         TEXT,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_openers_sort ON openers(sort_order, name);
