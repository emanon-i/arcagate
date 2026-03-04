CREATE TABLE IF NOT EXISTS mcp_permissions (
    id         TEXT PRIMARY KEY,
    tool_name  TEXT NOT NULL UNIQUE,
    is_allowed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- デフォルト: read のみ許可 (list/search=1, launch/create=0)
INSERT OR IGNORE INTO mcp_permissions (id, tool_name, is_allowed) VALUES
    ('01900000-0000-7001-8000-000000000001', 'arcagate_list',   1),
    ('01900000-0000-7001-8000-000000000002', 'arcagate_search', 1),
    ('01900000-0000-7001-8000-000000000003', 'arcagate_launch', 0),
    ('01900000-0000-7001-8000-000000000004', 'arcagate_create', 0);
