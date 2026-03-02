CREATE TABLE IF NOT EXISTS watched_paths (
    id         TEXT PRIMARY KEY,
    path       TEXT NOT NULL UNIQUE,
    label      TEXT,
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
